BEGIN;

-- Nations (z flag_url od razu)
CREATE TABLE IF NOT EXISTS nations (
  code       TEXT PRIMARY KEY,        -- 'BR', 'UA'
  name       TEXT NOT NULL,
  flag_url   TEXT
);

-- Leagues
CREATE TABLE IF NOT EXISTS leagues (
  id         SERIAL PRIMARY KEY,
  code       TEXT UNIQUE NOT NULL,    -- 'EPL'
  name       TEXT NOT NULL            -- 'Premier League'
);

-- Positions
CREATE TABLE IF NOT EXISTS positions (
  code       TEXT PRIMARY KEY,        -- 'LW', 'ST', ...
  name       TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0
);

-- Clubs (z dwoma kolorami + FK do leagues)
CREATE TABLE IF NOT EXISTS clubs (
  id             SERIAL PRIMARY KEY,
  code           TEXT UNIQUE NOT NULL,    -- 'ARS', 'CHE'
  name           TEXT NOT NULL,           -- 'Arsenal'
  color_primary  TEXT NOT NULL,           -- '#C0002B'
  color_accent   TEXT NOT NULL,           -- np. '#F5C400'
  league_id      INT NOT NULL REFERENCES leagues(id) ON UPDATE CASCADE
);

-- Players (FK do clubs/nations/positions)
CREATE TABLE IF NOT EXISTS players (
  player_id      TEXT PRIMARY KEY,    -- 'martinelli'
  name           TEXT NOT NULL,
  club_id        INT  NOT NULL REFERENCES clubs(id) ON UPDATE CASCADE,
  nation_code    TEXT NOT NULL REFERENCES nations(code) ON UPDATE CASCADE,
  position_code  TEXT NOT NULL REFERENCES positions(code) ON UPDATE CASCADE,
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeksy pomocnicze
CREATE INDEX IF NOT EXISTS idx_players_club   ON players (club_id);
CREATE INDEX IF NOT EXISTS idx_players_pos    ON players (position_code);
CREATE INDEX IF NOT EXISTS idx_players_nation ON players (nation_code);

-- ===== Seed (idempotentny) =====

-- nations (z flag_url) – upsert
INSERT INTO nations(code, name, flag_url) VALUES
  ('BR','Brazil','brazil.png'),
  ('UA','Ukraine','ukraine.png')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    flag_url = EXCLUDED.flag_url;

-- leagues
INSERT INTO leagues(code, name) VALUES
  ('EPL','Premier League')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- positions
INSERT INTO positions(code, name, sort_order) VALUES
  ('LW','Left Winger', 50)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

-- clubs (kolory + liga EPL)
WITH l AS ( SELECT id FROM leagues WHERE code='EPL' )
INSERT INTO clubs(code, name, color_primary, color_accent, league_id) VALUES
  ('ARS','Arsenal','#C0002B','#F5C400',(SELECT id FROM l)),
  ('CHE','Chelsea','#034694','#DBA111',(SELECT id FROM l))
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    color_primary = EXCLUDED.color_primary,
    color_accent = EXCLUDED.color_accent,
    league_id = EXCLUDED.league_id;

-- players
WITH c AS ( SELECT id, code FROM clubs )
INSERT INTO players(player_id, name, club_id, nation_code, position_code, avatar_url)
VALUES
  ('martinelli','Gabriel Martinelli',
    (SELECT id FROM c WHERE code='ARS'),'BR','LW','/players/martinelli.png'),
  ('mudryk','Mykhailo Mudryk',
    (SELECT id FROM c WHERE code='CHE'),'UA','LW','/players/mudryk.png')
ON CONFLICT (player_id) DO UPDATE
SET name = EXCLUDED.name,
    club_id = EXCLUDED.club_id,
    nation_code = EXCLUDED.nation_code,
    position_code = EXCLUDED.position_code,
    avatar_url = EXCLUDED.avatar_url;

COMMIT;


-- === Attribute dictionary (schema + seed) ===

CREATE TABLE IF NOT EXISTS attribute_groups (
  code    text PRIMARY KEY,
  name_en text NOT NULL
);

CREATE TABLE IF NOT EXISTS attributes (
  code        text PRIMARY KEY,
  name_en     text NOT NULL,
  group_code  text NOT NULL REFERENCES attribute_groups(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  scope       text NOT NULL DEFAULT 'ALL' CHECK (scope IN ('ALL','OUTFIELD','GK')),
  sort_order  int  NOT NULL DEFAULT 0,
  enabled     boolean NOT NULL DEFAULT true,
  icon_key    text
);

-- Seed groups
INSERT INTO attribute_groups (code, name_en) VALUES
  ('OFFENSE','Offense'),
  ('DEFENSE','Defense'),
  ('TECHNICAL','Technical'),
  ('GOALKEEPING','Goalkeeping'),
  ('PHYSICAL','Physical')
ON CONFLICT (code) DO NOTHING;

-- Seed attributes (upsert)
INSERT INTO attributes (code, name_en, group_code, scope, sort_order, enabled, icon_key) VALUES
  ('PAC','Pace','PHYSICAL','OUTFIELD',10,true,'bolt'),
  ('ACC','Acceleration','PHYSICAL','OUTFIELD',11,true,'dash'),
  ('AGI','Agility','PHYSICAL','ALL',12,true,'curve'),
  ('STR','Strength','PHYSICAL','ALL',13,true,'dumbbell'),
  ('STA','Stamina','PHYSICAL','ALL',14,true,'battery'),

  ('DRI','Dribbling','TECHNICAL','OUTFIELD',20,true,'wand'),
  ('TEC','Technique','TECHNICAL','OUTFIELD',21,true,'sparkles'),
  ('FT','First Touch','TECHNICAL','OUTFIELD',22,true,'target'),
  ('PAS','Passing','TECHNICAL','OUTFIELD',23,true,'ruler'),
  ('VIS','Vision','TECHNICAL','OUTFIELD',24,true,'eye'),

  ('CRO','Crossing','OFFENSE','OUTFIELD',30,true,'arrow-right'),
  ('FIN','Finishing','OFFENSE','OUTFIELD',31,true,'bullseye'),
  ('LON','Long Shots','OFFENSE','OUTFIELD',32,true,'dot'),
  ('HEA','Heading','OFFENSE','OUTFIELD',33,true,'chevron-up'),

  ('TCK','Tackling','DEFENSE','OUTFIELD',40,true,'shield'),
  ('MAR','Marking','DEFENSE','OUTFIELD',41,true,'lock'),
  ('POS','Positioning','DEFENSE','ALL',42,true,'map'),
  ('INT','Interceptions','DEFENSE','OUTFIELD',43,true,'scissors'),

  ('HAN','Handling','GOALKEEPING','GK',50,true,'hand'),
  ('REF','Reflexes','GOALKEEPING','GK',51,true,'zap'),
  ('ONE','One on Ones','GOALKEEPING','GK',52,true,'user'),
  ('KIC','Kicking','GOALKEEPING','GK',53,true,'foot')
ON CONFLICT (code) DO UPDATE
SET name_en   = EXCLUDED.name_en,
    group_code= EXCLUDED.group_code,
    scope     = EXCLUDED.scope,
    sort_order= EXCLUDED.sort_order,
    enabled   = EXCLUDED.enabled,
    icon_key  = EXCLUDED.icon_key;
