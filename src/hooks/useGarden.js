/**
 * useGarden.js
 * ─────────────────────────────────────────────
 * Manages all "My Garden" state: user-created areas and the plants in them.
 *
 * Data is saved to the device using AsyncStorage (like a mini-database on the phone).
 *
 * Garden data shape:
 * {
 *   areas: [
 *     {
 *       id: "abc123",
 *       name: "Planter Box 1",          ← user picks this name
 *       emoji: "🪴",                     ← user picks this too
 *       createdAt: "2026-02-20",
 *       plants: [
 *         {
 *           id: "xyz789",
 *           seedId: 9291852218665,       ← links to seeds.json
 *           seedTitle: "Lettuce Seeds",
 *           seedImage: "https://...",
 *           plantedDate: "2026-02-20",
 *           stage: "planted",            ← planted | sprouted | growing | harvesting | done
 *           notes: "...",
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@garden_data_v1';

// Generate a simple unique ID without needing a library
function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useGarden() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load from device storage when the hook first mounts
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setAreas(JSON.parse(raw));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Save to device storage whenever areas change
  const save = useCallback((newAreas) => {
    setAreas(newAreas);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newAreas)).catch(console.error);
  }, []);

  // ── Area operations ────────────────────────────────────────

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
      a.id === areaId
        ? { ...a, name: newName.trim(), emoji: newEmoji ?? a.emoji }
        : a
    ));
  }

  function deleteArea(areaId) {
    save(areas.filter((a) => a.id !== areaId));
  }

  // ── Plant operations ───────────────────────────────────────

  function addPlantToArea(areaId, seed) {
    const plantRecord = {
      id: makeId(),
      seedId: seed.id,
      seedTitle: seed.title,
      seedCategory: seed.category,
      seedImage: seed.image_url,
      plantedDate: new Date().toISOString().slice(0, 10),
      stage: 'planted',   // planted → sprouted → growing → harvesting → done
      notes: '',
    };

    save(
      areas.map((a) =>
        a.id === areaId
          ? { ...a, plants: [...a.plants, plantRecord] }
          : a
      )
    );
    return plantRecord;
  }

  function updatePlantStage(areaId, plantId, stage) {
    save(
      areas.map((a) =>
        a.id === areaId
          ? {
              ...a,
              plants: a.plants.map((p) =>
                p.id === plantId ? { ...p, stage } : p
              ),
            }
          : a
      )
    );
  }

  function updatePlantNotes(areaId, plantId, notes) {
    save(
      areas.map((a) =>
        a.id === areaId
          ? {
              ...a,
              plants: a.plants.map((p) =>
                p.id === plantId ? { ...p, notes } : p
              ),
            }
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

  // Total number of active plants across all areas
  const totalPlants = areas.reduce((sum, a) => sum + a.plants.length, 0);

  return {
    areas,
    loading,
    totalPlants,
    createArea,
    renameArea,
    deleteArea,
    addPlantToArea,
    updatePlantStage,
    updatePlantNotes,
    removePlantFromArea,
  };
}
