-- Shared spaces: a family or an organisation shares receipts and subscriptions.
-- Items with a space_id are visible to every member of that space; items without one stay personal.
-- Spaces are created and joined through the functions at the bottom, so roles and invites can't be forged.

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  kind text not null default 'family' check (kind in ('family', 'organization')),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  display_name text not null default '' check (char_length(display_name) <= 60),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table public.space_invites (
  code text primary key,
  space_id uuid not null references public.spaces (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days'
);

create index space_members_user_id_idx on public.space_members (user_id);
create index space_invites_space_id_idx on public.space_invites (space_id);

alter table public.receipts add column space_id uuid references public.spaces (id) on delete set null;
alter table public.subscriptions add column space_id uuid references public.spaces (id) on delete set null;
create index receipts_space_id_idx on public.receipts (space_id);
create index subscriptions_space_id_idx on public.subscriptions (space_id);

-- Newest edit wins when several people change the same item, so keep updated_at current on every change.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger receipts_touch_updated_at before update on public.receipts
  for each row execute function public.touch_updated_at();
create trigger subscriptions_touch_updated_at before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- Helpers for the policies. Security definer so a policy on space_members can check space_members
-- without recursing into its own policy.
create function public.space_role(target uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.space_members m where m.space_id = target and m.user_id = (select auth.uid());
$$;

create function public.is_space_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.space_role(target) is not null;
$$;

-- Owners and admins manage a space. In a family space everyone can also delete shared items.
create function public.can_manage_space_items(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.space_role(target) in ('owner', 'admin')
    or (public.is_space_member(target) and exists (select 1 from public.spaces s where s.id = target and s.kind = 'family'));
$$;

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_invites enable row level security;

create policy "Members can see their spaces" on public.spaces
  for select to authenticated using (public.is_space_member(id));
create policy "Owners and admins can rename spaces" on public.spaces
  for update to authenticated using (public.space_role(id) in ('owner', 'admin'))
  with check (public.space_role(id) in ('owner', 'admin'));
create policy "Owners can delete spaces" on public.spaces
  for delete to authenticated using (public.space_role(id) = 'owner');

create policy "Members can see each other" on public.space_members
  for select to authenticated using (public.is_space_member(space_id));
-- Members can change only their own display name (column grant below), never their role.
create policy "Members can update their own name" on public.space_members
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Anyone but the owner can leave; owners and admins can remove members (but never the owner).
create policy "Members can leave, managers can remove" on public.space_members
  for delete to authenticated using (
    role <> 'owner'
    and (user_id = (select auth.uid()) or public.space_role(space_id) in ('owner', 'admin'))
  );
revoke update on public.space_members from authenticated;
grant update (display_name) on public.space_members to authenticated;

create policy "Managers can see invites" on public.space_invites
  for select to authenticated using (public.space_role(space_id) in ('owner', 'admin'));
create policy "Managers can cancel invites" on public.space_invites
  for delete to authenticated using (public.space_role(space_id) in ('owner', 'admin'));

-- Receipts and subscriptions: your own, plus everything shared in your spaces.
drop policy "Users can read their own receipts" on public.receipts;
drop policy "Users can add their own receipts" on public.receipts;
drop policy "Users can update their own receipts" on public.receipts;
drop policy "Users can delete their own receipts" on public.receipts;
drop policy "Users can read their own subscriptions" on public.subscriptions;
drop policy "Users can add their own subscriptions" on public.subscriptions;
drop policy "Users can update their own subscriptions" on public.subscriptions;
drop policy "Users can delete their own subscriptions" on public.subscriptions;

create policy "Read own and shared receipts" on public.receipts for select to authenticated
  using (user_id = (select auth.uid()) or (space_id is not null and public.is_space_member(space_id)));
create policy "Add own receipts, optionally to a space" on public.receipts for insert to authenticated
  with check (user_id = (select auth.uid()) and (space_id is null or public.is_space_member(space_id)));
create policy "Edit own and shared receipts" on public.receipts for update to authenticated
  using (user_id = (select auth.uid()) or (space_id is not null and public.is_space_member(space_id)))
  with check (
    (user_id = (select auth.uid()) and (space_id is null or public.is_space_member(space_id)))
    or (space_id is not null and public.is_space_member(space_id))
  );
create policy "Delete own receipts, or shared ones you manage" on public.receipts for delete to authenticated
  using (user_id = (select auth.uid()) or (space_id is not null and public.can_manage_space_items(space_id)));

create policy "Read own and shared subscriptions" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or (space_id is not null and public.is_space_member(space_id)));
create policy "Add own subscriptions, optionally to a space" on public.subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()) and (space_id is null or public.is_space_member(space_id)));
create policy "Edit own and shared subscriptions" on public.subscriptions for update to authenticated
  using (user_id = (select auth.uid()) or (space_id is not null and public.is_space_member(space_id)))
  with check (
    (user_id = (select auth.uid()) and (space_id is null or public.is_space_member(space_id)))
    or (space_id is not null and public.is_space_member(space_id))
  );
create policy "Delete own subscriptions, or shared ones you manage" on public.subscriptions for delete to authenticated
  using (user_id = (select auth.uid()) or (space_id is not null and public.can_manage_space_items(space_id)));

-- Photos of shared receipts live in the receipt owner's folder; space members can read and replace them.
create function public.is_shared_receipt_photo(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.receipts r
    where r.space_id is not null
      and r.user_id::text = (storage.foldername(object_name))[1]
      and r.photo = storage.filename(object_name)
      and public.is_space_member(r.space_id)
  );
$$;

create policy "Space members can read shared receipt photos" on storage.objects
  for select to authenticated using (bucket_id = 'receipt-photos' and public.is_shared_receipt_photo(name));
create policy "Space members can add shared receipt photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'receipt-photos' and public.is_shared_receipt_photo(name));
create policy "Space members can replace shared receipt photos" on storage.objects
  for update to authenticated using (bucket_id = 'receipt-photos' and public.is_shared_receipt_photo(name))
  with check (bucket_id = 'receipt-photos' and public.is_shared_receipt_photo(name));

-- Anonymous scan sessions can't touch spaces either.
create policy "Anonymous sessions can't use spaces" on public.spaces as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
create policy "Anonymous sessions can't use space members" on public.space_members as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
create policy "Anonymous sessions can't use invites" on public.space_invites as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);

-- Creating, inviting and joining.

create function public.create_space(space_name text, space_kind text, member_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  new_id uuid;
begin
  if me is null or coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) then
    raise exception 'Sign in to create a space';
  end if;
  insert into public.spaces (name, kind, created_by) values (trim(space_name), space_kind, me) returning id into new_id;
  insert into public.space_members (space_id, user_id, role, display_name)
    values (new_id, me, 'owner', left(trim(member_name), 60));
  return new_id;
end;
$$;

-- An 8-character code (no 0/O or 1/I to misread), valid for 7 days, usable by everyone it's shared with.
create function public.create_space_invite(target uuid, invite_role text default 'member') returns text
language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  new_code text := '';
begin
  if public.space_role(target) not in ('owner', 'admin') then
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

create function public.join_space(invite_code text, member_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  invite public.space_invites%rowtype;
begin
  if me is null or coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) then
    raise exception 'Sign in to join a space';
  end if;
  select * into invite from public.space_invites
    where code = upper(replace(trim(invite_code), ' ', '')) and expires_at > now();
  if not found then
    raise exception 'That invite code is wrong or has expired';
  end if;
  insert into public.space_members (space_id, user_id, role, display_name)
    values (invite.space_id, me, invite.role, left(trim(member_name), 60))
    on conflict (space_id, user_id) do nothing;
  return invite.space_id;
end;
$$;

revoke execute on function public.create_space(text, text, text) from public, anon;
revoke execute on function public.create_space_invite(uuid, text) from public, anon;
revoke execute on function public.join_space(text, text) from public, anon;
grant execute on function public.create_space(text, text, text) to authenticated;
grant execute on function public.create_space_invite(uuid, text) to authenticated;
grant execute on function public.join_space(text, text) to authenticated;

-- Live updates: shared changes reach other members' phones straight away (Realtime respects the policies above).
alter publication supabase_realtime add table public.receipts, public.subscriptions;
