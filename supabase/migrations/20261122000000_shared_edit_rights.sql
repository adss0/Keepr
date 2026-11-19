-- Who can change shared receipts and subscriptions. By default only whoever added an item and the space's owner and
-- admins can edit it, mark it returned, claimed or archived, or delete it. Everyone else can still see and export it.
-- An owner or admin can let every member change items (members_can_edit), as each space's own setting.

alter table public.spaces add column members_can_edit boolean not null default false;

-- Replaces the old rule that let everyone in a family space delete shared items.
create or replace function public.can_manage_space_items(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.space_role(target) in ('owner', 'admin')
    or (public.is_space_member(target)
      and exists (select 1 from public.spaces s where s.id = target and s.members_can_edit));
$$;

drop policy "Edit own and shared receipts" on public.receipts;
create policy "Edit own receipts, or shared ones you may change" on public.receipts for update to authenticated
  using (user_id = (select auth.uid()) or (space_id is not null and public.can_manage_space_items(space_id)))
  with check (
    (user_id = (select auth.uid()) and (space_id is null or public.is_space_member(space_id)))
    or (space_id is not null and public.can_manage_space_items(space_id))
  );

drop policy "Edit own and shared subscriptions" on public.subscriptions;
create policy "Edit own subscriptions, or shared ones you may change" on public.subscriptions for update to authenticated
  using (user_id = (select auth.uid()) or (space_id is not null and public.can_manage_space_items(space_id)))
  with check (
    (user_id = (select auth.uid()) and (space_id is null or public.is_space_member(space_id)))
    or (space_id is not null and public.can_manage_space_items(space_id))
  );
