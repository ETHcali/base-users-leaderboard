-- ETH Cali user profiles linked to wallet addresses

CREATE TABLE IF NOT EXISTS public.users (
  wallet_address  TEXT PRIMARY KEY,          -- checksummed lowercase ETH address
  name            TEXT NOT NULL,
  x_username      TEXT,
  telegram_handle TEXT,
  whatsapp        TEXT,                      -- E.164 format e.g. +573001234567
  country_code    TEXT,                      -- ISO 3166-1 alpha-2 e.g. CO, MX
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on upsert
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Public read (leaderboard can show names), only owner can write via anon key
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read"
  ON public.users FOR SELECT USING (true);

CREATE POLICY "Owner upsert"
  ON public.users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owner update"
  ON public.users FOR UPDATE
  USING (true);
