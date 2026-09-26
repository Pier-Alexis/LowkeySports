-- v2 : score pondéré par la confiance, colonne FlashScore, purge des
-- matchs dont une équipe n'est pas encore connue.

-- ---------------------------------------------------------------------------
-- 1. Barème de points, source de vérité unique côté base.
--    Les cinq endroits qui calculaient « CASE WHEN pick = winner THEN 1 »
--    appellent désormais cette fonction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lowkey_points(p_pick TEXT, p_winner TEXT, p_confidence INT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN p_pick IS DISTINCT FROM p_winner THEN 0
        WHEN COALESCE(p_confidence, 2) <= 3 THEN 0.5
        WHEN COALESCE(p_confidence, 2) = 4 THEN 1
        ELSE 2
    END
$$;

COMMENT ON FUNCTION lowkey_points(TEXT, TEXT, INT) IS
    'Barème v2 : 0,5 pt si confiance <= 3, 1 pt si 4, 2 pts si 5, 0 sinon.';

-- ---------------------------------------------------------------------------
-- 2. Confiance sur les pronostics des membres.
-- ---------------------------------------------------------------------------
ALTER TABLE predictions
    ADD COLUMN IF NOT EXISTS confidence INT
    CHECK (confidence IS NULL OR confidence BETWEEN 1 AND 5);

UPDATE predictions SET confidence = 2 WHERE confidence IS NULL;

ALTER TABLE predictions ALTER COLUMN confidence SET DEFAULT 2;

-- `points` passe de INT (0..1) à NUMERIC (0..2) : les demi-points et les
-- doublons ne tiennent plus dans le CHECK d'origine.
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_points_check;
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_points_max_check;
ALTER TABLE predictions
    ALTER COLUMN points TYPE NUMERIC(4, 1) USING points::NUMERIC;
ALTER TABLE predictions
    ADD CONSTRAINT predictions_points_check CHECK (points >= 0 AND points <= 2);

-- Recalcul des points existants au nouveau barème : un match terminé avec
-- l'ancien barème est remis au goût du jour.
UPDATE predictions p
SET points = lowkey_points(p.pick, m.winner, p.confidence)
FROM matches m
WHERE m.id = p.match_id
  AND m.status = 'finished'
  AND m.winner IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Lien FlashScore.
--
-- FlashScore n'expose aucune API et refuse l'iframe : on ne peut donc pas
-- générer une URL par match de façon fiable (elles exigent des IDs internes).
-- On stocke une URL dans le champ, renseignée par l'import ou saisie par un
-- admin, avec repli sur la page-hub de la compétition.
-- ---------------------------------------------------------------------------
ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS flashscore_url VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_matches_flashscore
    ON matches (flashscore_url)
    WHERE flashscore_url IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Purge des matchs « TBD vs TBD ».
--    Le filtre est aussi ajouté à toutes les requêtes de lecture, mais les
--    lignes déjà en base ne partent pas toutes seules.
-- ---------------------------------------------------------------------------
-- Doit rester équivalente à `isPlaceholderTeam` (backend/src/utils/placeholder.ts).
-- Les quatre motifs sont ceux du fragment `NOT_PLACEHOLDER_TEAMS_SQL`.
CREATE OR REPLACE FUNCTION lowkey_is_placeholder_team(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT COALESCE(
        p_name IS NULL
        OR btrim(p_name) = ''
        OR p_name ~* '^\s*(t\.?(b|c|a)\.?|t\.b\.d|to\s*be\s*(announced|determined|confirmed)|a\s*(determiner|confirmer|venir)|unknown|n/?[dc]|n/?a|-{1,3})\s*$'
        OR p_name ~* '^\s*(winner|loser|seed)\s*([a-z0-9]{1,4})?\s*\d*\s*$'
        OR p_name ~* '^\s*\d*(st|nd|rd|th)\s*(best|worst)?\s*seed\s*$'
        OR p_name ~* '^\s*(r1|round\s*1|premier(\s*tour)?)\s*(leg)?\s*\d*\s*$',
        TRUE
    )
$$;

-- Suppression en cascade des pronostics et analyses rattachés : le CHECK
-- `predictions_points_check` et les jointures articles/matches l'exigeraient.
DELETE FROM predictions
WHERE match_id IN (
    SELECT id FROM matches
    WHERE lowkey_is_placeholder_team(home_team) OR lowkey_is_placeholder_team(away_team)
);

DELETE FROM articles
WHERE match_id IN (
    SELECT id FROM matches
    WHERE lowkey_is_placeholder_team(home_team) OR lowkey_is_placeholder_team(away_team)
);

DELETE FROM matches
WHERE lowkey_is_placeholder_team(home_team) OR lowkey_is_placeholder_team(away_team);

-- Filtre de lecture, à reprendre dans les SELECT applicatifs.
CREATE OR REPLACE VIEW lowkey_visible_matches
AS
SELECT *
FROM matches
WHERE NOT (lowkey_is_placeholder_team(home_team) OR lowkey_is_placeholder_team(away_team));
