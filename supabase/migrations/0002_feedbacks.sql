-- supabase/migrations/0002_feedbacks.sql
-- 用户反馈表：客户端直接 upsert，后台 Dashboard 可查

create table if not exists public.feedbacks (
  id text primary key,
  user_id text default '',
  user_name text default '',
  content text not null,
  page text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

alter table public.feedbacks enable row level security;

-- 登录用户可提交反馈；只能看自己的
drop policy if exists p_feedbacks_insert on public.feedbacks;
create policy p_feedbacks_insert on public.feedbacks
  for insert with check (auth.role() = 'authenticated');

drop policy if exists p_feedbacks_self on public.feedbacks;
create policy p_feedbacks_self on public.feedbacks
  for select using (user_id = public.current_uid());
