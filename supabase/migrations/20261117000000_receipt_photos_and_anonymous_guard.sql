-- Receipt photos: each receipt can name a photo (or PDF) kept as proof of purchase,
-- stored in a private bucket at "<user id>/<file name>".

alter table public.receipts add column photo text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipt-photos',
  'receipt-photos',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

create policy "Users can read their own receipt photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipt-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can add their own receipt photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipt-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can replace their own receipt photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipt-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'receipt-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can delete their own receipt photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipt-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Anonymous sessions only exist so signed-out users can scan receipts. Supabase counts them as
-- "authenticated", so these restrictive policies stop them reading or writing any stored data.

create policy "Anonymous sessions can't use receipts" on public.receipts
  as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);

create policy "Anonymous sessions can't use subscriptions" on public.subscriptions
  as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);

create policy "Anonymous sessions can't use receipt photos" on storage.objects
  as restrictive for all to authenticated
  using (bucket_id <> 'receipt-photos' or (select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check (bucket_id <> 'receipt-photos' or (select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
