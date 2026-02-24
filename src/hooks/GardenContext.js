/**
 * GardenContext.js
 * ─────────────────────────────────────────────
 * Creates a shared "garden store" that all screens can read from
 * and write to. Without this, each screen had its own separate copy
 * of the data, so changes in one screen weren't visible in another.
 *
 * Data is now stored in SQLite (via src/database/db.js) instead of
 * AsyncStorage. The public API (what screens call) is identical —
 * only the persistence layer underneath has changed.
 *
 * Usage:
 *   1. Wrap your app in <GardenProvider> (done in App.js)
 *   2. In any screen, call useGarden() to get the shared state
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  initDatabase,
  loadAllAreas,
  loadAllCustomSeeds,
  insertArea,
  updateArea,
  deleteArea as dbDeleteArea,
  insertPlant,
  updatePlantStage as dbUpdatePlantStage,
  deletePlant,
  insertJournalEntry,
  deleteJournalEntry,
  deleteLastStageEntry,
  insertCustomSeed,
} from '../database/db';

// The context object — think of it as a "broadcast channel" all screens tune into
const GardenContext = createContext(null);

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Human-readable labels for each stage (used in journal auto-entries)
const STAGE_LABELS = {
  planted:    '🌰 Marked as Planted',
  sprouted:   '🌱 Marked as Sprouted',
  growing:    '🌿 Marked as Growing',
  harvesting: '🥬 Marked as Harvesting',
  done:       '✅ Marked as Done',
};

function today() {
  return new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Provider ───────────────────────────────────────────────────
// This holds the real state and wraps the whole app (in App.js)

export function GardenProvider({ children }) {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customSeeds, setCustomSeeds] = useState([]);

  // Load all data from SQLite when the app first opens.
  // Both queries run in parallel for speed, then both results are applied at once.
  useEffect(() => {
    async function load() {
      try {
        const [loadedAreas, loadedSeeds] = await Promise.all([
          loadAllAreas(),
          loadAllCustomSeeds(),
        ]);
        setAreas(loadedAreas);
        setCustomSeeds(loadedSeeds);
      } catch (err) {
        console.error('DB load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Area operations ───────────────────────────────────────────

  function createArea(name, emoji = '🪴') {
    const area = {
      id: makeId(),
      name: name.trim(),
      emoji,
      createdAt: new Date().toISOString().slice(0, 10),
      plants: [],
    };
    // Update React state immediately so the UI responds instantly
    setAreas((prev) => [...prev, area]);
    // Persist to the database in the background
    insertArea(area.id, area.name, area.emoji, area.createdAt).catch(console.error);
    return area;
  }

  function renameArea(areaId, newName, newEmoji) {
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId ? { ...a, name: newName.trim(), emoji: newEmoji ?? a.emoji } : a
      )
    );
    updateArea(areaId, newName.trim(), newEmoji).catch(console.error);
  }

  function deleteArea(areaId) {
    setAreas((prev) => prev.filter((a) => a.id !== areaId));
    // The database cascade (ON DELETE CASCADE) auto-removes all plants
    // and journal entries belonging to this area
    dbDeleteArea(areaId).catch(console.error);
  }

  // ── Plant operations ──────────────────────────────────────────

  function addPlantToArea(areaId, seed) {
    const plantRecord = {
      id: makeId(),
      seedId: seed.id,
      // crops.json uses "name", custom seeds use "title" — handle both
      seedTitle: seed.title || seed.name,
      seedCategory: seed.category,
      seedImage: seed.image_url,
      plantedDate: new Date().toISOString().slice(0, 10),
      stage: null,   // starts with no stage — user marks as Planted when ready
      journal: [],   // grows with stage changes and user notes
    };
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId ? { ...a, plants: [...a.plants, plantRecord] } : a
      )
    );
    insertPlant(
      plantRecord.id, areaId, plantRecord.seedId, plantRecord.seedTitle,
      plantRecord.seedCategory, plantRecord.seedImage,
      plantRecord.plantedDate, plantRecord.stage
    ).catch(console.error);
    return plantRecord;
  }

  // Creates an area AND adds a plant in one atomic step.
  // Needed because doing createArea() then addPlantToArea() separately
  // has a race condition — the state update from createArea hasn't
  // applied yet when addPlantToArea runs.
  // Uses a SQLite transaction so both rows are saved together or not at all.
  function createAreaAndAddPlant(name, emoji = '🪴', seed) {
    const area = {
      id: makeId(),
      name: name.trim(),
      emoji,
      createdAt: new Date().toISOString().slice(0, 10),
      plants: [],
    };
    const plantRecord = {
      id: makeId(),
      seedId: seed.id,
      seedTitle: seed.title || seed.name,
      seedCategory: seed.category,
      seedImage: seed.image_url,
      plantedDate: new Date().toISOString().slice(0, 10),
      stage: null,
      journal: [],
    };
    // Single state update — both area and plant added at once
    setAreas((prev) => [...prev, { ...area, plants: [plantRecord] }]);

    // Transaction ensures both inserts succeed or both fail together
    initDatabase().then(async (db) => {
      await db.withTransactionAsync(async () => {
        await insertArea(area.id, area.name, area.emoji, area.createdAt);
        await insertPlant(
          plantRecord.id, area.id, plantRecord.seedId, plantRecord.seedTitle,
          plantRecord.seedCategory, plantRecord.seedImage,
          plantRecord.plantedDate, plantRecord.stage
        );
      });
    }).catch(console.error);

    return area;
  }

  function updatePlantStage(areaId, plantId, stage) {
    // Automatically add a dated journal entry when advancing a stage
    const entry = {
      id: makeId(),
      date: today(),
      text: STAGE_LABELS[stage] || stage,
      type: 'stage',
    };
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId
          ? { ...a, plants: a.plants.map((p) =>
              p.id === plantId
                ? { ...p, stage, journal: [...(p.journal || []), entry] }
                : p
            )}
          : a
      )
    );
    // Two writes: update the stage column and insert the journal entry
    Promise.all([
      dbUpdatePlantStage(plantId, stage),
      insertJournalEntry(entry.id, plantId, entry.date, entry.text, entry.type),
    ]).catch(console.error);
  }

  function rollbackPlantStage(areaId, plantId, stage) {
    // Going back a stage — remove the last stage-type entry rather than adding one,
    // so the journal only reflects real-world events the user actually experienced
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId
          ? { ...a, plants: a.plants.map((p) => {
              if (p.id !== plantId) return p;
              const journal = p.journal || [];
              // Find and remove the most recent stage entry
              const lastStageIndex = [...journal]
                .map((e, i) => ({ e, i }))
                .filter(({ e }) => e.type === 'stage')
                .pop()?.i;
              const trimmed = lastStageIndex !== undefined
                ? journal.filter((_, i) => i !== lastStageIndex)
                : journal;
              return { ...p, stage, journal: trimmed };
            })}
          : a
      )
    );
    Promise.all([
      dbUpdatePlantStage(plantId, stage),
      deleteLastStageEntry(plantId),
    ]).catch(console.error);
  }

  function addJournalEntry(areaId, plantId, text) {
    // Adds a free-text note to a plant's journal, stamped with today's date
    const entry = {
      id: makeId(),
      date: today(),
      text: text.trim(),
      type: 'note',
    };
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId
          ? { ...a, plants: a.plants.map((p) =>
              p.id === plantId
                ? { ...p, journal: [...(p.journal || []), entry] }
                : p
            )}
          : a
      )
    );
    insertJournalEntry(entry.id, plantId, entry.date, entry.text, entry.type).catch(console.error);
  }

  function removeJournalEntry(areaId, plantId, entryId) {
    // Deletes a single journal entry by its id
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId
          ? { ...a, plants: a.plants.map((p) =>
              p.id === plantId
                ? { ...p, journal: (p.journal || []).filter((e) => e.id !== entryId) }
                : p
            )}
          : a
      )
    );
    deleteJournalEntry(entryId).catch(console.error);
  }

  function removePlantFromArea(areaId, plantId) {
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId
          ? { ...a, plants: a.plants.filter((p) => p.id !== plantId) }
          : a
      )
    );
    // CASCADE in the schema auto-removes all journal entries for this plant
    deletePlant(plantId).catch(console.error);
  }

  // Adds a plant the user typed manually — not from the seed catalog
  function addCustomPlantToArea(areaId, name, category) {
    const plantRecord = {
      id: makeId(),
      seedId: null,                              // no catalog entry
      seedTitle: name.trim(),
      seedCategory: category || 'Other',
      seedImage: null,
      plantedDate: new Date().toISOString().slice(0, 10),
      stage: null,
      journal: [],
    };
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId ? { ...a, plants: [...a.plants, plantRecord] } : a
      )
    );
    insertPlant(
      plantRecord.id, areaId, plantRecord.seedId, plantRecord.seedTitle,
      plantRecord.seedCategory, plantRecord.seedImage,
      plantRecord.plantedDate, plantRecord.stage
    ).catch(console.error);
    return plantRecord;
  }

  // Adds a new entry to the seed catalog (persisted, appears in Browse).
  // Accepts all growing guide fields so the detail page is fully populated.
  function addCustomSeedToCatalog({
    name, category, scientificName, description,
    seasons, bestMonths, sunRequirements, watering,
    frostTolerance, difficulty, plantLife,
    suitableForPots, requiresTrellis,
    daysToGermination, daysToHarvest, sowingDepth, spacing,
    companionPlants,
  }) {
    const seed = {
      id: 'custom_' + makeId(),
      title: name.trim(),
      category: category || 'Vegetable',
      scientific_name: scientificName?.trim() || null,
      description: description?.trim() || null,
      image_url: null,
      url: null,
      isCustom: true,
      planting_seasons: seasons || [],
      best_months: bestMonths?.trim() || null,
      sun_requirements: sunRequirements || null,
      watering: watering || null,
      frost_tolerance: frostTolerance || null,
      difficulty: difficulty || null,
      plant_life: plantLife || null,
      suitable_for_containers: suitableForPots || false,
      requires_trellis: requiresTrellis || false,
      days_to_germination: daysToGermination?.trim() || null,
      days_to_harvest: daysToHarvest?.trim() || null,
      sowing_depth: sowingDepth?.trim() || null,
      spacing: spacing?.trim() || null,
      companion_plants: companionPlants?.trim() || null,
      plant_height: null,
      drought_tolerant: false,
    };
    setCustomSeeds((prev) => [...prev, seed]);
    insertCustomSeed(seed).catch(console.error);
    return seed;
  }

  const totalPlants = areas.reduce((sum, a) => sum + a.plants.length, 0);

  // Everything we expose to screens
  const value = {
    areas, loading, totalPlants,
    createArea, renameArea, deleteArea,
    addPlantToArea, createAreaAndAddPlant, addCustomPlantToArea,
    updatePlantStage, rollbackPlantStage, addJournalEntry, removeJournalEntry, removePlantFromArea,
    customSeeds, addCustomSeedToCatalog,
  };

  return (
    <GardenContext.Provider value={value}>
      {children}
    </GardenContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────
// Screens call this to tap into the shared state

export function useGarden() {
  const ctx = useContext(GardenContext);
  if (!ctx) throw new Error('useGarden must be used inside <GardenProvider>');
  return ctx;
}
