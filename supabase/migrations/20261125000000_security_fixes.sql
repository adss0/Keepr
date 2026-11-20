-- Security fixes.

-- 1. Role checks for people outside a space. space_role() is null for a non-member, and "null <> 'owner'" is null,
--    which an IF treats as false, so these functions let anyone outside a space create invites (as admin), change
--    roles and hand over ownership. coalesce() makes "not a member" fail the check like any other wrong role.

create or replace function public.create_space_invite(target uuid, invite_role text default 'member') returns text
language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  new_code text := '';
begin
  if coalesce(public.space_role(target), '') not in ('owner', 'admin') then
    raise exception 'Only owners and admins can invite people';
  end if;
  if invite_role not in ('admin', 'member') then
    raise exception 'Invalid role';
  end if;
  for i in 0..7 loop
    new_code := new_code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  insert into public.space_invites (code, space_id, role, created_by) values (new_code, target, invite_role, (select auth.uid()));
  return new_code;
end;
$$;

create or replace function public.set_space_role(target uuid, member uuid, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.space_role(target), '') <> 'owner' then
    raise exception 'Only the owner can change roles';
  end if;
  if new_role not in ('admin', 'member') then
    raise exception 'Choose admin or member';
  end if;
  if member = (select auth.uid()) then
    raise exception 'Hand the space to someone else to stop being its owner';
  end if;
  update public.space_members set role = new_role where space_id = target and user_id = member;
  if not found then
    raise exception 'That person isn''t in this space';
  end if;
end;
$$;

create or replace function public.transfer_space_ownership(target uuid, new_owner uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if coalesce(public.space_role(target), '') <> 'owner' then
    raise exception 'Only the owner can hand over the space';
  end if;
  if new_owner = me then
    return;
  end if;
  if not exists (select 1 from public.space_members m where m.space_id = target and m.user_id = new_owner) then
    raise exception 'That person isn''t in this space';
  end if;
  update public.space_members set role = 'admin' where space_id = target and user_id = me;
  update public.space_members set role = 'owner' where space_id = target and user_id = new_owner;
end;
$$;

-- 2. Whoever added an item stays its owner. Without this, someone who manages a space could move their own receipt
--    into it under another user's id and name that user's photo, which the shared-photo policy would then let them
--    read or replace. The app never changes user_id. Error 42501 is "permission denied", which the app already handles.

create function public.keep_item_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Who added an item can''t be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger receipts_keep_owner before update on public.receipts
  for each row execute function public.keep_item_owner();
create trigger subscriptions_keep_owner before update on public.subscriptions
  for each row execute function public.keep_item_owner();

-- 3. Photo names are file names the app makes ("<receipt id>.jpg" or "<receipt id>-<time>.jpg"), never paths.
--    Not checked against existing rows ("not valid"), which the app made itself.
alter table public.receipts
  add constraint receipts_photo_is_file_name check (photo ~ '^[A-Za-z0-9-]{1,80}\.[a-z]{3,4}$') not valid;

-- 4. Scans per account per day, so nobody can run up the Gemini bill, for example with endless guest sessions.
--    Only record_scan() touches the table; the extract-receipt function calls it before each scan.
create table public.scan_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  scans integer not null default 0,
  primary key (user_id, day)
);
alter table public.scan_usage enable row level security;
revoke all on public.scan_usage from authenticated, anon;

/** Counts a scan for the caller today and returns their total so far today. */
create function public.record_scan() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  total integer;
begin
  if me is null then
    raise exception 'Sign in to scan';
  end if;
  insert into public.scan_usage (user_id, day, scans) values (me, current_date, 1)
  on conflict (user_id, day) do update set scans = public.scan_usage.scans + 1
  returning scans into total;
  return total;
end;
$$;
revoke execute on function public.record_scan() from public, anon;
grant execute on function public.record_scan() to authenticated;
