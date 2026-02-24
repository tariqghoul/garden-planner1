/**
 * SettingsScreen.js
 * ─────────────────────────────────────────────
 * User preferences:
 *   - Toggle daily garden reminder notification (default: OFF)
 *   - Adjust what time the daily reminder fires
 *   - Info note about automatic hot-day alerts
 */

import React from 'react';
import {
  View, Text, Switch,
  StyleSheet, SafeAreaView, ScrollView, Alert, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { kvGet, kvSet, kvRemove } from '../database/db';
// expo-notifications is required dynamically inside functions below
// so it never loads on web (static imports run regardless of Platform.OS checks)
import { COLORS } from '../theme';
import { useSettings } from '../hooks/SettingsContext';

// Key for storing the daily notification ID (so we can cancel it later)
const DAILY_NOTIF_ID_KEY = 'daily_notif_id';

// ── Notification helpers ─────────────────────────────────────

// Schedules (or reschedules) the daily garden reminder
async function scheduleDaily(hour, minute) {
  if (Platform.OS === 'web') return;   // not supported in browsers
  await cancelDaily();   // always cancel the old one first to avoid stacking
  const Notifications = require('expo-notifications');
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Garden check-in 🌱',
      body: 'Time to check your garden!',
      sound: true,
    },
    trigger: {
      type: 'calendar',   // fires on a repeating calendar schedule
      repeats: true,
      hour,
      minute,
    },
  });
  // Save the notification ID so we can cancel it when the user turns it off
  await kvSet(DAILY_NOTIF_ID_KEY, id);
}

// Cancels the existing daily reminder (if any)
async function cancelDaily() {
  if (Platform.OS === 'web') return;   // not supported in browsers
  const id = await kvGet(DAILY_NOTIF_ID_KEY);
  if (id) {
    const Notifications = require('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(id);
    await kvRemove(DAILY_NOTIF_ID_KEY);
  }
}

// ── Screen ───────────────────────────────────────────────────

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();

  // Called when the user flips the reminders toggle
  async function handleToggleReminders(value) {
    if (value) {
      // Turning ON — request notification permission first
      const Notifications = require('expo-notifications');
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        // User said no — show a helpful message, leave the toggle OFF
        Alert.alert(
          'Notifications blocked',
          'Please allow notifications for this app in your device Settings, then try again.'
        );
        return;
      }
      // Permission granted — schedule the daily reminder
      await scheduleDaily(settings.reminderHour, settings.reminderMinute);
    } else {
      // Turning OFF — cancel the existing reminder
      await cancelDaily();
    }
    updateSettings({ remindersEnabled: value });
  }

  // Called when the user scrolls the drum picker to a new time.
  // The picker gives us a full Date object — we just extract the hours and minutes.
  async function handleTimeChange(event, selectedDate) {
    if (!selectedDate) return;
    const newHour   = selectedDate.getHours();
    const newMinute = selectedDate.getMinutes();
    updateSettings({ reminderHour: newHour, reminderMinute: newMinute });
    if (settings.remindersEnabled) {
      await scheduleDaily(newHour, newMinute);
    }
  }

  // Build a Date object for the picker — it needs a full Date, not just h/m.
  // The actual date doesn't matter (it ignores it in time mode), only the time.
  const pickerValue = new Date();
  pickerValue.setHours(settings.reminderHour, settings.reminderMinute, 0, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={styles.heading}>Settings</Text>

        {/* ── Daily reminders ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Reminders</Text>

          {/* Toggle row */}
          {Platform.OS === 'web' ? (
            // Notifications aren't supported in web browsers
            <View style={styles.row}>
              <Text style={styles.rowSub}>
                🔔 Reminders are only available on iOS and Android devices.
              </Text>
            </View>
          ) : (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Garden check-in reminder</Text>
                <Text style={styles.rowSub}>A daily nudge to check on your plants</Text>
              </View>
              <Switch
                value={settings.remindersEnabled}
                onValueChange={handleToggleReminders}
                trackColor={{ false: '#ccc', true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
          )}

          {/* Drum picker — only visible when reminders are on */}
          {settings.remindersEnabled && (
            <View style={styles.pickerWrapper}>
              <DateTimePicker
                value={pickerValue}
                mode="time"
                display="spinner"    // the spinning drum wheel, same as iPhone alarm
                onChange={handleTimeChange}
                style={styles.picker}
              />
            </View>
          )}
        </View>

        {/* ── Hot day alerts ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hot Day Alerts</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>☀️</Text>
            <Text style={styles.infoText}>
              When tomorrow's forecast exceeds 35°C, you'll automatically get a
              reminder at 6pm tonight to water your plants. This happens whenever
              weather loads and notification permission has been granted.
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },

  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 24,
  },

  // Card-style section (same visual language as the rest of the app)
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingVertical: 12,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },

  // Wraps the drum picker and adds a top border to separate it from the toggle
  pickerWrapper: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 8,
  },
  // The picker itself fills the full width of the card
  picker: {
    width: '100%',
  },

  // Info block for hot-day alerts (read-only)
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 14,
    alignItems: 'flex-start',
  },
  infoEmoji: { fontSize: 22, marginTop: 1 },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
  },
});
