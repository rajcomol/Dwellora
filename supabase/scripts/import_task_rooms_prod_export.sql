-- =============================================================================
-- STAP 1 — PREVIEW: selecteer en run ALLEEN dit blok (tot de volgende streep)
-- =============================================================================

WITH prod_links (title, ruimte, sort_key) AS (
  VALUES
    ('Electra', 'Hal beneden', 1),
    ('Meterkast vervangen', 'Hal beneden', 2),
    ('Trap renovatie', 'Hal beneden', 3),
    ('Deur + kozijn badkamer plaatsen', 'Hal boven', 4),
    ('Electra', 'Hal boven', 5),
    ('Vloer eruit halen', 'Hal boven', 6),
    ('Deur + kozijn plaatsen', 'Kledingkamer', 7),
    ('Electra', 'Kledingkamer', 8),
    ('kledingkast', 'Kledingkamer', 9),
    ('Vloer eruit halen', 'Kledingkamer', 10),
    ('Dakkapel plaatsen', 'Master bedroom', 11),
    ('Deur + kozijn plaatsen', 'Master bedroom', 12),
    ('Electra', 'Master bedroom', 13),
    ('Na plaatsen dakkapel, muur renoveren', 'Master bedroom', 14),
    ('Spotjes maken in de dakkapel', 'Master bedroom', 15),
    ('Vensterbank maken', 'Master bedroom', 16),
    ('Vloer eruit halen', 'Master bedroom', 17),
    ('Electra kosten', 'Wc beneden', 18),
    ('Slopen wc', 'Wc beneden', 19),
    ('Wc deur + kozijn plaatsen', 'Wc beneden', 20),
    ('Wc opbouwen', 'Wc beneden', 21),
    ('Deur + kozijn plaatsen', 'Werkkamer', 22),
    ('Electra', 'Werkkamer', 23),
    ('Spotjes in de dakkapel maken', 'Werkkamer', 24),
    ('Vensterbank maken', 'Werkkamer', 25),
    ('Vloer eruit halen', 'Werkkamer', 26),
    ('Cement dekvloer moet gestort worden', 'Woonkamer', 27),
    ('Electra', 'Woonkamer', 28),
    ('Electra frezen', 'Woonkamer', 29),
    ('Kozijnen in de woonkamer', 'Woonkamer', 30),
    ('Plinten leggen', 'Woonkamer', 31),
    ('Stalen deur plaatsen', 'Woonkamer', 32),
    ('Tegels leggen', 'Woonkamer', 33),
    ('trap bekleding er af slopen', 'Woonkamer', 34),
    ('TV muur maken', 'Woonkamer', 35),
    ('verlaagd plafond maken', 'Woonkamer', 36),
    ('Vloer moet er uit', 'Woonkamer', 37),
    ('Vloerverwarming moet gelegd worden.', 'Woonkamer', 38),
    ('Dakkapellen plaatsen', 'Zolder', 39),
    ('Deur + kozijn plaatsen', 'Zolder', 40),
    ('Electra', 'Zolder', 41),
    ('Knieschotten maken', 'Zolder', 42),
    ('Na plaatsen Dakkapellen, muur renoveren', 'Zolder', 43),
    ('Vensterbank maken', 'Zolder', 44),
    ('Vloer eruit halen', 'Zolder', 45)
),
project_scope AS (
  SELECT id FROM public.projects
  WHERE name ILIKE '%raj%' OR name ILIKE '%fe%'
),
resolved AS (
  SELECT DISTINCT ON (pl.sort_key)
    pl.title,
    pl.ruimte,
    t.id AS task_id,
    r.id AS room_id,
    pl.sort_key
  FROM prod_links pl
  JOIN public.rooms r ON r.name = pl.ruimte AND r.project_id IN (SELECT id FROM project_scope)
  JOIN public.tasks t ON t.title = pl.title AND t.project_id = r.project_id
  WHERE NOT EXISTS (SELECT 1 FROM public.task_rooms tr WHERE tr.task_id = t.id)
  ORDER BY pl.sort_key, t.sort_order NULLS LAST, t.id
)
SELECT
  title,
  ruimte,
  task_id,
  room_id,
  CASE WHEN task_id IS NULL THEN 'mislukt' ELSE 'ok' END AS status
FROM resolved
ORDER BY sort_key;

-- =============================================================================
-- STAP 2 — IMPORT: selecteer en run DIT HELE BLOK (WITH + INSERT samen!)
-- =============================================================================

WITH prod_links (title, ruimte, sort_key) AS (
  VALUES
    ('Electra', 'Hal beneden', 1),
    ('Meterkast vervangen', 'Hal beneden', 2),
    ('Trap renovatie', 'Hal beneden', 3),
    ('Deur + kozijn badkamer plaatsen', 'Hal boven', 4),
    ('Electra', 'Hal boven', 5),
    ('Vloer eruit halen', 'Hal boven', 6),
    ('Deur + kozijn plaatsen', 'Kledingkamer', 7),
    ('Electra', 'Kledingkamer', 8),
    ('kledingkast', 'Kledingkamer', 9),
    ('Vloer eruit halen', 'Kledingkamer', 10),
    ('Dakkapel plaatsen', 'Master bedroom', 11),
    ('Deur + kozijn plaatsen', 'Master bedroom', 12),
    ('Electra', 'Master bedroom', 13),
    ('Na plaatsen dakkapel, muur renoveren', 'Master bedroom', 14),
    ('Spotjes maken in de dakkapel', 'Master bedroom', 15),
    ('Vensterbank maken', 'Master bedroom', 16),
    ('Vloer eruit halen', 'Master bedroom', 17),
    ('Electra kosten', 'Wc beneden', 18),
    ('Slopen wc', 'Wc beneden', 19),
    ('Wc deur + kozijn plaatsen', 'Wc beneden', 20),
    ('Wc opbouwen', 'Wc beneden', 21),
    ('Deur + kozijn plaatsen', 'Werkkamer', 22),
    ('Electra', 'Werkkamer', 23),
    ('Spotjes in de dakkapel maken', 'Werkkamer', 24),
    ('Vensterbank maken', 'Werkkamer', 25),
    ('Vloer eruit halen', 'Werkkamer', 26),
    ('Cement dekvloer moet gestort worden', 'Woonkamer', 27),
    ('Electra', 'Woonkamer', 28),
    ('Electra frezen', 'Woonkamer', 29),
    ('Kozijnen in de woonkamer', 'Woonkamer', 30),
    ('Plinten leggen', 'Woonkamer', 31),
    ('Stalen deur plaatsen', 'Woonkamer', 32),
    ('Tegels leggen', 'Woonkamer', 33),
    ('trap bekleding er af slopen', 'Woonkamer', 34),
    ('TV muur maken', 'Woonkamer', 35),
    ('verlaagd plafond maken', 'Woonkamer', 36),
    ('Vloer moet er uit', 'Woonkamer', 37),
    ('Vloerverwarming moet gelegd worden.', 'Woonkamer', 38),
    ('Dakkapellen plaatsen', 'Zolder', 39),
    ('Deur + kozijn plaatsen', 'Zolder', 40),
    ('Electra', 'Zolder', 41),
    ('Knieschotten maken', 'Zolder', 42),
    ('Na plaatsen Dakkapellen, muur renoveren', 'Zolder', 43),
    ('Vensterbank maken', 'Zolder', 44),
    ('Vloer eruit halen', 'Zolder', 45)
),
project_scope AS (
  SELECT id FROM public.projects
  WHERE name ILIKE '%raj%' OR name ILIKE '%fe%'
),
resolved AS (
  SELECT DISTINCT ON (pl.sort_key)
    t.id AS task_id,
    r.id AS room_id
  FROM prod_links pl
  JOIN public.rooms r ON r.name = pl.ruimte AND r.project_id IN (SELECT id FROM project_scope)
  JOIN public.tasks t ON t.title = pl.title AND t.project_id = r.project_id
  WHERE NOT EXISTS (SELECT 1 FROM public.task_rooms tr WHERE tr.task_id = t.id)
  ORDER BY pl.sort_key, t.sort_order NULLS LAST, t.id
)
INSERT INTO public.task_rooms (task_id, room_id)
SELECT task_id, room_id
FROM resolved
WHERE task_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STAP 3 — CONTROLE: apart runnen
-- =============================================================================

SELECT r.name AS ruimte, count(tr.task_id)::int AS taken
FROM public.rooms r
JOIN public.projects p ON p.id = r.project_id
LEFT JOIN public.task_rooms tr ON tr.room_id = r.id
WHERE p.name ILIKE '%raj%' OR p.name ILIKE '%fe%'
GROUP BY r.id, r.name
ORDER BY r.name;
