BEGIN;

ALTER TABLE nations ADD COLUMN IF NOT EXISTS flag_url TEXT;

INSERT INTO nations (code, name, flag_url) VALUES
  ('BR', 'Brazil',  'brazil.png'),
  ('UA', 'Ukraine', 'ukraine.png')
ON CONFLICT (code)
DO UPDATE SET flag_url = EXCLUDED.flag_url;

COMMIT;
