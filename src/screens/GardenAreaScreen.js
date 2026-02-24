/**
 * GardenAreaScreen.js
 * ─────────────────────────────────────────────
 * Shows all plants inside a specific garden area (e.g. "Planter Box 1").
 *
 * Users can:
 *   - See each plant, its current stage, and planted date
 *   - Tap a stage button to advance it (planted → sprouted → growing → harvesting → done)
 *   - Add notes to any plant
 *   - Remove a plant from the area
 *   - Tap the plant image/name to view its full detail page
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, SafeAreaView, TextInput, Modal,
  Animated, PanResponder,
} from 'react-native';
import { COLORS } from '../theme';
import { useGarden } from '../hooks/GardenContext';
import ALL_CROPS from '../data/crops.json';

// Ordered list of growth stages
const STAGES = [
  { key: 'planted',    label: 'Planted',    emoji: '🌰' },
  { key: 'sprouted',   label: 'Sprouted',   emoji: '🌱' },
  { key: 'growing',    label: 'Growing',    emoji: '🌿' },
  { key: 'harvesting', label: 'Harvesting', emoji: '🥬' },
  { key: 'done',       label: 'Done',       emoji: '✅' },
];

// Build a lookup map for crops by id, for quick access when tapping a plant card
const SEED_MAP = Object.fromEntries(ALL_CROPS.map((c) => [String(c.id), c]));

// ── SwipeableNoteRow ─────────────────────────────────────────
// Renders a single user note (type === 'note') with two ways to delete:
//   1. Swipe left  — drag the row left then release
//   2. Long press  — hold the row for ~400ms
// Both reveal an inline "Keep / Delete" confirm row.
// Stage entries (type === 'stage') are NOT wrapped in this — they're
// rendered as plain Views and cannot be deleted manually.

function SwipeableNoteRow({ entry, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  // translateX tracks how far the row has been dragged horizontally
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      // Only capture the gesture when the user is clearly swiping left
      // (horizontal movement larger than vertical, and going left)
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && g.dx < -8,

      onPanResponderMove: (_, g) => {
        // Only allow leftward movement (negative dx)
        if (g.dx < 0) translateX.setValue(g.dx);
      },

      onPanResponderRelease: (_, g) => {
        // If dragged more than 40px left, treat it as a swipe and show confirm
        if (g.dx < -40) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          setConfirmDelete(true);
        } else {
          // Not far enough — snap back to original position
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // Always keep Animated.View as the root — swapping root element types
  // (e.g. View ↔ Animated.View) causes React Native to recreate the native
  // view and blank out the row. Instead we keep the wrapper constant and
  // only swap the content inside based on confirmDelete.
  return (
    <Animated.View
      style={[
        styles.journalEntry,
        confirmDelete ? styles.journalDeleteConfirm : { transform: [{ translateX }] },
      ]}
      {...(!confirmDelete ? panResponder.panHandlers : {})}
    >
      {confirmDelete ? (
        // ── Confirm state: Keep / Delete ──
        <>
          <Text style={styles.journalDeleteQuestion}>Delete this note?</Text>
          <TouchableOpacity
            onPress={() => setConfirmDelete(false)}
            style={styles.deleteNo}
          >
            <Text style={styles.deleteNoText}>Keep</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.deleteYes}>
            <Text style={styles.deleteYesText}>Delete</Text>
          </TouchableOpacity>
        </>
      ) : (
        // ── Normal state: long-press to trigger confirm ──
        <TouchableOpacity
          style={styles.journalEntryInner}
          onLongPress={() => setConfirmDelete(true)}
          delayLongPress={400}
          activeOpacity={0.75}
        >
          <Text style={styles.journalDate}>{entry.date}</Text>
          <Text style={styles.journalText}>{entry.text}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export default function GardenAreaScreen({ navigation, route }) {
  const { areaId } = route.params;
  const { areas, updatePlantStage, rollbackPlantStage, addJournalEntry, removeJournalEntry, removePlantFromArea, addCustomPlantToArea, customSeeds } = useGarden();

  const area = areas.find((a) => a.id === areaId);

  // Map of user-added catalog seeds — needed so tapping a custom seed
  // navigates to its detail page the same way a built-in seed does
  const customSeedMap = useMemo(
    () => Object.fromEntries(customSeeds.map((s) => [String(s.id), s])),
    [customSeeds]
  );

  // Journal new-note input state (keyed by plant id)
  const [newNoteText, setNewNoteText] = useState({});

  // Inline delete confirmation — stores the plantId awaiting confirmation
  // (replaces Alert.alert which is unreliable on web)
  const [confirmingRemove, setConfirmingRemove] = useState(null);

  // Custom plant modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Vegetable');

  if (!area) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 20, color: COLORS.textLight }}>Area not found.</Text>
      </SafeAreaView>
    );
  }

  function advanceStage(plant) {
    // null stage → index -1, so STAGES[-1+1] = STAGES[0] = 'planted'
    const currentIndex = STAGES.findIndex((s) => s.key === plant.stage);
    if (currentIndex < STAGES.length - 1) {
      updatePlantStage(areaId, plant.id, STAGES[currentIndex + 1].key);
    }
  }

  function goBackStage(plant) {
    const currentIndex = STAGES.findIndex((s) => s.key === plant.stage);
    if (currentIndex > 0) {
      // Go back one stage — removes the last stage journal entry rather than adding one
      rollbackPlantStage(areaId, plant.id, STAGES[currentIndex - 1].key);
    } else if (currentIndex === 0) {
      // Back from 'planted' → clear entirely, all pips go grey
      rollbackPlantStage(areaId, plant.id, null);
    }
  }

  function submitNote(plantId) {
    const text = (newNoteText[plantId] || '').trim();
    if (!text) return;
    addJournalEntry(areaId, plantId, text);
    setNewNoteText((prev) => ({ ...prev, [plantId]: '' }));
  }

  function handleAddCustomPlant() {
    if (!customName.trim()) return;
    addCustomPlantToArea(areaId, customName, customCategory);
    setShowCustomModal(false);
    setCustomName('');
    setCustomCategory('Vegetable');
  }

  const activePlants = area.plants.filter((p) => p.stage !== 'done');
  const donePlants   = area.plants.filter((p) => p.stage === 'done');

  function renderPlant(plant) {
    // stageIndex is -1 when stage is null (not yet started) — all pips grey
    const stageIndex = STAGES.findIndex((s) => s.key === plant.stage);
    const stage = stageIndex >= 0 ? STAGES[stageIndex] : null;
    const isLast = stageIndex === STAGES.length - 1;
    const journal = plant.journal || [];

    // Look up seed data for navigation — check built-in catalog first,
    // then fall back to user-added custom catalog seeds
    const seed = SEED_MAP[String(plant.seedId)] || customSeedMap[String(plant.seedId)];

    return (
      <View key={plant.id} style={styles.plantCard}>

        {/* ── Top row: image + name + remove ── */}
        <View style={styles.plantTop}>
          <TouchableOpacity
            style={styles.plantTopInner}
            onPress={() => seed && navigation.navigate('PlantDetail', { plant: seed })}
          >
            {plant.seedImage ? (
              <Image
                source={{ uri: plant.seedImage }}
                style={styles.plantThumb}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.plantThumb, styles.plantThumbFallback]}>
                <Text style={{ fontSize: 22 }}>🌱</Text>
              </View>
            )}
            <View style={styles.plantInfo}>
              <Text style={styles.plantName} numberOfLines={2}>
                {/* seedTitle is stored at add-time — strip old "Seeds" suffix for any legacy entries */}
                {(plant.seedTitle || '').replace(/\s+seeds?$/i, '')}
              </Text>
              <Text style={styles.plantMeta}>
                {plant.seedCategory}  ·  Planted {plant.plantedDate}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setConfirmingRemove(plant.id)}
            style={styles.removeBtnWrap}
          >
            <Text style={styles.removeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Inline delete confirmation (replaces unreliable Alert on web) ── */}
        {confirmingRemove === plant.id && (
          <View style={styles.confirmRow}>
            <Text style={styles.confirmText}>Remove this plant?</Text>
            <TouchableOpacity
              style={styles.confirmNo}
              onPress={() => setConfirmingRemove(null)}
            >
              <Text style={styles.confirmNoText}>Keep</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmYes}
              onPress={() => {
                setConfirmingRemove(null);
                removePlantFromArea(areaId, plant.id);
              }}
            >
              <Text style={styles.confirmYesText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Stage progress bar (all grey until first stage is set) ── */}
        <View style={styles.stageRow}>
          {STAGES.map((s, i) => (
            <View
              key={s.key}
              style={[styles.stagePip, i <= stageIndex && styles.stagePipActive]}
            />
          ))}
        </View>

        {/* ── Stage label + back / advance buttons ── */}
        <View style={styles.stageControls}>
          <Text style={styles.stageText}>
            {stage ? `${stage.emoji}  ${stage.label}` : '⬜  Not started'}
          </Text>
          <View style={styles.stageButtons}>
            {/* Back button — shown once a stage is set */}
            {stageIndex >= 0 && (
              <TouchableOpacity
                style={styles.backStageBtn}
                onPress={() => goBackStage(plant)}
              >
                <Text style={styles.backStageBtnText}>← Back</Text>
              </TouchableOpacity>
            )}
            {/* Advance button — hidden once Done */}
            {!isLast && (
              <TouchableOpacity
                style={styles.advanceBtn}
                onPress={() => advanceStage(plant)}
              >
                <Text style={styles.advanceBtnText}>
                  {stageIndex === -1
                    ? 'Mark as Planted 🌰'
                    : `${STAGES[stageIndex + 1].label} →`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Journal ── */}
        <View style={styles.journalSection}>
          <Text style={styles.journalHeading}>Journal</Text>

          {/* Entries list */}
          {journal.length === 0 ? (
            <Text style={styles.journalEmpty}>No entries yet — mark a stage or add a note.</Text>
          ) : (
            journal.map((entry) =>
              entry.type === 'note' ? (
                // Note entries: swipe left or long press to delete
                <SwipeableNoteRow
                  key={entry.id}
                  entry={entry}
                  onDelete={() => removeJournalEntry(areaId, plant.id, entry.id)}
                />
              ) : (
                // Stage entries: read-only, can't be manually deleted
                <View
                  key={entry.id}
                  style={[styles.journalEntry, styles.journalEntryStage]}
                >
                  <Text style={styles.journalDate}>{entry.date}</Text>
                  <Text style={[styles.journalText, styles.journalTextStage]}>
                    {entry.text}
                  </Text>
                </View>
              )
            )
          )}

          {/* Add note input */}
          <View style={styles.journalInputRow}>
            <TextInput
              style={styles.journalInput}
              placeholder="Add a note..."
              placeholderTextColor={COLORS.textLight}
              value={newNoteText[plant.id] || ''}
              onChangeText={(t) => setNewNoteText((prev) => ({ ...prev, [plant.id]: t }))}
              returnKeyType="send"
              onSubmitEditing={() => submitNote(plant.id)}
            />
            <TouchableOpacity
              style={[
                styles.journalAddBtn,
                !(newNoteText[plant.id] || '').trim() && { opacity: 0.35 },
              ]}
              onPress={() => submitNote(plant.id)}
              disabled={!(newNoteText[plant.id] || '').trim()}
            >
              <Text style={styles.journalAddBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ My Garden</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.areaHeader}>
          <Text style={styles.areaEmoji}>{area.emoji || '🪴'}</Text>
          <View>
            <Text style={styles.areaName}>{area.name}</Text>
            <Text style={styles.areaSubtitle}>
              {area.plants.length === 0
                ? 'No plants yet'
                : `${area.plants.length} plant${area.plants.length !== 1 ? 's' : ''}`
              }
            </Text>
          </View>
        </View>

        {/* ── Add plant buttons ── */}
        <TouchableOpacity
          style={styles.addPlantPrompt}
          onPress={() => navigation.navigate('Browse', {
            screen: 'BrowseList',
            params: {},
          })}
        >
          <Text style={styles.addPlantPromptText}>
            🔍  Browse plants to add here
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addCustomPrompt}
          onPress={() => setShowCustomModal(true)}
        >
          <Text style={styles.addCustomPromptText}>
            ✏️  Add a plant manually
          </Text>
        </TouchableOpacity>

        {/* ── Active plants ── */}
        {activePlants.length > 0 && (
          <>
            <Text style={styles.groupTitle}>Active plants</Text>
            {activePlants.map(renderPlant)}
          </>
        )}

        {/* ── Done plants ── */}
        {donePlants.length > 0 && (
          <>
            <Text style={styles.groupTitle}>Completed ✅</Text>
            {donePlants.map(renderPlant)}
          </>
        )}

        {/* ── Empty state ── */}
        {area.plants.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyText}>Nothing planted yet</Text>
            <Text style={styles.emptyHint}>
              Go to Browse, find a plant, and tap "Add to My Garden" to add it here.
            </Text>
          </View>
        )}

      </ScrollView>

      {/* ── Add custom plant modal ── */}
      <Modal
        visible={showCustomModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowCustomModal(false)}
          />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add a custom plant</Text>
            <Text style={styles.sheetSub}>
              For anything not in the seed catalog — cuttings, gifted plants, unlisted varieties…
            </Text>

            <TextInput
              style={styles.sheetInput}
              placeholder="Plant name (e.g. Mint, Chilli, Rose...)"
              placeholderTextColor={COLORS.textLight}
              value={customName}
              onChangeText={setCustomName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddCustomPlant}
            />

            <Text style={styles.sheetSub}>Category:</Text>
            <View style={styles.catPillRow}>
              {['Vegetable', 'Herb', 'Fruit', 'Flower', 'Other'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catPill, customCategory === cat && styles.catPillActive]}
                  onPress={() => setCustomCategory(cat)}
                >
                  <Text style={[styles.catPillText, customCategory === cat && styles.catPillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.sheetAddBtn, !customName.trim() && { opacity: 0.4 }]}
              onPress={handleAddCustomPlant}
              disabled={!customName.trim()}
            >
              <Text style={styles.sheetAddBtnText}>Add to {area.name}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 40 },

  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  backText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },

  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  areaEmoji: { fontSize: 44 },
  areaName: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  areaSubtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },

  addPlantPrompt: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addPlantPromptText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },

  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },

  plantCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  plantTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  plantTopInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeBtnWrap: { paddingHorizontal: 8, paddingVertical: 8 },

  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#fdd',
  },
  confirmText: { flex: 1, fontSize: 13, color: '#c00', fontWeight: '600' },
  confirmNo: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  confirmNoText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  confirmYes: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e05252',
  },
  confirmYesText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  plantThumb: { width: 60, height: 60, borderRadius: 10 },
  plantThumbFallback: {
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantInfo: { flex: 1 },
  plantName: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 20 },
  plantMeta: { fontSize: 11, color: COLORS.textLight, marginTop: 3 },
  removeBtn: { fontSize: 16, color: '#ccc', paddingHorizontal: 4 },

  stageRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 4,
    marginBottom: 10,
  },
  stagePip: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e0e8e0',
  },
  stagePipActive: { backgroundColor: COLORS.primary },

  stageControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  stageText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  stageButtons: { flexDirection: 'row', gap: 6 },
  backStageBtn: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  backStageBtnText: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  advanceBtn: {
    backgroundColor: '#eaf7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  advanceBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },

  // Journal
  journalSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 12,
  },
  journalHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  journalEmpty: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  journalEntry: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  journalEntryStage: {
    opacity: 0.7,
  },
  journalDate: {
    fontSize: 11,
    color: COLORS.textLight,
    width: 72,
    paddingTop: 1,
  },
  journalText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  journalTextStage: {
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  journalInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  journalInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: COLORS.text,
  },
  journalAddBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  journalAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  // "Add manually" secondary button
  addCustomPrompt: {
    marginHorizontal: 16,
    marginBottom: 20,
    marginTop: -8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  addCustomPromptText: { color: COLORS.textLight, fontWeight: '600', fontSize: 13 },

  // Custom plant modal
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
  sheetInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 16,
  },
  catPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f4f0',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  catPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#eaf7eb',
  },
  catPillText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  catPillTextActive: { color: COLORS.primary, fontWeight: '700' },
  sheetAddBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetAddBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // SwipeableNoteRow — inner layout (TouchableOpacity fills the Animated.View)
  journalEntryInner: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },

  // Replaces the row when delete is pending
  journalDeleteConfirm: {
    backgroundColor: '#fff5f5',
    borderBottomColor: '#fdd',
  },
  journalDeleteQuestion: {
    flex: 1,
    fontSize: 13,
    color: '#c00',
    fontWeight: '600',
  },
  deleteNo: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: '#eee',
  },
  deleteNoText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  deleteYes: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: '#e05252',
  },
  deleteYesText: { fontSize: 12, color: '#fff', fontWeight: '700' },
});
