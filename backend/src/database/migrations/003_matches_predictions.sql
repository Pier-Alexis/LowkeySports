CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  sport VARCHAR(100) NOT NULL,
  competition VARCHAR(150),
  home_team VARCHAR(150) NOT NULL,
  away_team VARCHAR(150) NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled')),
  home_score INTEGER CHECK (home_score IS NULL OR home_score >= 0),
  away_score INTEGER CHECK (away_score IS NULL OR away_score >= 0),
  winner VARCHAR(10)
    CHECK (winner IS NULL OR winner IN ('home', 'away', 'draw')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK ((home_score IS NULL) = (away_score IS NULL)),
  CHECK (status <> 'finished' OR (home_score IS NOT NULL AND away_score IS NOT NULL AND winner IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_matches_status_scheduled_at ON matches(status, scheduled_at);

CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  pick VARCHAR(10) NOT NULL CHECK (pick IN ('home', 'away', 'draw')),
  points INTEGER NOT NULL DEFAULT 0 CHECK (points BETWEEN 0 AND 1),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);