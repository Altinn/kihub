-- 027 SC-003: per-collection visibility fingerprint. Run before and after the drafts migration;
-- output must be identical. Before the migration the column is `status`, after it is `_status`:
-- set the psql variable, e.g.  psql -v col=status -f sc003-baseline.sql   (or -v col=_status)
select 'news' as t, count(*) as total, count(*) filter (where :col::text = 'published') as published,
       md5(string_agg(slug || '|' || title || '|' || :col::text, ',' order by id)) as fp from news
union all
select 'projects', count(*), count(*) filter (where :col::text = 'published'),
       md5(string_agg(slug || '|' || title || '|' || :col::text, ',' order by id)) from projects
union all
select 'events', count(*), count(*) filter (where :col::text = 'published'),
       md5(string_agg(slug || '|' || title || '|' || :col::text, ',' order by id)) from events
union all
select 'learning_pages', count(*), count(*) filter (where :col::text = 'published'),
       md5(string_agg(slug || '|' || title || '|' || :col::text, ',' order by id)) from learning_pages
order by 1;
