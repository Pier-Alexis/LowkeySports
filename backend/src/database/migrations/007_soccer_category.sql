-- Le football (soccer) est renommé en « soccer » ; le football américain NBA/NFL
-- devient une catégorie séparée. On reclassifie les anciens matchs de foot (soccer).
UPDATE matches SET sport = 'soccer' WHERE sport = 'football';
