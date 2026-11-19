-- Shared spaces, part two:
-- 1. An activity log per space (who added, returned or removed what; who joined or left), written by triggers
--    so it can't be skipped or forged from the app.
-- 2. Per-member notification choices for each space.
-- 3. Role changes: owners make people admins or members, and can hand the space to someone else.
-- 4. Push tokens, so the notify-space function can tell other members' phones about new receipts and members.

-- 1. Activity

create table public.space_activity (
  id bigint generated always as identity primary key,
  space_id uuid not null references public.spaces (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  -- The actor's name in the space at the time, so the feed still reads well after they leave.
  actor_name text not null default '',
  kind text not null check (kind in (
    'space_created', 'member_joined', 'member_left', 'member_removed', 'role_changed', 'owner_changed',
    'receipt_added', 'receipt_closed', 'receipt_removed', 'subscription_added'
  )),
  item_id uuid,
  title text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now(),
  -- Set by the notify-space function once other members' phones have been told.
  notified_at timestamptz
);
create index space_activity_space_id_created_at_idx on public.space_activity (space_id, created_at desc);
create index space_activity_unnotified_idx on public.space_activity (actor_id) where notified_at is null;

alter table public.space_activity enable row level security;
create policy "Members can see their spaces' activity" on public.space_activity
  for select to authenticated using (public.is_space_member(space_id));
create policy "Anonymous sessions can't see activity" on public.space_activity as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
-- Nobody writes it directly: only the triggers below (security definer) add rows.
revoke insert, update, delete on public.space_activity from authenticated, anon;

/** Adds a line to a space's activity, unless the space is being deleted. */
create function public.log_space_activity(
  target uuid, actor uuid, activity_kind text, item uuid, item_title text, item_detail text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if target is null or not exists (select 1 from public.spaces s where s.id = target) then
    return;
  end if;
  insert into public.space_activity (space_id, actor_id, actor_name, kind, item_id, title, detail)
  values (
    target,
    actor,
    coalesce((select m.display_name from public.space_members m where m.space_id = target and m.user_id = actor), ''),
    activity_kind,
    item,
    left(coalesce(item_title, ''), 120),
    left(coalesce(item_detail, ''), 120)
  );
end;
$$;
revoke execute on function public.log_space_activity(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;

/** "Argos · £24.99" */
create function public.receipt_detail(retailer text, price_pence integer) returns text
language sql immutable set search_path = '' as $$
  select retailer || ' · £' || to_char(price_pence / 100.0, 'FM999999990.00');
$$;

create function public.receipts_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := coalesce((select auth.uid()), case when tg_op = 'DELETE' then old.user_id else new.user_id end);
begin
  if tg_op = 'INSERT' then
    perform public.log_space_activity(new.space_id, actor, 'receipt_added', new.id, new.product,
      public.receipt_detail(new.retailer, new.price_pence));
  elsif tg_op = 'UPDATE' then
    if new.space_id is distinct from old.space_id then
      perform public.log_space_activity(old.space_id, actor, 'receipt_removed', old.id, old.product, old.retailer);
      perform public.log_space_activity(new.space_id, actor, 'receipt_added', new.id, new.product,
        public.receipt_detail(new.retailer, new.price_pence));
    elsif new.space_id is not null and new.closed_reason is not null and old.closed_reason is null then
      perform public.log_space_activity(new.space_id, actor, 'receipt_closed', new.id, new.product, new.closed_reason);
    end if;
  elsif tg_op = 'DELETE' then
    perform public.log_space_activity(old.space_id, actor, 'receipt_removed', old.id, old.product, old.retailer);
  end if;
  return null;
end;
$$;
create trigger receipts_space_activity after insert or update or delete on public.receipts
  for each row execute function public.receipts_activity();

create function public.subscriptions_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.space_id is not null and (tg_op = 'INSERT' or new.space_id is distinct from old.space_id) then
    perform public.log_space_activity(new.space_id, coalesce((select auth.uid()), new.user_id), 'subscription_added',
      new.id, new.name, '£' || to_char(new.price_pence / 100.0, 'FM999999990.00') || ' ' || new.cycle);
  end if;
  return null;
end;
$$;
create trigger subscriptions_space_activity after insert or update on public.subscriptions
  for each row execute function public.subscriptions_activity();

create function public.members_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    perform public.log_space_activity(new.space_id, new.user_id,
      case when new.role = 'owner' then 'space_created' else 'member_joined' end, null, new.display_name, new.role);
  elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
    perform public.log_space_activity(new.space_id, me,
      case when new.role = 'owner' then 'owner_changed' else 'role_changed' end, null, new.display_name, new.role);
  elsif tg_op = 'DELETE' then
    -- The member row is already gone, so log_space_activity can't look up the leaver's name: pass it as the title.
    perform public.log_space_activity(old.space_id, coalesce(me, old.user_id),
      case when me is null or me = old.user_id then 'member_left' else 'member_removed' end, null, old.display_name, '');
  end if;
  return null;
end;
$$;
create trigger space_members_activity after insert or update or delete on public.space_members
  for each row execute function public.members_activity();

alter publication supabase_realtime add table public.space_activity;

-- 2. Notification choices, per member and space. Members change only their own (existing update policy).

alter table public.space_members
  add column notify_receipts boolean not null default true,
  add column notify_members boolean not null default true;
grant update (notify_receipts, notify_members) on public.space_members to authenticated;

-- 3. Roles

-- Owners make other members admins or members. There is always exactly one owner.
create function public.set_space_role(target uuid, member uuid, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.space_role(target) <> 'owner' then
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

-- The owner hands the space to another member and becomes an admin.
create function public.transfer_space_ownership(target uuid, new_owner uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if public.space_role(target) <> 'owner' then
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

revoke execute on function public.set_space_role(uuid, uuid, text) from public, anon;
revoke execute on function public.transfer_space_ownership(uuid, uuid) from public, anon;
grant execute on function public.set_space_role(uuid, uuid, text) to authenticated;
grant execute on function public.transfer_space_ownership(uuid, uuid) to authenticated;

-- 4. Push tokens (Expo push tokens, one row per phone)

create table public.push_tokens (
  token text primary key check (char_length(token) <= 200),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null default '' check (char_length(platform) <= 20),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
create policy "Users can see their own push tokens" on public.push_tokens
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users can remove their own push tokens" on public.push_tokens
  for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.push_tokens from authenticated, anon;

-- A phone's token moves to whoever signs in on it, so one phone never gets another account's notifications.
create function public.register_push_token(push_token text, device_platform text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) then
    raise exception 'Sign in to get notifications';
  end if;
  insert into public.push_tokens (token, user_id, platform) values (push_token, me, left(device_platform, 20))
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;
revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
