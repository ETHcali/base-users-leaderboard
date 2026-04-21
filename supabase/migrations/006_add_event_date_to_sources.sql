-- Add event_date to both source tables so admins can record the actual event/mint date
alter table poap_sources add column if not exists event_date date;
alter table nft_sources  add column if not exists event_date date;
