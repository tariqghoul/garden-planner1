/**
 * useWeather.js
 * ─────────────────────────────────────────────
 * A React hook that:
 *   1. Loads a cached location from storage so the widget appears instantly
 *   2. Requests GPS permission from the device
 *   3. Gets the current position (lat/lon)
 *   4. Reverse-geocodes it to a suburb/city name
 *   5. Fetches current + forecast weather from Open-Meteo (free, no API key)
 *   6. If tomorrow will be hot (>35°C), schedules a 6pm notification tonight
 *
 * Usage:
 *   const { loading, error, cityName, currentTemp, ... } = useWeather();
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// expo-location and expo-notifications are required dynamically inside functions
// — both packages have web issues and must never load at module init time

const LOCATION_CACHE_KEY  = '@last_known_location';
const HOT_ALERT_DATE_KEY  = '@last_hot_alert_date';
const HOT_DAY_THRESHOLD   = 35;   // °C — send a "water tonight" alert above this

// ── WMO weather code → human-readable condition ─────────────
// Open-Meteo uses WMO standard codes. This covers the most common ones.
function interpretWMO(code) {
  if (code === 0)                   return { label: 'Clear sky',    emoji: '☀️' };
  if (code <= 2)                    return { label: 'Partly cloudy', emoji: '⛅' };
  if (code === 3)                   return { label: 'Overcast',     emoji: '☁️' };
  if (code >= 45 && code <= 48)     return { label: 'Foggy',        emoji: '🌫️' };
  if (code >= 51 && code <= 57)     return { label: 'Drizzle',      emoji: '🌦️' };
  if (code >= 61 && code <= 67)     return { label: 'Rain',         emoji: '🌧️' };
  if (code >= 71 && code <= 77)     return { label: 'Snow',         emoji: '❄️' };
  if (code >= 80 && code <= 82)     return { label: 'Showers',      emoji: '🌧️' };
  if (code >= 95)                   return { label: 'Thunderstorm', emoji: '⛈️' };
  return { label: 'Cloudy', emoji: '🌥️' };
}

// ── Hot day alert ────────────────────────────────────────────
// Called after weather loads. Schedules a one-time 6pm notification
// if tomorrow will be hot AND we haven't already sent one today.
async function maybeScheduleHotAlert(tomorrowMax) {
  if (tomorrowMax <= HOT_DAY_THRESHOLD) return;

  const today = new Date().toISOString().slice(0, 10);  // "2026-02-21"

  // Check if we already sent the alert today — avoid duplicate notifications
  try {
    const lastSent = await AsyncStorage.getItem(HOT_ALERT_DATE_KEY);
    if (lastSent === today) return;
  } catch (_) { /* ignore storage errors */ }

  // Build a Date object for 6pm tonight
  const sixPmTonight = new Date();
  sixPmTonight.setHours(18, 0, 0, 0);

  // Only schedule if 6pm is still in the future (in case the user opens
  // the app in the evening — we skip rather than fire immediately)
  if (sixPmTonight <= new Date()) return;

  // Notifications are not supported in web browsers — skip silently
  if (Platform.OS === 'web') return;

  try {
    const Notifications = require('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hot day tomorrow ☀️',
        body: `${tomorrowMax}°C forecast — consider watering your plants tonight!`,
        sound: true,
      },
      trigger: sixPmTonight,   // fires once at this exact time
    });

    // Mark today as done so we don't schedule again if the app is reopened
    await AsyncStorage.setItem(HOT_ALERT_DATE_KEY, today);
  } catch (_) {
    // Silently skip if notifications aren't permitted — no crash
  }
}

// ── Main hook ────────────────────────────────────────────────
export function useWeather() {
  const [state, setState] = useState({
    loading: true,
    error: null,       // null | 'permission_denied' | 'fetch_failed'
    cityName: null,
    currentTemp: null,
    condition: null,   // { label: string, emoji: string }
    todayHigh: null,
    rainProbability: null,
    tomorrowMax: null,
    isHotTomorrow: false,
  });

  useEffect(() => {
    loadWeather();
  }, []);

  async function fetchAndApply(latitude, longitude, cityName) {
    // Open-Meteo free API — no key needed
    // forecast_days=2 gives us today (index 0) and tomorrow (index 1)
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,weathercode,precipitation_probability` +
      `&daily=temperature_2m_max,precipitation_probability_max` +
      `&timezone=Australia%2FSydney` +
      `&forecast_days=2`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();

    const currentTemp    = Math.round(data.current.temperature_2m);
    const condition      = interpretWMO(data.current.weathercode);
    const rainProbability = data.current.precipitation_probability ?? 0;
    const todayHigh      = Math.round(data.daily.temperature_2m_max[0]);
    const tomorrowMax    = Math.round(data.daily.temperature_2m_max[1]);
    const isHotTomorrow  = tomorrowMax > HOT_DAY_THRESHOLD;

    setState({
      loading: false,
      error: null,
      cityName,
      currentTemp,
      condition,
      todayHigh,
      rainProbability,
      tomorrowMax,
      isHotTomorrow,
    });

    // Schedule a hot-day alert if needed (silently does nothing if not)
    maybeScheduleHotAlert(tomorrowMax);
  }

  async function loadWeather() {
    // Weather widget is not shown on web — GPS permission dialogs and
    // expo-location / expo-notifications both have web compatibility issues
    if (Platform.OS === 'web') {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    // Require here (not at module top) so neither package loads on web
    const Location = require('expo-location');

    // ── Step 1: Show cached location instantly while we fetch a fresh one ──
    try {
      const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        const { latitude, longitude, cityName } = JSON.parse(cached);
        // Don't await — let the cached fetch run in background
        fetchAndApply(latitude, longitude, cityName).catch(() => {});
      }
    } catch (_) { /* ignore */ }

    // ── Step 2: Ask for location permission ──
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setState((s) => ({ ...s, loading: false, error: 'permission_denied' }));
      return;
    }

    // ── Step 3: Get current GPS position ──
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,  // fast, battery-friendly
      });
      const { latitude, longitude } = pos.coords;

      // ── Step 4: Turn coordinates into a suburb/city name ──
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = places[0];
      const cityName =
        place?.suburb || place?.city || place?.region || 'Your location';

      // ── Step 5: Save to cache so next launch is instant ──
      await AsyncStorage.setItem(
        LOCATION_CACHE_KEY,
        JSON.stringify({ latitude, longitude, cityName })
      );

      // ── Step 6: Fetch fresh weather ──
      await fetchAndApply(latitude, longitude, cityName);

    } catch (_) {
      setState((s) => ({ ...s, loading: false, error: 'fetch_failed' }));
    }
  }

  return state;
}
