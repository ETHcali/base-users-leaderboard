-- POAP event sources
create table if not exists poap_sources (
  id bigint generated always as identity primary key,
  event_id integer unique not null,
  name text not null,
  created_at timestamptz default now()
);

-- Unlock Protocol / ERC-721 NFT contract sources
create table if not exists nft_sources (
  id bigint generated always as identity primary key,
  address text unique not null,
  chain text not null,
  name text not null,
  created_at timestamptz default now()
);

-- Deduplicated wallet address dataset (fed by sync)
create table if not exists dataset_addresses (
  address text primary key,
  updated_at timestamptz default now()
);

-- Seed: POAP events
insert into poap_sources (event_id, name) values
  (147806, 'Ethereum Birthday - Empresarios Web3 (2023)'),
  (147944, 'Workshop: Set-up en EVM (2023)'),
  (150539, 'Ethereum Starter Pack - NFT 101 (2023)'),
  (157654, 'Data DAY UAO (2023)'),
  (195225, 'Destino Devconnect - Ethereum Birthday 2025'),
  (197326, 'Curso DEFI USB - Infraestructura web3'),
  (197331, 'Curso DEFI USB - Un Mundo tokenizado'),
  (198655, 'Curso DEFI USB - Apps and Protocols DeFi'),
  (198658, 'Curso DEFI USB - TradFi vs Defi'),
  (201984, 'Curso DEFI USB - DAOs y Gobernanza'),
  (202090, 'Curso DEFI USB - Web3 Funding I'),
  (205678, 'Curso DEFI USB - Web3 Funding II'),
  (205884, 'Curso DEFI USB - Mercados con AI'),
  (209387, 'Crea tu app en Ethereum'),
  (211588, 'Coworking ETHGlobal x ETHCALI Cali 2025'),
  (218106, 'Uniswap Day'),
  (224092, 'Get ready with ETH CALI for Hack Money 2026')
on conflict (event_id) do nothing;

-- Seed: NFT contracts (Unlock Protocol)
insert into nft_sources (address, chain, name) values
  ('0xce984f9e6335198fff193cc0596489dc9e570f3f', 'optimism', 'Papayogin'),
  ('0xfcf03741a264a00fda35a5814e669968cab95204', 'optimism', 'Ethereum Starter Pack - Seguridad en WEB3'),
  ('0x9eb1dc77ac01b823f94c25ea054650930a3b7050', 'optimism', 'Proof-of-Stake en Ramada Cafe'),
  ('0x62a2c557092eafe5c24151ed8e52ecaba6ac44a7', 'optimism', 'Financiando bienes publicos con Giveth'),
  ('0xdf3bed18e02daeb29e2bbc39c04773578d0fd1c8', 'optimism', 'Hackathon USC'),
  ('0x70bd76e89478400d9ee4c0f1200e53e751610ecf', 'polygon',  'Ethereum Starter Pack - DeFi'),
  ('0xc67db733d754753ca19a3502f36756e9e4141cbd', 'polygon',  'Ramada Cafe Opening'),
  ('0x2296e9d389a8c7dc2598d197e9fe43ea12052883', 'polygon',  'Taller Solidity ICESI'),
  ('0x1337722f177e99c8cd490f432a319d8c7a003ea8', 'base',     'Drumcode Cali General'),
  ('0x0eceaa7c20becaf159f362b48b19b3bcb44780bd', 'base',     'Drumcode Cali General Anytime'),
  ('0x114f67f5ca3656618dd5648d31e50ac8c0dac046', 'base',     'Drumcode Cali VIP'),
  ('0xeeb48f34e083d1c0069593424dc0dd6055fd04e8', 'base',     'Drumcode Cali Backstage'),
  ('0x8db8003c692d68dd20722eda6fc4de8708cd5ed6', 'base',     'Activacion Discoteca 1060'),
  ('0x19f7b2834ca07ececefc21202714b3c667588aa9', 'base',     'BASE Community Meetup (x3 editions)'),
  ('0x2744a0d99fc319c37d72ae9e98cba1b351bc37d5', 'base',     'Hackathon WEB3 Cali'),
  ('0x7082f47ca600240f41a2fbee26a894d875a63b2f', 'base',     'Open House USB')
on conflict (address) do nothing;
