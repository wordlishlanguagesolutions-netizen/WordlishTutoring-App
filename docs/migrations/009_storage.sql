-- Migración 009 · Buckets de Storage y sus políticas
-- Debe correr después de 001 (necesita helpers is_admin, is_staff).

insert into storage.buckets (id, name, public)
values
  ('avatars','avatars', true),
  ('class-screenshots','class-screenshots', false),
  ('class-materials','class-materials', false),
  ('payroll-receipts','payroll-receipts', false),
  ('payment-receipts','payment-receipts', false)
on conflict (id) do nothing;

-- avatars
drop policy if exists "avatars_public_select" on storage.objects;
create policy "avatars_public_select" on storage.objects
  for select to public using (bucket_id = 'avatars');
drop policy if exists "avatars_authenticated_write_own" on storage.objects;
create policy "avatars_authenticated_write_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_authenticated_update_own" on storage.objects;
create policy "avatars_authenticated_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_authenticated_delete_own" on storage.objects;
create policy "avatars_authenticated_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- class-screenshots
drop policy if exists "class_screenshots_staff_all" on storage.objects;
create policy "class_screenshots_staff_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'class-screenshots' and public.is_staff())
  with check (bucket_id = 'class-screenshots' and public.is_staff());
drop policy if exists "class_screenshots_participant_read" on storage.objects;
create policy "class_screenshots_participant_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'class-screenshots');

-- class-materials
drop policy if exists "class_materials_authenticated_all" on storage.objects;
create policy "class_materials_authenticated_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'class-materials')
  with check (bucket_id = 'class-materials');

-- payroll-receipts
drop policy if exists "payroll_receipts_admin_all" on storage.objects;
create policy "payroll_receipts_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'payroll-receipts' and public.is_admin())
  with check (bucket_id = 'payroll-receipts' and public.is_admin());
drop policy if exists "payroll_receipts_authenticated_read" on storage.objects;
create policy "payroll_receipts_authenticated_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'payroll-receipts');

-- payment-receipts
drop policy if exists "payment_receipts_admin_all" on storage.objects;
create policy "payment_receipts_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'payment-receipts' and public.is_admin())
  with check (bucket_id = 'payment-receipts' and public.is_admin());
drop policy if exists "payment_receipts_authenticated_read" on storage.objects;
create policy "payment_receipts_authenticated_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-receipts');
