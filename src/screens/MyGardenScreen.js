/**
 * MyGardenScreen.js
 * ─────────────────────────────────────────────
 * Shows all the user's garden areas.
 * Each area has a custom name the user chose (e.g. "Planter Box 1").
 * Users can:
 *   - Create new areas with any name and emoji
 *   - Tap an area to see + manage what's planted in it
 *   - Long-press an area to rename or delete it
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  FlatList, Modal, TextInput,
} from 'react-native';
import { COLORS } from '../theme';
import { useGarden } from '../hooks/GardenContext';

// Emoji options grouped by theme so they're easier to scan
const EMOJI_SECTIONS = [
  { label: 'Containers & pots', emojis: ['🪴', '🏺', '🪣', '🫙', '📦', '🧺'] },
  { label: 'Beds & spaces',     emojis: ['🏡', '🌾', '🌿', '🌳', '🧱', '🪵'] },
  { label: 'Crops & plants',    emojis: ['🍅', '🥕', '🌻', '🍓', '🌵', '🌺', '🌱', '🧄', '🍋', '🥬'] },
];

// Flat list used to check whether the current emoji is a preset or custom
const ALL_AREA_EMOJIS = EMOJI_SECTIONS.flatMap((s) => s.emojis);

export default function MyGardenScreen({ navigation }) {
  const { areas, loading, totalPlants, createArea, renameArea, deleteArea } = useGarden();

  // Create area modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🪴');

  // Edit area modal
  const [editArea, setEditArea] = useState(null);   // the area being edited
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('🪴');

  function handleCreate() {
    if (!newName.trim()) return;
    createArea(newName, newEmoji);
    setShowCreate(false);
    setNewName('');
    setNewEmoji('🪴');
  }

  function handleEditSave() {
    if (!editName.trim() || !editArea) return;
    renameArea(editArea.id, editName, editEmoji);
    setEditArea(null);
  }

  function handleDeleteArea(area) {
    // Close edit modal first, then delete — no Alert needed
    setEditArea(null);
    deleteArea(area.id);
  }

  function openEdit(area) {
    setEditArea(area);
    setEditName(area.name);
    setEditEmoji(area.emoji || '🪴');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loadingText}>Loading your garden...</Text>
      </SafeAreaView>
    );
  }

  function renderArea({ item }) {
    const activeCount = item.plants.filter(
      (p) => p.stage !== 'done'
    ).length;

    return (
      <TouchableOpacity
        style={styles.areaCard}
        onPress={() => navigation.navigate('GardenArea', { areaId: item.id })}
        onLongPress={() => openEdit(item)}
        delayLongPress={500}
        activeOpacity={0.75}
      >
        <View style={styles.areaCardLeft}>
          <Text style={styles.areaEmoji}>{item.emoji || '🪴'}</Text>
          <View>
            <Text style={styles.areaName}>{item.name}</Text>
            <Text style={styles.areaSubtitle}>
              {item.plants.length === 0
                ? 'No plants yet — tap to add some'
                : `${item.plants.length} plant${item.plants.length !== 1 ? 's' : ''}${activeCount > 0 ? ` · ${activeCount} active` : ''}`
              }
            </Text>
          </View>
        </View>

        <View style={styles.areaCardRight}>
          {/* Stage breakdown dots */}
          {item.plants.length > 0 && (
            <View style={styles.stageDots}>
              {item.plants.slice(0, 5).map((p) => (
                <Text key={p.id} style={styles.stageDot}>
                  {stageEmoji(p.stage)}
                </Text>
              ))}
              {item.plants.length > 5 && (
                <Text style={styles.stageMore}>+{item.plants.length - 5}</Text>
              )}
            </View>
          )}
          <Text style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Garden</Text>
          <Text style={styles.headerSub}>
            {areas.length === 0
              ? 'Create your first garden area below'
              : `${areas.length} area${areas.length !== 1 ? 's' : ''} · ${totalPlants} plant${totalPlants !== 1 ? 's' : ''} total`
            }
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addAreaBtn}
          onPress={() => setShowCreate(true)}
        >
          <Text style={styles.addAreaBtnText}>＋ New area</Text>
        </TouchableOpacity>
      </View>

      {/* ── Area list ── */}
      {areas.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏡</Text>
          <Text style={styles.emptyTitle}>No garden areas yet</Text>
          <Text style={styles.emptyHint}>
            Create an area (like "Planter Box 1" or "Back Pot") and start
            adding plants to it.
          </Text>
          <TouchableOpacity
            style={styles.addAreaBtnLarge}
            onPress={() => setShowCreate(true)}
          >
            <Text style={styles.addAreaBtnText}>＋ Create first area</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={areas}
          keyExtractor={(a) => a.id}
          renderItem={renderArea}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <Text style={styles.longPressHint}>
              Long-press an area to rename or delete it
            </Text>
          }
        />
      )}

      {/* ── Create area modal ── */}
      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={styles.overlay}>
          {/* Backdrop — tapping this closes the modal */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowCreate(false)}
          />
          {/* Sheet — sits on top of the backdrop, NOT inside it */}
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New garden area</Text>
            <Text style={styles.sheetSub}>
              Name it anything — planter box, garden bed, pot, window box...
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Planter Box 1, South Bed, Balcony Pot..."
              placeholderTextColor={COLORS.textLight}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />

            <Text style={[styles.sheetSub, { marginBottom: 6 }]}>Pick an icon:</Text>

            {/* Categorised emoji grid */}
            {EMOJI_SECTIONS.map((section) => (
              <View key={section.label}>
                <Text style={styles.emojiSectionLabel}>{section.label}</Text>
                <View style={[styles.emojiGrid, { marginBottom: 8 }]}>
                  {section.emojis.map((e) => (
                    <TouchableOpacity
                      key={e}
                      style={[styles.emojiBtn, newEmoji === e && styles.emojiBtnActive]}
                      onPress={() => setNewEmoji(e)}
                    >
                      <Text style={{ fontSize: 26 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {/* Custom emoji — type any emoji you like */}
            <View style={styles.customEmojiRow}>
              <Text style={styles.customEmojiLabel}>Or type any emoji:</Text>
              <TextInput
                style={[
                  styles.customEmojiInput,
                  !ALL_AREA_EMOJIS.includes(newEmoji) && styles.emojiBtnActive,
                ]}
                value={ALL_AREA_EMOJIS.includes(newEmoji) ? '' : newEmoji}
                onChangeText={(text) => { if (text.trim()) setNewEmoji(text.trim()); }}
                placeholder="🎨"
                maxLength={8}
              />
            </View>

            <TouchableOpacity
              style={[styles.createBtn, !newName.trim() && { opacity: 0.4 }]}
              onPress={handleCreate}
              disabled={!newName.trim()}
            >
              <Text style={styles.createBtnText}>Create area</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Edit area modal ── */}
      <Modal
        visible={!!editArea}
        animationType="fade"
        transparent
        onRequestClose={() => setEditArea(null)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setEditArea(null)}
          />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Edit area</Text>

            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleEditSave}
            />

            {/* Categorised emoji grid */}
            {EMOJI_SECTIONS.map((section) => (
              <View key={section.label}>
                <Text style={styles.emojiSectionLabel}>{section.label}</Text>
                <View style={[styles.emojiGrid, { marginBottom: 8 }]}>
                  {section.emojis.map((e) => (
                    <TouchableOpacity
                      key={e}
                      style={[styles.emojiBtn, editEmoji === e && styles.emojiBtnActive]}
                      onPress={() => setEditEmoji(e)}
                    >
                      <Text style={{ fontSize: 26 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {/* Custom emoji — type any emoji you like */}
            <View style={styles.customEmojiRow}>
              <Text style={styles.customEmojiLabel}>Or type any emoji:</Text>
              <TextInput
                style={[
                  styles.customEmojiInput,
                  !ALL_AREA_EMOJIS.includes(editEmoji) && styles.emojiBtnActive,
                ]}
                value={ALL_AREA_EMOJIS.includes(editEmoji) ? '' : editEmoji}
                onChangeText={(text) => { if (text.trim()) setEditEmoji(text.trim()); }}
                placeholder="🎨"
                maxLength={8}
              />
            </View>

            <TouchableOpacity
              style={[styles.createBtn, !editName.trim() && { opacity: 0.4 }]}
              onPress={handleEditSave}
            >
              <Text style={styles.createBtnText}>Save changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteArea(editArea)}
            >
              <Text style={styles.deleteBtnText}>Delete this area</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function stageEmoji(stage) {
  const map = {
    planted: '🌰', sprouted: '🌱', growing: '🌿',
    harvesting: '🥬', done: '✅',
  };
  return map[stage] || '🌱';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  loadingText: { textAlign: 'center', marginTop: 60, color: COLORS.textLight },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  addAreaBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addAreaBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  list: { paddingHorizontal: 16, paddingBottom: 20 },
  longPressHint: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },

  areaCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  areaCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  areaEmoji: { fontSize: 34 },
  areaName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  areaSubtitle: { fontSize: 12, color: COLORS.textLight, marginTop: 3 },
  areaCardRight: { flexDirection: 'row', alignItems: 'center' },
  stageDots: { flexDirection: 'row', gap: 2, marginRight: 4 },
  stageDot: { fontSize: 14 },
  stageMore: { fontSize: 11, color: COLORS.textLight, alignSelf: 'center' },
  arrow: { fontSize: 22, color: COLORS.textLight, paddingLeft: 8 },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  addAreaBtnLarge: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 24,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sheetSub: { fontSize: 13, color: COLORS.textLight, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 16,
  },
  emojiSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 8,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  customEmojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    gap: 10,
  },
  customEmojiLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    flex: 1,
  },
  customEmojiInput: {
    width: 52,
    height: 52,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    fontSize: 26,
    textAlign: 'center',
    backgroundColor: '#f0f4f0',
  },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0f4f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#eaf7eb',
  },
  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { alignItems: 'center', paddingVertical: 12 },
  deleteBtnText: { color: '#e05252', fontSize: 14, fontWeight: '600' },
});
