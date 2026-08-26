-- supabase/migrations/0004_notification_log.sql
-- 订阅消息发送去重表：pg_cron 每 5 分钟触发 remind-cron，
-- 用 (kind, ref_id, member_id) 唯一键保证「同一待办同一人只推一次」「晨报每天每人一条」。
-- kind='due'     → ref_id = todo.id（到期提醒，永久一次）
-- kind='morning' → ref_id = 'YYYY-MM-DD'（北京时间日期，每日一次）
-- status='sent' 发送成功；'blocked' 终态失败（如用户未订阅 43101），同样不再重试

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('due', 'morning')),
  ref_id text not null,
  member_id text not null references public.profiles(id) on delete cascade,
  status text not null default 'sent' check (status in ('sent', 'blocked')),
  created_at timestamptz not null default now(),
  unique (kind, ref_id, member_id)
);

create index if not exists idx_notification_log_created
  on public.notification_log (created_at);

-- 仅 service_role 读写：RLS 启用且不建任何策略
alter table public.notification_log enable row level security;
