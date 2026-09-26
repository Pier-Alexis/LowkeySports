-- v2 bis : aligne `lowkey_is_placeholder_team` sur `isPlaceholderTeam`.
--
-- La version précédente incluait le motif `t\.?(b|c|a)\.?` qui ne matchait que
-- « TB », « TC » et « TA » : les formes réelles « TBD », « TBA » et « TBC »
-- passaient donc au travers du filtre SQL, alors que le JS les filtrait. La
-- base purgeait d'un côté, l'API filtrait de l'autre.
--
-- ⚠ Les motifs ci-dessous doivent rester identiques, caractère par caractère,
-- à `SQL_TEAM_PATTERNS` (backend/src/utils/placeholder.ts). Le test
-- `placeholder.test.ts` compare les deux listes et échoue à la première
-- divergence.

CREATE OR REPLACE FUNCTION lowkey_is_placeholder_team(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT COALESCE(
        p_name IS NULL
        OR btrim(p_name) = ''
        OR p_name ~* '^\s*(t\.?b\.?d\.?|t\.?b\.?[ac]\.?|t\.?b\.?[dca]\.?\s*(vs?)\s*t\.?b\.?[dca]\.?|unknown|n\s*/?\s*[dca]|-{1,3})\s*$'
        OR p_name ~* 'to\s*-?\s*be\s*(announced|determined|confirmed)|to\s*-?\s*confirmed|(a|à)\s*(d[eé]termin[eé]?r?|confirmer|confirme|venir)'
        OR p_name ~* '^\s*(winner|loser|seed)\s*([a-z0-9]{1,4})?\s*\d*\s*$'
        OR p_name ~* '^\s*\d*(st|nd|rd|th)\s*(best|worst)?\s*seed\s*$'
        OR p_name ~* '^\s*(r1|round\s*1|premier(\s*tour)?)\s*(leg)?\s*\d*\s*$',
        TRUE
    )
$$;

COMMENT ON FUNCTION lowkey_is_placeholder_team(TEXT) IS
    'Aligné sur isPlaceholderTeam (JS) : TBD/TBA/TBC, formes longues, N/D, libellés de tableau.';

-- La purge de la 010 a tourné avec la fonction incomplète : on la rejoue pour
-- rattraper les lignes « TBD » qui étaient restées en base.
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

-- La vue doit être redéfinie : elle freeze le résultat de la fonction de 010.
CREATE OR REPLACE VIEW lowkey_visible_matches
AS
SELECT *
FROM matches
WHERE NOT (lowkey_is_placeholder_team(home_team) OR lowkey_is_placeholder_team(away_team));
