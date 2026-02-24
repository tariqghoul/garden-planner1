/**
 * db.js
 * ─────────────────────────────────────────────
 * The entire SQLite layer for the app. Every other file that needs to
 * read or write data imports functions from here.
 *
 * Design:
 *   - One shared database connection (_db), opened once and reused
 *   - initDatabase() is safe to call many times — it only opens on first call
 *   - All functions are async (return Promises)
 *   - Data is stored in 5 tables: areas, plants, journal_entries,
 *     custom_seeds, and kv_store (a simple key-value table for
 *     settings, weather cache, and notification IDs)
 */

import * as SQLite from 'expo-sqlite';

// The single database connection — shared across the whole app
let _db = null;

// ── Database setup ────────────────────────────────────────────

/**
 * Opens the database and creates all tables if they don't exist yet.
 * Safe to call on every operation — returns the cached connection after first open.
 */
export async function initDatabase() {
  if (_db) return _db;  // already open — return the cached connection

  _db = await SQLite.openDatabaseAsync('garden.db');

  // WAL mode = Write-Ahead Logging. Faster writes, and the database
  // won't get corrupted if the app crashes mid-save.
  await _db.execAsync('PRAGMA journal_mode = WAL;');

  // Without this, SQLite ignores foreign keys — meaning cascade deletes
  // (delete area → auto-delete its plants) wouldn't work.
  await _db.execAsync('PRAGMA foreign_keys = ON;');

  // Create all tables. IF NOT EXISTS means this is safe to run every time —
  // it won't wipe your data if the tables already exist.
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS areas (
      id         TEXT PRIMARY KEY NOT NULL,
      name       TEXT NOT NULL,
      emoji      TEXT NOT NULL DEFAULT '🪴',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plants (
      id            TEXT PRIMARY KEY NOT NULL,
      area_id       TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
      seed_id       TEXT,
      seed_title    TEXT,
      seed_category TEXT,
      seed_image    TEXT,
      planted_date  TEXT NOT NULL,
      stage         TEXT
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id       TEXT PRIMARY KEY NOT NULL,
      plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
      date     TEXT NOT NULL,
      text     TEXT NOT NULL,
      type     TEXT NOT NULL DEFAULT 'note'
    );

    CREATE TABLE IF NOT EXISTS custom_seeds (
      id                      TEXT PRIMARY KEY NOT NULL,
      title                   TEXT NOT NULL,
      category                TEXT NOT NULL DEFAULT 'Vegetable',
      scientific_name         TEXT,
      description             TEXT,
      image_url               TEXT,
      planting_seasons        TEXT,
      best_months             TEXT,
      sun_requirements        TEXT,
      watering                TEXT,
      frost_tolerance         TEXT,
      difficulty              TEXT,
      plant_life              TEXT,
      suitable_for_containers INTEGER NOT NULL DEFAULT 0,
      requires_trellis        INTEGER NOT NULL DEFAULT 0,
      days_to_germination     TEXT,
      days_to_harvest         TEXT,
      sowing_depth            TEXT,
      spacing                 TEXT,
      companion_plants        TEXT,
      plant_height            TEXT,
      drought_tolerant        INTEGER NOT NULL DEFAULT 0,
      is_custom               INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS kv_store (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
  `);

  return _db;
}

// ── Area functions ────────────────────────────────────────────

/**
 * Loads all areas from the database and reconstructs the nested JS structure
 * that the rest of the app expects:
 *   [{ id, name, emoji, createdAt, plants: [{ id, seedId, ..., journal: [...] }] }]
 *
 * We do this with three separate queries (areas → plants → journal entries)
 * rather than a JOIN, because a JOIN would return one flat row per journal entry,
 * duplicating area and plant data. Three queries + JavaScript nesting is simpler.
 */
export async function loadAllAreas() {
  const db = await initDatabase();

  // Fetch all areas, oldest first
  const areas = await db.getAllAsync('SELECT * FROM areas ORDER BY rowid ASC');

  for (const area of areas) {
    // Rename DB column (snake_case) to JS field (camelCase)
    area.createdAt = area.created_at;
    delete area.created_at;

    // Fetch all plants in this area
    const plants = await db.getAllAsync(
      'SELECT * FROM plants WHERE area_id = ? ORDER BY rowid ASC',
      [area.id]
    );

    for (const plant of plants) {
      // Rename snake_case columns to camelCase (matching what screens expect)
      plant.seedId       = plant.seed_id;
      plant.seedTitle    = plant.seed_title;
      plant.seedCategory = plant.seed_category;
      plant.seedImage    = plant.seed_image;
      plant.plantedDate  = plant.planted_date;
      delete plant.seed_id;
      delete plant.seed_title;
      delete plant.seed_category;
      delete plant.seed_image;
      delete plant.planted_date;
      delete plant.area_id;

      // Fetch all journal entries for this plant
      const entries = await db.getAllAsync(
        'SELECT * FROM journal_entries WHERE plant_id = ? ORDER BY rowid ASC',
        [plant.id]
      );
      plant.journal = entries.map((e) => ({
        id:   e.id,
        date: e.date,
        text: e.text,
        type: e.type,
      }));
    }

    area.plants = plants;
  }

  return areas;
}

export async function insertArea(id, name, emoji, createdAt) {
  const db = await initDatabase();
  await db.runAsync(
    'INSERT INTO areas (id, name, emoji, created_at) VALUES (?, ?, ?, ?)',
    [id, name, emoji, createdAt]
  );
}

export async function updateArea(id, name, emoji) {
  const db = await initDatabase();
  await db.runAsync(
    'UPDATE areas SET name = ?, emoji = ? WHERE id = ?',
    [name, emoji, id]
  );
}

export async function deleteArea(id) {
  const db = await initDatabase();
  // CASCADE in the schema auto-deletes all plants and journal entries for this area
  await db.runAsync('DELETE FROM areas WHERE id = ?', [id]);
}

// ── Plant functions ───────────────────────────────────────────

export async function insertPlant(id, areaId, seedId, seedTitle, seedCategory, seedImage, plantedDate, stage) {
  const db = await initDatabase();
  await db.runAsync(
    `INSERT INTO plants
       (id, area_id, seed_id, seed_title, seed_category, seed_image, planted_date, stage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, areaId, seedId ?? null, seedTitle ?? null, seedCategory ?? null, seedImage ?? null, plantedDate, stage ?? null]
  );
}

export async function updatePlantStage(plantId, stage) {
  const db = await initDatabase();
  await db.runAsync(
    'UPDATE plants SET stage = ? WHERE id = ?',
    [stage ?? null, plantId]
  );
}

export async function deletePlant(id) {
  const db = await initDatabase();
  // CASCADE auto-deletes all journal entries for this plant
  await db.runAsync('DELETE FROM plants WHERE id = ?', [id]);
}

// ── Journal entry functions ───────────────────────────────────

export async function insertJournalEntry(id, plantId, date, text, type) {
  const db = await initDatabase();
  await db.runAsync(
    'INSERT INTO journal_entries (id, plant_id, date, text, type) VALUES (?, ?, ?, ?, ?)',
    [id, plantId, date, text, type]
  );
}

export async function deleteJournalEntry(id) {
  const db = await initDatabase();
  await db.runAsync('DELETE FROM journal_entries WHERE id = ?', [id]);
}

/**
 * Deletes the most recent "stage" type journal entry for a plant.
 * Used when rolling back a plant's stage — we remove the auto-generated
 * stage entry that was added when the stage was advanced.
 */
export async function deleteLastStageEntry(plantId) {
  const db = await initDatabase();
  await db.runAsync(
    `DELETE FROM journal_entries
     WHERE id = (
       SELECT id FROM journal_entries
       WHERE plant_id = ? AND type = 'stage'
       ORDER BY rowid DESC
       LIMIT 1
     )`,
    [plantId]
  );
}

// ── Custom seed functions ─────────────────────────────────────

/**
 * Loads all user-added catalog seeds from the database.
 * planting_seasons is stored as a JSON string and parsed back to an array here.
 */
export async function loadAllCustomSeeds() {
  const db = await initDatabase();
  const rows = await db.getAllAsync('SELECT * FROM custom_seeds ORDER BY rowid ASC');

  return rows.map((row) => ({
    id:                     row.id,
    title:                  row.title,
    category:               row.category,
    scientific_name:        row.scientific_name,
    description:            row.description,
    image_url:              row.image_url,
    url:                    null,
    isCustom:               row.is_custom === 1,
    planting_seasons:       row.planting_seasons ? JSON.parse(row.planting_seasons) : [],
    best_months:            row.best_months,
    sun_requirements:       row.sun_requirements,
    watering:               row.watering,
    frost_tolerance:        row.frost_tolerance,
    difficulty:             row.difficulty,
    plant_life:             row.plant_life,
    suitable_for_containers: row.suitable_for_containers === 1,
    requires_trellis:       row.requires_trellis === 1,
    days_to_germination:    row.days_to_germination,
    days_to_harvest:        row.days_to_harvest,
    sowing_depth:           row.sowing_depth,
    spacing:                row.spacing,
    companion_plants:       row.companion_plants,
    plant_height:           row.plant_height,
    drought_tolerant:       row.drought_tolerant === 1,
  }));
}

/**
 * Saves a user-created seed to the database.
 * planting_seasons (array) is serialised to JSON text for storage.
 * Booleans are converted to 0/1 since SQLite has no boolean type.
 */
export async function insertCustomSeed(seed) {
  const db = await initDatabase();
  await db.runAsync(
    `INSERT INTO custom_seeds (
       id, title, category, scientific_name, description, image_url,
       planting_seasons, best_months, sun_requirements, watering,
       frost_tolerance, difficulty, plant_life,
       suitable_for_containers, requires_trellis,
       days_to_germination, days_to_harvest, sowing_depth, spacing,
       companion_plants, plant_height, drought_tolerant, is_custom
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      seed.id,
      seed.title,
      seed.category ?? 'Vegetable',
      seed.scientific_name ?? null,
      seed.description ?? null,
      seed.image_url ?? null,
      // Arrays must be serialised to text for SQLite storage
      seed.planting_seasons ? JSON.stringify(seed.planting_seasons) : null,
      seed.best_months ?? null,
      seed.sun_requirements ?? null,
      seed.watering ?? null,
      seed.frost_tolerance ?? null,
      seed.difficulty ?? null,
      seed.plant_life ?? null,
      // Booleans → 0 or 1
      seed.suitable_for_containers ? 1 : 0,
      seed.requires_trellis ? 1 : 0,
      seed.days_to_germination ?? null,
      seed.days_to_harvest ?? null,
      seed.sowing_depth ?? null,
      seed.spacing ?? null,
      seed.companion_plants ?? null,
      seed.plant_height ?? null,
      seed.drought_tolerant ? 1 : 0,
      1,  // is_custom is always 1 for user-added seeds
    ]
  );
}

// ── Key-value store ───────────────────────────────────────────
// A simple table used for settings, weather cache, and notification IDs.
// Replaces the various AsyncStorage keys that weren't part of the main data model.

export async function kvGet(key) {
  const db = await initDatabase();
  const row = await db.getFirstAsync('SELECT value FROM kv_store WHERE key = ?', [key]);
  return row ? row.value : null;
}

/**
 * Sets a key-value pair. Uses UPSERT (insert or update) so you don't need
 * to check whether the key already exists first.
 */
export async function kvSet(key, value) {
  const db = await initDatabase();
  await db.runAsync(
    `INSERT INTO kv_store (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export async function kvRemove(key) {
  const db = await initDatabase();
  await db.runAsync('DELETE FROM kv_store WHERE key = ?', [key]);
}
