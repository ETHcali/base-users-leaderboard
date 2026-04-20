alter table poap_sources
  add column if not exists chain text not null default 'gnosis';
