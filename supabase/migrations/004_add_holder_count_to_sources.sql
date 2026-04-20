alter table poap_sources
  add column if not exists holder_count integer not null default 0,
  add column if not exists last_synced_at timestamptz;

alter table nft_sources
  add column if not exists holder_count integer not null default 0,
  add column if not exists last_synced_at timestamptz;
