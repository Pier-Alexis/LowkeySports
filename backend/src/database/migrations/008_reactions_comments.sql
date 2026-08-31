CREATE TABLE IF NOT EXISTS article_reactions (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('like', 'dislike')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, user_id)
);

CREATE TABLE IF NOT EXISTS article_comments (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_comments_article_id ON article_comments(article_id);
