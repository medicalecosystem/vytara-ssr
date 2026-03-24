begin;

create extension if not exists pgcrypto;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  type text not null check (type in ('general', 'bug', 'feature')),
  message text not null,
  context jsonb not null default '{}'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  steps_to_reproduce text null,
  use_case text null,
  created_at timestamp with time zone not null default now()
);

create index if not exists feedback_user_id_idx
  on public.feedback (user_id);

create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);

alter table public.feedback enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback'
      and policyname = 'service role can manage feedback'
  ) then
    create policy "service role can manage feedback"
      on public.feedback
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'feedback-attachments',
  'feedback-attachments',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'application/pdf']
where not exists (
  select 1
  from storage.buckets
  where id = 'feedback-attachments'
);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated users can upload their feedback attachments'
  ) then
    create policy "authenticated users can upload their feedback attachments"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'feedback-attachments'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated users can delete their feedback attachments'
  ) then
    create policy "authenticated users can delete their feedback attachments"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'feedback-attachments'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'anon users can upload anonymous feedback attachments'
  ) then
    create policy "anon users can upload anonymous feedback attachments"
      on storage.objects
      for insert
      to anon
      with check (
        bucket_id = 'feedback-attachments'
        and (storage.foldername(name))[1] = 'anonymous'
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'anon users can delete anonymous feedback attachments'
  ) then
    create policy "anon users can delete anonymous feedback attachments"
      on storage.objects
      for delete
      to anon
      using (
        bucket_id = 'feedback-attachments'
        and (storage.foldername(name))[1] = 'anonymous'
      );
  end if;
end
$$;

commit;
