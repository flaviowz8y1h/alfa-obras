-- Bucket privado para comprovantes de saídas.
-- Caminho dos arquivos: {ID_Empresa}/{ID_Obra}/{uuid}.{ext}
-- As policies seguem o padrão das tabelas: empresa do usuário logado + owner com aal2.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprovantes',
  'comprovantes',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

create policy comprovantes_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = (select app_private.current_company_id())
    and (select app_private.owner_mfa_ok())
  );

create policy comprovantes_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = (select app_private.current_company_id())
    and (select app_private.current_profile()) in ('owner', 'admin', 'operacional')
    and (select app_private.owner_mfa_ok())
  );

create policy comprovantes_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = (select app_private.current_company_id())
    and (select app_private.owner_mfa_ok())
    and (
      (select app_private.current_profile()) = 'owner'
      or owner_id = (select auth.uid())::text
    )
  );
