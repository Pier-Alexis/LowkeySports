ALTER TABLE matches ADD COLUMN IF NOT EXISTS provider VARCHAR(50);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS provider_event_id VARCHAR(100);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_team_logo VARCHAR(500);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_team_logo VARCHAR(500);

CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_provider_event
  ON matches(provider, provider_event_id);

CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  pick VARCHAR(10) NOT NULL CHECK (pick IN ('home', 'away', 'draw')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status, published_at);
CREATE INDEX IF NOT EXISTS idx_articles_match_id ON articles(match_id);