alter table posts
add column if not exists status text not null default 'draft'
check (status in ('draft', 'live'));

alter table posts
add column if not exists instagram_url text;

update posts
set status = case when published then 'live' else 'draft' end
where status is null or status not in ('draft', 'live');

create index if not exists posts_status_idx on posts(status);
