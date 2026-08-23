-- supabase/migrations/0001_init.sql
-- team-remind 初始库表：profiles / teams / members / todos / comments / events
-- 约定：
-- - 所有主键为 text（客户端生成 uuid 前缀 id）
-- - 所有表带 updated_at（同步游标）、deleted（软删除墓碑）
-- - RLS 开启：成员只能读写自己所在团队的数据

create extension if not exists "pgcrypto";

-- ---------- profiles：用户档案（openid 映射） ----------
create table if not exists public.profiles (
  id text primary key,                       -- = auth.users.id
  openid text unique,                        -- 微信 openid
  name text not null default '微信用户',
  avatar_char text default '',
  avatar_color text default '#10b981',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

-- ---------- teams ----------
create table if not exists public.teams (
  id text primary key,
  name text not null,
  description text default '',
  avatar_char text default '',
  avatar_color text default '#10b981',
  accent_color text default '#10b981',
  member_count int not null default 0,
  creator_id text not null,
  archived boolean not null default false,
  created_at date not null default current_date,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

-- ---------- members：团队成员（id 即全局用户 id，一人多团队多行） ----------
create table if not exists public.members (
  id text not null,                          -- 用户全局 id（= user.id）
  team_id text not null references public.teams(id),
  name text not null,
  avatar_char text default '',
  avatar_color text default '#10b981',
  role text not null default 'member',       -- creator | admin | member
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  primary key (id, team_id)
);

-- ---------- todos：assignments 以 JSONB 存储（指派/认领名额统一结构） ----------
create table if not exists public.todos (
  id text primary key,
  title text not null,
  description text default '',
  team_id text not null references public.teams(id),
  team_name text default '',
  assignee_id text default '',
  assignee_name text default '',
  due_date date,
  due_time text default '',                  -- HH:mm，可空
  priority text not null default 'normal',   -- urgent | normal
  mode text not null default 'assign',       -- assign | claim
  repeat text not null default 'none',       -- none | daily | weekly
  status text not null default 'pending',    -- pending | in_progress | completed
  created_by text default '',
  assignments jsonb not null default '[]',
  created_at date not null default current_date,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists todos_team_idx on public.todos(team_id);
create index if not exists todos_due_idx on public.todos(due_date) where status <> 'completed';

-- ---------- comments：待办评论（@提及存 mentions 数组） ----------
create table if not exists public.comments (
  id text primary key,
  todo_id text not null references public.todos(id),
  team_id text not null,
  author_id text not null,
  author_name text default '',
  author_avatar_char text default '',
  author_avatar_color text default '#10b981',
  content text not null,
  mentions jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists comments_todo_idx on public.comments(todo_id);

-- ---------- events：动态流 + 定向消息（target_id 非空即个人通知） ----------
create table if not exists public.events (
  id text primary key,
  type text not null,                        -- create|complete|claim|nudge|comment|mention|join
  actor_id text default '',
  actor_name text default '',
  actor_avatar_char text default '',
  actor_avatar_color text default '#10b981',
  target_id text default '',                 -- 非空 = 定向通知
  team_id text default '',
  todo_id text default '',
  todo_title text default '',
  content text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists events_target_idx on public.events(target_id);
create index if not exists events_team_idx on public.events(team_id);

-- ---------- updated_at 自动维护 ----------
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['profiles','teams','members','todos','comments','events'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s', t);
    execute format(
      'create trigger trg_touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.teams    enable row level security;
alter table public.members  enable row level security;
alter table public.todos    enable row level security;
alter table public.comments enable row level security;
alter table public.events   enable row level security;

-- 辅助函数：当前用户 id（客户端以 supabase uid 作为全局身份）
create or replace function public.current_uid()
returns text language sql stable as $$
  select auth.uid()::text
$$;

-- 是否某团队成员
create or replace function public.is_member(tid text)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.members m
    where m.team_id = tid and m.id = public.current_uid() and not m.deleted
  )
$$;

-- profiles：本人可读写自己的档案
drop policy if exists p_profiles_self on public.profiles;
create policy p_profiles_self on public.profiles
  for all using (id = public.current_uid()) with check (id = public.current_uid());

-- teams：本人所在团队的可见；创建者可写；任何登录用户可建新队
drop policy if exists p_teams_read on public.teams;
create policy p_teams_read on public.teams for select using (public.is_member(id));
drop policy if exists p_teams_insert on public.teams;
create policy p_teams_insert on public.teams for insert with check (auth.role() = 'authenticated');
drop policy if exists p_teams_update on public.teams;
create policy p_teams_update on public.teams for update using (creator_id = public.current_uid());

-- members：同队互见；本人可增删自己的成员行；管理员语义在客户端校验
drop policy if exists p_members_read on public.members;
create policy p_members_read on public.members for select using (public.is_member(team_id));
drop policy if exists p_members_write on public.members;
create policy p_members_write on public.members for all
  using (id = public.current_uid() or public.is_member(team_id))
  with check (auth.role() = 'authenticated');

-- todos / comments / events：同队读写
drop policy if exists p_todos_all on public.todos;
create policy p_todos_all on public.todos for all using (public.is_member(team_id)) with check (public.is_member(team_id));
drop policy if exists p_comments_all on public.comments;
create policy p_comments_all on public.comments for all using (public.is_member(team_id)) with check (public.is_member(team_id));
drop policy if exists p_events_read on public.events;
create policy p_events_read on public.events for select using (public.is_member(team_id) or target_id = public.current_uid());
drop policy if exists p_events_write on public.events;
create policy p_events_write on public.events for insert with check (actor_id = public.current_uid());
