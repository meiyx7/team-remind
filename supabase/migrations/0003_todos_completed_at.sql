-- supabase/migrations/0003_todos_completed_at.sql
-- 待办完成时刻：热力图与完成统计的数据源

alter table public.todos
  add column if not exists completed_at timestamptz;
