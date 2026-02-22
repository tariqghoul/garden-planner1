/**
 * GardenContext.js
 * ─────────────────────────────────────────────
 * Creates a shared "garden store" that all screens can read from
 * and write to. Without this, each screen had its own separate copy
 * of the data, so changes in one screen weren't visible in another.
 *
 * Usage:
 *   1. Wrap your app in <GardenProvider> (done in App.js)
 *   2. In any screen, call useGarden() to get the shared state
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@garden_data_v1';
const CUSTOM_SEEDS_KEY = '@custom_seeds_v1';   // separate key so catalog & garden data never interfere

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

// ── Provider ───────────────────────────────────────────────
// This holds the real state and wraps the whole app (in App.js)

export function GardenProvider({ children }) {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customSeeds, setCustomSeeds] = useState([]);

  // Load garden areas from storage on startup
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => { if (raw) setAreas(JSON.parse(raw)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Load user-added catalog seeds from storage on startup
  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_SEEDS_KEY)
      .then((raw) => { if (raw) setCustomSeeds(JSON.parse(raw)); })
      .catch(console.error);
  }, []);

  // Save garden areas to storage
  const save = useCallback((newAreas) => {
    setAreas(newAreas);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newAreas)).catch(console.error);
  }, []);

  // Save custom catalog seeds to storage
  const saveCustomSeeds = useCallback((newSeeds) => {
    setCustomSeeds(newSeeds);
    AsyncStorage.setItem(CUSTOM_SEEDS_KEY, JSON.stringify(newSeeds)).catch(console.error);
  }, []);

  // ── Area operations ──────────────────────────────────────

  function createArea(name, emoji = '🪴') {
    const area = {
      id: makeId(),
      name: name.trim(),
      emoji,
      createdAt: new Date().toISOString().slice(0, 10),
      plants: [],
    };
    save([...areas, area]);
    return area;
  }

  function renameArea(areaId, newName, newEmoji) {
    save(areas.map((a) =>
      a.id === areaId ? { ...a, name: newName.trim(), emoji: newEmoji ?? a.emoji } : a
    ));
  }

  function deleteArea(areaId) {
    save(areas.filter((a) => a.id !== areaId));
  }

  // ── Plant operations ─────────────────────────────────────

  function addPlantToArea(areaId, seed) {
    const plantRecord = {
      id: makeId(),
      seedId: seed.id,
      seedTitle: seed.title,
      seedCategory: seed.category,
      seedImage: seed.image_url,
      plantedDate: new Date().toISOString().slice(0, 10),
      stage: null,   // starts with no stage — user marks as Planted when ready
      journal: [],   // grows with stage changes and user notes
    };
    save(
      areas.map((a) =>
        a.id === areaId ? { ...a, plants: [...a.plants, plantRecord] } : a
      )
    );
    return plantRecord;
  }

  // Creates an area AND adds a plant in one atomic step.
  // Needed because doing createArea() then addPlantToArea() separately
  // has a race condition — the state update from createArea hasn't
  // applied yet when addPlantToArea runs.
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
      seedTitle: seed.title,
      seedCategory: seed.category,
      seedImage: seed.image_url,
      plantedDate: new Date().toISOString().slice(0, 10),
      stage: null,
      journal: [],
    };
    // Single save call — both area creation and plant addition happen at once
    save([...areas, { ...area, plants: [plantRecord] }]);
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
    save(
      areas.map((a) =>
        a.id === areaId
          ? { ...a, plants: a.plants.map((p) =>
              p.id === plantId
                ? { ...p, stage, journal: [...(p.journal || []), entry] }
                : p
            )}
          : a
      )
    );
  }

  function rollbackPlantStage(areaId, plantId, stage) {
    // Going back a stage — remove the last stage-type entry rather than adding one,
    // so the journal only reflects real-world events the user actually experienced
    save(
      areas.map((a) =>
        a.id === areaId
          ? { ...a, plants: a.plants.map((p) => {
              if (p.id !== plantId) return p;
              const journal = p.journal || [];
              // Find and remove the most recent stage entry
              const lastStageIndex = [...journal].map((e, i) => ({ e, i }))
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
  }

  function addJournalEntry(areaId, plantId, text) {
    // Adds a free-text note to a plant's journal, stamped with today's date
    const entry = {
      id: makeId(),
      date: today(),
      text: text.trim(),
      type: 'note',
    };
    save(
      areas.map((a) =>
        a.id === areaId
          ? { ...a, plants: a.plants.map((p) =>
              p.id === plantId
                ? { ...p, journal: [...(p.journal || []), entry] }
                : p
            )}
          : a
      )
    );
  }

  function removeJournalEntry(areaId, plantId, entryId) {
    // Deletes a single journal entry by its id
    save(
      areas.map((a) =>
        a.id === areaId
          ? { ...a, plants: a.plants.map((p) =>
              p.id === plantId
                ? { ...p, journal: (p.journal || []).filter((e) => e.id !== entryId) }
                : p
            )}
          : a
      )
    );
  }

  function removePlantFromArea(areaId, plantId) {
    save(
      areas.map((a) =>
        a.id === areaId
          ? { ...a, plants: a.plants.filter((p) => p.id !== plantId) }
          : a
      )
    );
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
    save(
      areas.map((a) =>
        a.id === areaId ? { ...a, plants: [...a.plants, plantRecord] } : a
      )
    );
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
    saveCustomSeeds([...customSeeds, seed]);
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

// ── Hook ────────────────────────────────────────────────────
// Screens call this to tap into the shared state

export function useGarden() {
  const ctx = useContext(GardenContext);
  if (!ctx) throw new Error('useGarden must be used inside <GardenProvider>');
  return ctx;
}
