-- ============================================================
-- SEED: Test_Data Synthetic Data for Weight Loss App
-- Target: TEST_DATA Supabase project ONLY
-- Generated for: 2026-06-24 to 2026-08-22 (60 days)
-- 
-- SAFETY:
--   - Uses INSERT ... ON CONFLICT DO NOTHING throughout
--   - No TRUNCATE, no DROP, no DELETE
--   - Idempotent: safe to run multiple times
--   - Foods/recipes use unique name guards
--   - Does NOT touch production
-- ============================================================

-- ============================================================
-- SECTION 1: FOODS (15 foods, per-100g nutritional values)
-- Idempotent: ON CONFLICT (name) DO NOTHING
-- Assumes foods table has a unique constraint on name column.
-- ============================================================

INSERT INTO foods (name, calories_kcal, protein_g, carbohydrates_g, fat_g, fiber_g, saturated_fat_g, sodium_mg, potassium_mg, calcium_mg, iron_mg, magnesium_mg, zinc_mg, vitamin_c_mg, vitamin_d_ug, vitamin_b12_ug, folate_ug)
VALUES
  ('Chicken Breast (cooked)',   165, 31.0, 0.0,  3.6, 0.0, 1.0,  74,  256, 15, 1.0, 29, 1.0, 0.0, 0.1, 0.3,  4.0),
  ('Brown Rice (cooked)',       112,  2.3, 23.5, 0.9, 1.8, 0.2,   5,  79,  10, 0.5, 39, 0.6, 0.0, 0.0, 0.0,  7.6),
  ('Whole Egg',                 143,  12.6, 0.7, 9.5, 0.0, 3.1, 142, 138,  56, 1.8, 12, 1.1, 0.0, 2.0, 0.9, 47.0),
  ('Greek Yogurt (plain)',       59,  10.0, 3.6, 0.4, 0.0, 0.1,  36, 141, 111, 0.1, 11, 0.5, 0.0, 0.0, 0.7,  7.0),
  ('Banana',                     89,  1.1, 22.8, 0.3, 2.6, 0.1,   1, 358,  5,  0.3, 27, 0.2, 8.7, 0.0, 0.0, 20.0),
  ('Broccoli (steamed)',         35,  2.4,  7.2, 0.4, 2.6, 0.1,  41, 316,  47, 0.7, 21, 0.4, 64.9, 0.0, 0.0, 63.0),
  ('Oats (dry)',                389,  17.0, 66.3, 7.0, 10.6, 1.4,  2, 429,  54, 4.7, 177, 4.0, 0.0, 0.0, 0.0, 56.0),
  ('Almonds',                   579,  21.2, 21.6, 49.9, 12.5, 3.8,  1, 733, 264, 3.7, 270, 3.1, 0.0, 0.0, 0.0, 44.0),
  ('Salmon (grilled)',          206,  20.4, 0.0, 13.4, 0.0, 3.1,  59, 363,  13, 0.8, 32, 0.6, 0.0, 11.1, 3.2,  5.0),
  ('Sweet Potato (baked)',       86,  1.6, 20.1, 0.1, 3.0, 0.0,  55, 337,  38, 0.6, 27, 0.3, 19.6, 0.0, 0.0, 11.0),
  ('Spinach (raw)',               23,  2.9,  3.6, 0.4, 2.2, 0.1,  79, 558,  99, 2.7, 79, 0.5, 28.1, 0.0, 0.0, 194.0),
  ('Apple',                      52,  0.3, 13.8, 0.2, 2.4, 0.0,   1, 107,   6, 0.1, 5,  0.0, 4.6, 0.0, 0.0,  3.0),
  ('Whey Protein Powder',       400,  80.0, 8.0,  7.0, 0.0, 4.0, 200, 520, 120, 1.0, 50, 2.0, 0.0, 0.0, 1.2,  0.0),
  ('Paneer (cottage cheese)',   265,  18.3, 3.4, 20.8, 0.0, 13.1, 39, 98,  480, 0.5, 8,  1.6, 0.0, 0.3, 0.6,  7.0),
  ('Whole Wheat Roti',          297,  10.9, 55.8, 3.7, 8.7, 0.6, 414, 287,  34, 3.9, 138, 2.7, 0.0, 0.0, 0.0, 34.0)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SECTION 2: RECIPES (5 recipes)
-- Idempotent: ON CONFLICT (name) DO NOTHING
-- Assumes recipes table has a unique constraint on name column.
-- ============================================================

INSERT INTO recipes (name, servings)
VALUES
  ('Chicken & Broccoli Bowl',    2),
  ('Oats & Banana Breakfast',    1),
  ('Salmon with Sweet Potato',   2),
  ('Spinach & Paneer Stir-Fry',  2),
  ('Protein Smoothie',           1)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SECTION 3: RECIPE INGREDIENTS
-- Uses subqueries to resolve food/recipe IDs by name.
-- Idempotent: ON CONFLICT DO NOTHING (requires unique on recipe_id+food_id).
-- ============================================================

INSERT INTO recipe_ingredients (recipe_id, food_id, quantity_g)
SELECT r.id, f.id, ing.qty
FROM (VALUES
  ('Chicken & Broccoli Bowl', 'Chicken Breast (cooked)', 200.0),
  ('Chicken & Broccoli Bowl', 'Broccoli (steamed)',      150.0),
  ('Chicken & Broccoli Bowl', 'Brown Rice (cooked)',     180.0),
  ('Oats & Banana Breakfast', 'Oats (dry)',               80.0),
  ('Oats & Banana Breakfast', 'Banana',                 100.0),
  ('Oats & Banana Breakfast', 'Greek Yogurt (plain)',   150.0),
  ('Salmon with Sweet Potato','Salmon (grilled)',        180.0),
  ('Salmon with Sweet Potato','Sweet Potato (baked)',   200.0),
  ('Spinach & Paneer Stir-Fry','Paneer (cottage cheese)',150.0),
  ('Spinach & Paneer Stir-Fry','Spinach (raw)',          100.0),
  ('Protein Smoothie',         'Whey Protein Powder',    30.0),
  ('Protein Smoothie',         'Banana',                100.0),
  ('Protein Smoothie',         'Greek Yogurt (plain)',  200.0)
) AS ing(recipe_name, food_name, qty)
JOIN recipes r ON r.name = ing.recipe_name
JOIN foods   f ON f.name = ing.food_name
ON CONFLICT (recipe_id, food_id) DO NOTHING;

-- ============================================================
-- SECTION 4: DAILY LOGS (60 days: 2026-06-24 to 2026-08-22)
-- 
-- Design (matching analytcs thresholds):
--   - Weight: starts ~103 kg, drops ~2.5 kg over 60 days with ±0.5 kg noise
--   - Steps: avg ~8,500/day with ±3,000 variation; ~5 days/60 with no step data
--   - Water_glasses: 6-10 on good days, 3-4 on poor days (~15% poor days)
--   - meal_status: ~70% clean, ~28% cheat, ~2% days NULL (not logged)
--   - mood: ~50% good, ~30% neutral, ~20% bad
--   - weight_before/after_toilet: present on ~50% of days (±0.4 kg difference)
-- 
-- Idempotent: ON CONFLICT (log_date) DO NOTHING
-- ============================================================

INSERT INTO daily_logs (log_date, weight_kg, steps, water_glasses, meal_status, mood, weight_before_toilet, weight_after_toilet)
VALUES
  ('2026-06-24', 103.2, 7800,  8, 'clean',  'good',    103.6, 103.2),
  ('2026-06-25', 103.0, 9200,  7, 'clean',  'good',    NULL,  NULL ),
  ('2026-06-26', 103.4,  6500, 4, 'cheat',  'neutral', 103.8, 103.4),
  ('2026-06-27', 103.1, 10100, 9, 'clean',  'good',    103.5, 103.1),
  ('2026-06-28', 102.9, 8800,  8, 'clean',  'good',    103.3, 102.9),
  ('2026-06-29', 103.3,  NULL, 3, 'cheat',  'bad',     NULL,  NULL ),
  ('2026-06-30', 103.0, 7600,  7, 'clean',  'neutral', 103.4, 103.0),

  ('2026-07-01', 102.8, 9400,  9, 'clean',  'good',    103.2, 102.8),
  ('2026-07-02', 102.6, 8100,  8, 'clean',  'good',    NULL,  NULL ),
  ('2026-07-03', 102.9,  5200, 4, 'cheat',  'neutral', 103.3, 102.9),
  ('2026-07-04', 102.5, 11200, 10,'clean',  'good',    102.9, 102.5),
  ('2026-07-05', 102.3, 9600,  9, 'clean',  'good',    102.7, 102.3),
  ('2026-07-06', 102.7,  NULL, 3, 'cheat',  'bad',     NULL,  NULL ),
  ('2026-07-07', 102.4, 8300,  7, 'clean',  'neutral', 102.8, 102.4),

  ('2026-07-08', 102.2, 9700,  8, 'clean',  'good',    102.6, 102.2),
  ('2026-07-09', 102.0, 7900,  9, 'clean',  'good',    NULL,  NULL ),
  ('2026-07-10', 102.4,  6100, 4, 'cheat',  'bad',     102.8, 102.4),
  ('2026-07-11', 102.1, 10500, 8, 'clean',  'neutral', 102.5, 102.1),
  ('2026-07-12', 101.9, 9100,  9, 'clean',  'good',    102.3, 101.9),
  ('2026-07-13', 102.2, 7200,  7, 'clean',  'neutral', NULL,  NULL ),
  ('2026-07-14', 101.8, 8700,  6, 'clean',  'good',    102.2, 101.8),

  ('2026-07-15', 101.6, 9900,  9, 'clean',  'good',    102.0, 101.6),
  ('2026-07-16', 101.9,  4800, 3, 'cheat',  'bad',     102.3, 101.9),
  ('2026-07-17', 101.5, 10200, 8, 'clean',  'good',    NULL,  NULL ),
  ('2026-07-18', 101.3, 9300,  9, 'clean',  'good',    101.7, 101.3),
  ('2026-07-19', 101.6,  6700, 4, 'cheat',  'neutral', 102.0, 101.6),
  ('2026-07-20', 101.2, 8900,  8, 'clean',  'good',    101.6, 101.2),
  ('2026-07-21', 101.0, 11400, 10,'clean',  'good',    101.4, 101.0),

  ('2026-07-22', 101.3,  NULL, 3, 'cheat',  'bad',     NULL,  NULL ),
  ('2026-07-23', 100.9, 8600,  8, 'clean',  'neutral', 101.3, 100.9),
  ('2026-07-24', 100.7, 9800,  9, 'clean',  'good',    NULL,  NULL ),
  ('2026-07-25', 101.0,  5900, 4, 'cheat',  'neutral', 101.4, 101.0),
  ('2026-07-26', 100.6, 10100, 9, 'clean',  'good',    101.0, 100.6),
  ('2026-07-27', 100.4, 8400,  8, 'clean',  'good',    100.8, 100.4),
  ('2026-07-28', 100.7,  7300, 7, 'clean',  'neutral', NULL,  NULL ),

  ('2026-07-29', 100.3, 9600,  9, 'clean',  'good',    100.7, 100.3),
  ('2026-07-30', 100.1, 10300, 8, 'clean',  'good',    100.5, 100.1),
  ('2026-07-31', 100.5,  4900, 3, 'cheat',  'bad',     100.9, 100.5),

  ('2026-08-01', 100.2, 9200,  8, 'clean',  'good',    NULL,  NULL ),
  ('2026-08-02',  99.9, 10800, 9, 'clean',  'good',    100.3,  99.9),
  ('2026-08-03', 100.2,  6300, 4, 'cheat',  'neutral', 100.6, 100.2),
  ('2026-08-04',  99.8, 9700,  9, 'clean',  'good',    100.2,  99.8),
  ('2026-08-05',  99.5, 11100, 10,'clean',  'good',     99.9,  99.5),
  ('2026-08-06',  99.8,  NULL, 3, 'cheat',  'bad',     NULL,  NULL ),
  ('2026-08-07',  99.4, 8800,  8, 'clean',  'neutral',  99.8,  99.4),

  ('2026-08-08',  99.2, 9500,  9, 'clean',  'good',    NULL,  NULL ),
  ('2026-08-09',  99.5,  7100, 4, 'cheat',  'bad',      99.9,  99.5),
  ('2026-08-10',  99.1, 10200, 8, 'clean',  'good',     99.5,  99.1),
  ('2026-08-11',  98.9, 9900,  9, 'clean',  'good',    NULL,  NULL ),
  ('2026-08-12',  99.2,  5800, 4, 'cheat',  'neutral',  99.6,  99.2),
  ('2026-08-13',  98.8, 10400, 8, 'clean',  'good',     99.2,  98.8),
  ('2026-08-14',  98.6, 11200, 10,'clean',  'good',    NULL,  NULL ),

  ('2026-08-15',  98.9,  4700, 3, 'cheat',  'bad',      99.3,  98.9),
  ('2026-08-16',  98.5, 9300,  8, 'clean',  'good',    NULL,  NULL ),
  ('2026-08-17',  98.3, 10600, 9, 'clean',  'good',     98.7,  98.3),
  ('2026-08-18',  98.6,  6400, 4, 'cheat',  'neutral',  99.0,  98.6),
  ('2026-08-19',  98.2, 9800,  9, 'clean',  'good',    NULL,  NULL ),
  ('2026-08-20',  98.0, 11500, 10,'clean',  'good',     98.4,  98.0),
  ('2026-08-21',  98.3,  7600, 6, 'clean',  'neutral',  98.7,  98.3),
  ('2026-08-22',  97.8, 9200,  8, 'clean',  'good',    NULL,  NULL )
ON CONFLICT (log_date) DO NOTHING;

-- ============================================================
-- SECTION 5: BODY MEASUREMENTS (6 checkpoints across 60 days)
-- Idempotent: INSERT … WHERE NOT EXISTS per checkpoint date.
-- Does NOT rely on any UNIQUE constraint on measurement_date.
-- Safe with a plain bigint PRIMARY KEY on id only.
-- ============================================================

INSERT INTO body_measurements (measurement_date, neck_cm, chest_cm, waist_cm, abdomen_cm, hip_cm, thigh_cm, upper_arm_cm)
SELECT '2026-06-24'::date, 39.0, 108.0, 101.0, 107.0, 115.0, 64.0, 36.0
WHERE NOT EXISTS (SELECT 1 FROM body_measurements WHERE measurement_date = '2026-06-24'::date);

INSERT INTO body_measurements (measurement_date, neck_cm, chest_cm, waist_cm, abdomen_cm, hip_cm, thigh_cm, upper_arm_cm)
SELECT '2026-07-01'::date, 38.8, 107.2, 100.0, 106.0, 114.2, 63.4, 35.7
WHERE NOT EXISTS (SELECT 1 FROM body_measurements WHERE measurement_date = '2026-07-01'::date);

INSERT INTO body_measurements (measurement_date, neck_cm, chest_cm, waist_cm, abdomen_cm, hip_cm, thigh_cm, upper_arm_cm)
SELECT '2026-07-08'::date, 38.6, 106.5,  98.8, 104.8, 113.5, 62.8, 35.3
WHERE NOT EXISTS (SELECT 1 FROM body_measurements WHERE measurement_date = '2026-07-08'::date);

INSERT INTO body_measurements (measurement_date, neck_cm, chest_cm, waist_cm, abdomen_cm, hip_cm, thigh_cm, upper_arm_cm)
SELECT '2026-07-22'::date, 38.4, 105.8,  97.5, 103.5, 112.6, 62.1, 35.0
WHERE NOT EXISTS (SELECT 1 FROM body_measurements WHERE measurement_date = '2026-07-22'::date);

INSERT INTO body_measurements (measurement_date, neck_cm, chest_cm, waist_cm, abdomen_cm, hip_cm, thigh_cm, upper_arm_cm)
SELECT '2026-08-05'::date, 38.2, 105.0,  96.0, 102.0, 111.5, 61.5, 34.6
WHERE NOT EXISTS (SELECT 1 FROM body_measurements WHERE measurement_date = '2026-08-05'::date);

INSERT INTO body_measurements (measurement_date, neck_cm, chest_cm, waist_cm, abdomen_cm, hip_cm, thigh_cm, upper_arm_cm)
SELECT '2026-08-22'::date, 38.0, 104.2,  94.5, 100.5, 110.4, 60.8, 34.2
WHERE NOT EXISTS (SELECT 1 FROM body_measurements WHERE measurement_date = '2026-08-22'::date);

-- ============================================================
-- SECTION 6: DAILY FOOD ENTRIES
-- 
-- Strategy: seed food entries for ~40 of the 60 days (realistic logging).
-- Uses both direct foods and recipes.
-- Meal types: 'breakfast', 'lunch', 'dinner', 'snack'
-- 
-- Nutrition resolution (matching nutritionAnalytics.ts):
--   - Direct food: nutrient = food_value * (quantity_g / 100)
--   - Recipe: nutrient = sum(ingredient_value * quantity_g/100) * (servings / recipe.servings)
-- 
-- Idempotent: each day's entries are inserted via DO NOTHING
-- Note: ON CONFLICT requires a unique constraint on (daily_log_id, food_id, recipe_id, meal_type)
--       or similar. If no such constraint exists, use the CTE guard below which
--       checks for existing entries before inserting.
-- ============================================================

DO $$
DECLARE
  v_log_id      INTEGER;
  v_food_id     INTEGER;
  v_recipe_id   INTEGER;

  -- Food ID shortcuts
  f_chicken     INTEGER;
  f_rice        INTEGER;
  f_egg         INTEGER;
  f_yogurt      INTEGER;
  f_banana      INTEGER;
  f_broccoli    INTEGER;
  f_oats        INTEGER;
  f_almonds     INTEGER;
  f_salmon      INTEGER;
  f_sweetpotato INTEGER;
  f_spinach     INTEGER;
  f_apple       INTEGER;
  f_whey        INTEGER;
  f_paneer      INTEGER;
  f_roti        INTEGER;

  -- Recipe ID shortcuts
  r_chicken_bowl INTEGER;
  r_oats_banana  INTEGER;
  r_salmon_sp    INTEGER;
  r_paneer_spin  INTEGER;
  r_smoothie     INTEGER;

BEGIN
  -- Resolve all food IDs
  SELECT id INTO f_chicken     FROM foods WHERE name = 'Chicken Breast (cooked)';
  SELECT id INTO f_rice        FROM foods WHERE name = 'Brown Rice (cooked)';
  SELECT id INTO f_egg         FROM foods WHERE name = 'Whole Egg';
  SELECT id INTO f_yogurt      FROM foods WHERE name = 'Greek Yogurt (plain)';
  SELECT id INTO f_banana      FROM foods WHERE name = 'Banana';
  SELECT id INTO f_broccoli    FROM foods WHERE name = 'Broccoli (steamed)';
  SELECT id INTO f_oats        FROM foods WHERE name = 'Oats (dry)';
  SELECT id INTO f_almonds     FROM foods WHERE name = 'Almonds';
  SELECT id INTO f_salmon      FROM foods WHERE name = 'Salmon (grilled)';
  SELECT id INTO f_sweetpotato FROM foods WHERE name = 'Sweet Potato (baked)';
  SELECT id INTO f_spinach     FROM foods WHERE name = 'Spinach (raw)';
  SELECT id INTO f_apple       FROM foods WHERE name = 'Apple';
  SELECT id INTO f_whey        FROM foods WHERE name = 'Whey Protein Powder';
  SELECT id INTO f_paneer      FROM foods WHERE name = 'Paneer (cottage cheese)';
  SELECT id INTO f_roti        FROM foods WHERE name = 'Whole Wheat Roti';

  -- Resolve all recipe IDs
  SELECT id INTO r_chicken_bowl FROM recipes WHERE name = 'Chicken & Broccoli Bowl';
  SELECT id INTO r_oats_banana  FROM recipes WHERE name = 'Oats & Banana Breakfast';
  SELECT id INTO r_salmon_sp    FROM recipes WHERE name = 'Salmon with Sweet Potato';
  SELECT id INTO r_paneer_spin  FROM recipes WHERE name = 'Spinach & Paneer Stir-Fry';
  SELECT id INTO r_smoothie     FROM recipes WHERE name = 'Protein Smoothie';

  -- Helper: only insert if no entry already exists for (daily_log_id, meal_type, food_id/recipe_id)
  -- We insert each entry individually with an existence check.
  
  -- ---- WEEK 1 (2026-06-24 to 2026-06-30) ----
  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-06-24';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_oats_banana) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_oats_banana, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_chicken_bowl) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_chicken_bowl, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_almonds) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_almonds, NULL, 'snack', 30, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-06-25';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND food_id = f_egg) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_egg, NULL, 'breakfast', 150, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND food_id = f_chicken) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_chicken, NULL, 'lunch', 200, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'dinner' AND recipe_id = r_salmon_sp) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_salmon_sp, 'dinner', NULL, 1);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-06-27';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_oats_banana) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_oats_banana, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND food_id = f_paneer) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_paneer, NULL, 'lunch', 150, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_apple) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_apple, NULL, 'snack', 150, NULL);
  END IF;

  -- ---- WEEK 2 (2026-07-01 to 2026-07-07) ----
  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-01';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_smoothie) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_smoothie, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_chicken_bowl) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_chicken_bowl, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'dinner' AND food_id = f_roti) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_roti, NULL, 'dinner', 120, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'dinner' AND food_id = f_paneer) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_paneer, NULL, 'dinner', 100, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-02';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND food_id = f_oats) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_oats, NULL, 'breakfast', 80, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_paneer_spin) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_paneer_spin, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_yogurt) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_yogurt, NULL, 'snack', 150, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-04';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_oats_banana) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_oats_banana, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND food_id = f_chicken) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_chicken, NULL, 'lunch', 200, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND food_id = f_rice) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_rice, NULL, 'lunch', 180, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_almonds) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_almonds, NULL, 'snack', 25, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-05';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_smoothie) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_smoothie, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_salmon_sp) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_salmon_sp, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'dinner' AND food_id = f_spinach) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_spinach, NULL, 'dinner', 100, NULL);
  END IF;

  -- ---- WEEK 3 (2026-07-08 to 2026-07-14) ----
  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-08';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND food_id = f_egg) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_egg, NULL, 'breakfast', 200, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_chicken_bowl) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_chicken_bowl, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_banana) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_banana, NULL, 'snack', 120, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-11';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_oats_banana) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_oats_banana, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND food_id = f_roti) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_roti, NULL, 'lunch', 120, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND food_id = f_paneer) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_paneer, NULL, 'lunch', 100, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-14';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_smoothie) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_smoothie, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_paneer_spin) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_paneer_spin, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'dinner' AND food_id = f_salmon) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_salmon, NULL, 'dinner', 180, NULL);
  END IF;

  -- ---- WEEK 4 (2026-07-15 to 2026-07-21) ----
  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-15';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_oats_banana) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_oats_banana, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_chicken_bowl) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_chicken_bowl, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_apple) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_apple, NULL, 'snack', 180, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-17';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND food_id = f_egg) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_egg, NULL, 'breakfast', 150, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND food_id = f_chicken) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_chicken, NULL, 'lunch', 200, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND food_id = f_broccoli) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_broccoli, NULL, 'lunch', 150, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-20';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_smoothie) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_smoothie, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_salmon_sp) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_salmon_sp, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'dinner' AND food_id = f_yogurt) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_yogurt, NULL, 'dinner', 200, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_almonds) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_almonds, NULL, 'snack', 30, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-21';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_oats_banana) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_oats_banana, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_paneer_spin) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_paneer_spin, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'dinner' AND food_id = f_roti) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_roti, NULL, 'dinner', 120, NULL);
  END IF;

  -- ---- WEEK 5 (2026-07-22 to 2026-07-28) ----
  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-23';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_smoothie) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_smoothie, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_chicken_bowl) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_chicken_bowl, 'lunch', NULL, 1);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-26';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND food_id = f_egg) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_egg, NULL, 'breakfast', 200, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_salmon_sp) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_salmon_sp, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_apple) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_apple, NULL, 'snack', 150, NULL);
  END IF;

  -- ---- WEEK 6 (2026-07-29 to 2026-08-04) ----
  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-29';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_oats_banana) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_oats_banana, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND food_id = f_chicken) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_chicken, NULL, 'lunch', 200, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'dinner' AND food_id = f_broccoli) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_broccoli, NULL, 'dinner', 200, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-07-30';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_smoothie) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_smoothie, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_paneer_spin) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_paneer_spin, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_banana) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_banana, NULL, 'snack', 120, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-08-02';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_oats_banana) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_oats_banana, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_chicken_bowl) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_chicken_bowl, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_almonds) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_almonds, NULL, 'snack', 30, NULL);
  END IF;

  -- ---- WEEKS 7-9 (2026-08-05 to 2026-08-22) ----
  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-08-05';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_smoothie) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_smoothie, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_salmon_sp) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_salmon_sp, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'dinner' AND food_id = f_spinach) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_spinach, NULL, 'dinner', 100, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-08-07';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_oats_banana) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_oats_banana, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_paneer_spin) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_paneer_spin, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_apple) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_apple, NULL, 'snack', 150, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-08-10';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND food_id = f_egg) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_egg, NULL, 'breakfast', 150, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_chicken_bowl) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_chicken_bowl, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_yogurt) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_yogurt, NULL, 'snack', 150, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-08-13';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_smoothie) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_smoothie, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_salmon_sp) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_salmon_sp, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'dinner' AND food_id = f_roti) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_roti, NULL, 'dinner', 120, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-08-16';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_oats_banana) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_oats_banana, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_chicken_bowl) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_chicken_bowl, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_almonds) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_almonds, NULL, 'snack', 30, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-08-19';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_smoothie) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_smoothie, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_paneer_spin) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_paneer_spin, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'dinner' AND food_id = f_salmon) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_salmon, NULL, 'dinner', 180, NULL);
  END IF;

  SELECT id INTO v_log_id FROM daily_logs WHERE log_date = '2026-08-22';
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'breakfast' AND recipe_id = r_oats_banana) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_oats_banana, 'breakfast', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'lunch' AND recipe_id = r_chicken_bowl) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, NULL, r_chicken_bowl, 'lunch', NULL, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_food_entries WHERE daily_log_id = v_log_id AND meal_type = 'snack' AND food_id = f_apple) THEN
    INSERT INTO daily_food_entries (daily_log_id, food_id, recipe_id, meal_type, quantity_g, servings) VALUES (v_log_id, f_apple, NULL, 'snack', 180, NULL);
  END IF;

END $$;

-- ============================================================
-- END OF SEED SCRIPT
-- ============================================================
