-- HOMECOMING — Supabase schema v1
-- Run this in Supabase SQL Editor on a fresh project.

-- ============ TABLES ============

create table care_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

create table circle_members (
  circle_id uuid references care_circles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'caregiver' check (role in ('owner','caregiver','viewer')),
  joined_at timestamptz default now(),
  primary key (circle_id, user_id)
);

create table care_recipients (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references care_circles(id) on delete cascade not null,
  display_name text not null,
  notes text,
  created_at timestamptz default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references care_circles(id) on delete cascade not null,
  doc_type text not null default 'discharge' check (doc_type in ('discharge','med_list','other')),
  storage_path text,
  raw_text text,                       -- extracted text (OCR/PDF parse result)
  status text not null default 'uploaded' check (status in ('uploaded','extracting','extracted','failed')),
  retain boolean not null default true, -- false = delete raw doc after extraction (privacy option)
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table candidate_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  circle_id uuid references care_circles(id) on delete cascade not null,
  category text not null check (category in ('medication','appointment','task','warning')),
  payload jsonb not null,              -- category-specific fields, see extract function
  confidence text not null default 'high' check (confidence in ('high','low')),
  source_page int,
  source_snippet text,                 -- exact text span this item was derived from
  state text not null default 'pending' check (state in ('pending','confirmed','edited','rejected')),
  created_at timestamptz default now()
);

create table plan_items (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references care_circles(id) on delete cascade not null,
  category text not null check (category in ('medication','appointment','task','warning')),
  payload jsonb not null,
  source_item_id uuid references candidate_items(id),
  confirmed_by uuid references auth.users(id) not null,
  confirmed_at timestamptz default now(),
  active boolean not null default true
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  plan_item_id uuid references plan_items(id) on delete cascade not null,
  circle_id uuid references care_circles(id) on delete cascade not null,
  remind_at timestamptz not null,
  channel text not null default 'in_app' check (channel in ('in_app','email')),
  sent boolean not null default false
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references care_circles(id) on delete cascade not null,
  text text not null,
  origin text not null default 'reconciliation' check (origin in ('reconciliation','manual')),
  status text not null default 'open' check (status in ('open','asked','answered')),
  answer text,
  created_at timestamptz default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  circle_id uuid references care_circles(id) on delete cascade not null,
  user_id uuid references auth.users(id),
  action text not null,                -- e.g. 'confirmed_item','edited_item','rejected_item','uploaded_doc'
  target_id uuid,
  detail jsonb,
  created_at timestamptz default now()
);

-- ============ RLS ============

alter table care_circles enable row level security;
alter table circle_members enable row level security;
alter table care_recipients enable row level security;
alter table documents enable row level security;
alter table candidate_items enable row level security;
alter table plan_items enable row level security;
alter table reminders enable row level security;
alter table questions enable row level security;
alter table audit_log enable row level security;

-- helper: is the current user a member of this circle?
create or replace function is_circle_member(cid uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from circle_members
    where circle_id = cid and user_id = auth.uid()
  );
$$;

-- care_circles: members can read; creator inserts; owner updates/deletes
create policy "members read circles" on care_circles for select using (is_circle_member(id));
create policy "create own circle" on care_circles for insert with check (created_by = auth.uid());
create policy "owner updates circle" on care_circles for update using (
  exists (select 1 from circle_members where circle_id = id and user_id = auth.uid() and role = 'owner')
);

-- circle_members: members read; owners manage; creator bootstraps self as owner
create policy "members read members" on circle_members for select using (is_circle_member(circle_id));
create policy "self join as owner on own circle" on circle_members for insert with check (
  user_id = auth.uid()
  and (
    exists (select 1 from care_circles c where c.id = circle_id and c.created_by = auth.uid())
    or exists (select 1 from circle_members m where m.circle_id = circle_id and m.user_id = auth.uid() and m.role = 'owner')
  )
);

-- generic member policies for the rest
create policy "members read"   on care_recipients for select using (is_circle_member(circle_id));
create policy "members write"  on care_recipients for insert with check (is_circle_member(circle_id));
create policy "members update" on care_recipients for update using (is_circle_member(circle_id));

create policy "members read"   on documents for select using (is_circle_member(circle_id));
create policy "members write"  on documents for insert with check (is_circle_member(circle_id));
create policy "members update" on documents for update using (is_circle_member(circle_id));
create policy "members delete" on documents for delete using (is_circle_member(circle_id));

create policy "members read"   on candidate_items for select using (is_circle_member(circle_id));
create policy "members write"  on candidate_items for insert with check (is_circle_member(circle_id));
create policy "members update" on candidate_items for update using (is_circle_member(circle_id));

create policy "members read"   on plan_items for select using (is_circle_member(circle_id));
create policy "members write"  on plan_items for insert with check (is_circle_member(circle_id) and confirmed_by = auth.uid());
create policy "members update" on plan_items for update using (is_circle_member(circle_id));

create policy "members read"   on reminders for select using (is_circle_member(circle_id));
create policy "members write"  on reminders for insert with check (is_circle_member(circle_id));
create policy "members update" on reminders for update using (is_circle_member(circle_id));

create policy "members read"   on questions for select using (is_circle_member(circle_id));
create policy "members write"  on questions for insert with check (is_circle_member(circle_id));
create policy "members update" on questions for update using (is_circle_member(circle_id));

create policy "members read audit" on audit_log for select using (is_circle_member(circle_id));
create policy "members write audit" on audit_log for insert with check (is_circle_member(circle_id));
