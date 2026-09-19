ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS confidence INTEGER
  CHECK (confidence IS NULL OR (confidence BETWEEN 1 AND 5));