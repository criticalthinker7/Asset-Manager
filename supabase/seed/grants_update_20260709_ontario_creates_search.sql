-- Idempotent Ontario Creates catalog refresh for search/tag QA.
-- Run in Supabase SQL editor or via MCP execute_sql after review.

begin;

update public.grants
set
  is_active = false,
  updated_at = now()
where org = 'Ontario Creates'
  and (
    lower(name) = 'ontario creates ip fund'
    or lower(name) = 'idm fund'
    or lower(name) like '%interactive digital media fund%'
    or lower(name) like 'film fund%'
    or lower(name) like 'book fund%'
    or lower(name) like 'magazine fund%'
  )
  and url not in (
    'https://www.ontariocreates.ca/investment-programs/content-creation/intellectual-property-fund/interactive-content-stream',
    'https://www.ontariocreates.ca/investment-programs/content-creation/intellectual-property-fund/linear-content-stream',
    'https://www.ontariocreates.ca/our-sectors/music/ontario-music-investment-fund/omif-music-creation',
    'https://www.ontariocreates.ca/our-sectors/music/ontario-music-investment-fund',
    'https://www.ontariocreates.ca/investment-programs/business-development/publishing-marketing-and-discoverability-fund',
    'https://www.ontariocreates.ca/investment-programs/business-development/enterprise-fund',
    'https://www.ontariocreates.ca/investment-programs/industry-development/industry-development-program',
    'https://www.ontariocreates.ca/investment-programs/international-development/export-global-market',
    'https://www.ontariocreates.ca/investment-programs/content-creation/intellectual-property-fund/screen-marketing-and-discoverability'
  );

create temp table tmp_ontario_creates_grants (
  name text not null,
  org text not null,
  open_date date,
  close_date date,
  close_label text not null,
  url text not null,
  discipline text[] not null,
  location text not null,
  amount text,
  tags text[] not null,
  eligibility text,
  description text
) on commit drop;

insert into tmp_ontario_creates_grants
  (name, org, open_date, close_date, close_label, url, discipline, location, amount, tags, eligibility, description)
values
  (
    'IP Fund (Interactive Content)',
    'Ontario Creates',
    '2026-04-13'::date,
    '2026-09-14'::date,
    '2026-09-14',
    'https://www.ontariocreates.ca/investment-programs/content-creation/intellectual-property-fund/interactive-content-stream',
    array['Interactive','Digital Media'],
    'Canada',
    '$15,000-$500,000',
    array['Ontario','Ontario Creates','OC','IP Fund','Interactive Content Stream','Interactive','Games','Gaming','Video Games','XR','AR','VR','Immersive','IDM','Interactive Digital Media Fund','Production','Pre-Production'],
    'Ontario-based companies developing video games or XR content. Supports pre-production and production phases, with funding based on eligible Ontario expenses and applicant track record.',
    'Supports Ontario video game and XR content through the IP Fund Interactive Content stream.'
  ),
  (
    'IP Fund (Linear Content)',
    'Ontario Creates',
    '2026-04-21'::date,
    '2026-09-22'::date,
    '2026-09-22',
    'https://www.ontariocreates.ca/investment-programs/content-creation/intellectual-property-fund/linear-content-stream',
    array['Film','Television','Digital Media'],
    'Canada',
    'Up to $400,000',
    array['Ontario','Ontario Creates','OC','IP Fund','Linear Content Stream','Film','Television','TV','Digital Series','Documentary','Feature Film','Film Fund','Screen','Development','Production'],
    'Ontario-based production companies developing or producing feature film, documentary, or digital series projects with eligible Ontario spend.',
    'Supports development and production of feature films, documentaries, and digital series through the IP Fund Linear Content stream.'
  ),
  (
    'OMIF - Music Creation',
    'Ontario Creates',
    '2026-01-01'::date,
    '2026-10-29'::date,
    '2026-10-29',
    'https://www.ontariocreates.ca/our-sectors/music/ontario-music-investment-fund/omif-music-creation',
    array['Music'],
    'Canada',
    'Varies (formula-based)',
    array['Ontario','Ontario Creates','OC','OMIF','Ontario Music Investment Fund','Music Creation','Music','Record Labels','Music Publishers','Creation','Content Creation'],
    'Ontario-based music companies including eligible record labels and music publishers. Eligibility and funding are formula-based and tied to company revenue and eligible activities.',
    'Supports Ontario music companies investing in music creation and related business activity through the Ontario Music Investment Fund.'
  ),
  (
    'OMIF - Live Music',
    'Ontario Creates',
    '2026-01-01'::date,
    '2026-10-22'::date,
    '2026-10-22',
    'https://www.ontariocreates.ca/our-sectors/music/ontario-music-investment-fund',
    array['Music'],
    'Canada',
    'Varies',
    array['Ontario','Ontario Creates','OC','OMIF','Ontario Music Investment Fund','Live Music','Music','Presenters','Promoters','Concerts','Music Industry'],
    'Ontario-based live music businesses and organizations, including eligible presenters and promoters. Full eligibility varies by OMIF stream.',
    'Supports Ontario live music activity as part of the Ontario Music Investment Fund.'
  ),
  (
    'Publishing Marketing and Discoverability Fund',
    'Ontario Creates',
    '2026-01-01'::date,
    '2026-06-01'::date,
    '2026-06-01',
    'https://www.ontariocreates.ca/investment-programs/business-development/publishing-marketing-and-discoverability-fund',
    array['Writing','Publishing'],
    'Canada',
    'Up to $150,000',
    array['Ontario','Ontario Creates','OC','Publishing','Books','Book Publishers','Book Fund','Magazine','Magazine Publishing','Magazine Fund','Marketing','Discoverability','Publishing Marketing','Emerging Publishers'],
    'Ontario-based book and magazine publishers. Emerging publishers may apply for up to $15,000 after at least 12 months of publishing activity.',
    'Replaces the former Book Fund and Magazine Fund with one integrated program supporting marketing and discoverability for Ontario publishers.'
  ),
  (
    'Enterprise Fund',
    'Ontario Creates',
    '2026-04-29'::date,
    '2026-08-27'::date,
    '2026-08-27',
    'https://www.ontariocreates.ca/investment-programs/business-development/enterprise-fund',
    array['Film','Television','Digital Media','Writing','Publishing'],
    'Canada',
    'Up to $80,000 individual / $150,000 partnership',
    array['Ontario','Ontario Creates','OC','Enterprise Fund','Enterprise','Business Development','Cross-Sector','Screen','Publishing','Innovation','Strategic Business Development'],
    'Ontario-based publishing and screen-sector companies, including individual applicants and partnerships pursuing strategic business development activities.',
    'Pilot program supporting innovative business development activities for Ontario publishing and screen-sector companies.'
  ),
  (
    'Industry Development Program',
    'Ontario Creates',
    '2026-03-25'::date,
    '2026-07-22'::date,
    '2026-07-22',
    'https://www.ontariocreates.ca/investment-programs/industry-development/industry-development-program',
    array['Film','Television','Digital Media','Writing','Publishing','Interdisciplinary'],
    'Canada',
    'Up to $35,000',
    array['Ontario','Ontario Creates','OC','Industry Development Program','IDP','Industry Development','Cross-Sector','Trade Organizations','Events','Capacity Building','Business Development','Creative Industries'],
    'Ontario or national not-for-profit trade and event organizations offering significant benefit to Ontario participants in the book, magazine, film, television, and interactive digital media sectors.',
    'Supports industry initiatives, events, and capacity-building activities with long-term benefits for Ontario creative-sector companies.'
  ),
  (
    'Global Market Development Programs',
    'Ontario Creates',
    '2026-01-01'::date,
    null,
    'Rolling',
    'https://www.ontariocreates.ca/investment-programs/international-development/export-global-market',
    array['Film','Television','Digital Media','Music','Writing','Publishing'],
    'Canada',
    'Up to $15,000',
    array['Ontario','Ontario Creates','OC','Global Market Development','GMD','Export','International','Market Development','Books','Book Industry','Music','Film','Television','Screen','Interactive','Cross-Sector'],
    'Ontario-based companies in eligible interactive, book, film and television, and music sectors. Deadlines and requirements vary by sector-specific sub-program.',
    'Supports strategic export development activities that help Ontario creative companies grow international market opportunities.'
  ),
  (
    'Screen Marketing and Discoverability Program',
    'Ontario Creates',
    '2026-01-01'::date,
    '2026-12-16'::date,
    '2026-12-16',
    'https://www.ontariocreates.ca/investment-programs/content-creation/intellectual-property-fund/screen-marketing-and-discoverability',
    array['Film','Television','Digital Media','Interactive'],
    'Canada',
    '$5,000-$50,000',
    array['Ontario','Ontario Creates','OC','IP Fund','Screen Marketing','Screen Marketing and Discoverability','Marketing','Discoverability','Film','Television','TV','Interactive','IDM','Film Fund','Interactive Digital Media Fund'],
    'Ontario screen companies with eligible projects that previously received Ontario Creates production investments. Applicants must receive approval to apply through the Online Application Portal process.',
    'Combines former film marketing and IDM discoverability support into one program for audience growth, discoverability, and revenue generation.'
  );

update public.grants as g
set
  name = s.name,
  org = s.org,
  open_date = s.open_date,
  close_date = s.close_date,
  close_label = s.close_label,
  discipline = s.discipline,
  location = s.location,
  amount = s.amount,
  tags = s.tags,
  eligibility = s.eligibility,
  description = s.description,
  is_active = true,
  updated_at = now()
from tmp_ontario_creates_grants as s
where g.url = s.url
  or (g.org = s.org and lower(g.name) = lower(s.name));

insert into public.grants
  (name, org, open_date, close_date, close_label, url, discipline, location, amount, tags, eligibility, description, is_active)
select
  s.name,
  s.org,
  s.open_date,
  s.close_date,
  s.close_label,
  s.url,
  s.discipline,
  s.location,
  s.amount,
  s.tags,
  s.eligibility,
  s.description,
  true
from tmp_ontario_creates_grants as s
where not exists (
  select 1
  from public.grants as g
  where g.url = s.url
    or (g.org = s.org and lower(g.name) = lower(s.name))
);

commit;

select id, name, org, close_label, is_active, tags
from public.grants
where org = 'Ontario Creates'
order by is_active desc, name;
