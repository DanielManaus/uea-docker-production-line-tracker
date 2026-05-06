create extension if not exists pgcrypto;

create table if not exists production_events (
  id uuid primary key default gen_random_uuid(),
  source varchar(20) not null check (source in ('HELLER', 'KIC')),
  line_id varchar(80) not null,
  oven_id varchar(80) not null,
  event_type varchar(60) not null check (
    event_type in (
      'BATCH_STARTED',
      'BATCH_COMPLETED',
      'TEMPERATURE_READING',
      'ALARM',
      'MAINTENANCE'
    )
  ),
  status varchar(20) not null check (status in ('INFO', 'WARNING', 'CRITICAL')),
  temperature_c numeric(8,2),
  description text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists ix_production_events_occurred_at
  on production_events (occurred_at desc);

create index if not exists ix_production_events_line_status
  on production_events (line_id, status);

create index if not exists ix_production_events_source
  on production_events (source);
