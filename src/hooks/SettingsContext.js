/**
 * SettingsContext.js
 * ─────────────────────────────────────────────
 * Stores user preferences — currently just the watering reminder settings.
 * Works exactly like GardenContext: wrap the app in <SettingsProvider>,
 * then call useSettings() in any screen to read or update settings.
 *
 * Stored in SQLite (via kv_store table) so settings survive app restarts.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { kvGet, kvSet } from '../database/db';

const SETTINGS_KEY = 'garden_settings';

// What settings look like before the user has changed anything
const DEFAULT_SETTINGS = {
  remindersEnabled: false,  // OFF by default — user must consciously turn it on
  reminderHour: 8,          // 8am
  reminderMinute: 0,        // :00 — so together this is 8:00 AM
};

// The "broadcast channel" all screens can tune into
const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Load saved settings from device storage when the app opens
  useEffect(() => {
    kvGet(SETTINGS_KEY)
      .then((raw) => {
        if (raw) {
          // Merge with defaults so any new fields added in future updates
          // still get their default values even on existing installs
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        }
      })
      .catch(console.error);
  }, []);

  // Update one or more settings fields without overwriting the rest.
  // Example: updateSettings({ remindersEnabled: true })
  function updateSettings(patch) {
    const next = { ...settings, ...patch };
    setSettings(next);
    kvSet(SETTINGS_KEY, JSON.stringify(next)).catch(console.error);
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
