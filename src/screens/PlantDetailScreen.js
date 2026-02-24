/**
 * PlantDetailScreen.js
 * ─────────────────────────────────────────────
 * Full detail view for a single plant/seed.
 * Shows: image, description, growing info, and
 * an "Add to Garden" button that lets users pick
 * which of their garden areas to add it to.
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, SafeAreaView, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS } from '../theme';
import { useGarden } from '../hooks/GardenContext';

// Growing stage labels with emoji
const STAGES = [
  { key: 'planted',    label: 'Planted',    emoji: '🌰' },
  { key: 'sprouted',   label: 'Sprouted',   emoji: '🌱' },
  { key: 'growing',    label: 'Growing',    emoji: '🌿' },
  { key: 'harvesting', label: 'Harvesting', emoji: '🥬' },
  { key: 'done',       label: 'Done',       emoji: '✅' },
];

// Maps category to a fallback emoji (used only if the crop has no emoji field)
const CAT_EMOJI = {
  Vegetable: '🥦', Herb: '🌿', Legume: '🫘',
  Fruit: '🍓', Tree: '🌳', Microgreen: '🥗',
};

// Short month names for displaying sow/plant/harvest months
const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Convert an array of month numbers like [9, 10, 11] → "Sep · Oct · Nov"
function formatMonths(arr) {
  if (!arr?.length) return null;
  return arr.map((m) => MONTH_NAMES[m]).join(' · ');
}

function InfoRow({ icon, label, value }) {
  const empty = !value;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, empty && styles.infoValueEmpty]}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

export default function PlantDetailScreen({ navigation, route }) {
  const { plant } = route.params;
  const { areas, addPlantToArea, createAreaAndAddPlant } = useGarden();

  // Controls the "Add to Garden" modal
  const [showModal, setShowModal] = useState(false);
  // Controls the "Create new area" sub-modal
  const [showNewArea, setShowNewArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaEmoji, setNewAreaEmoji] = useState('🪴');
  // Brief success banner shown after adding a plant
  const [addedMsg, setAddedMsg] = useState('');

  const EMOJI_SECTIONS = [
    { label: 'Containers & pots', emojis: ['🪴', '🏺', '🪣', '🫙', '📦', '🧺'] },
    { label: 'Beds & spaces',     emojis: ['🏡', '🌾', '🌿', '🌳', '🧱', '🪵'] },
    { label: 'Crops & plants',    emojis: ['🍅', '🥕', '🌻', '🍓', '🌵', '🌺', '🌱', '🧄', '🍋', '🥬'] },
  ];
  const ALL_AREA_EMOJIS = EMOJI_SECTIONS.flatMap((s) => s.emojis);

  function handleAddToArea(area) {
    addPlantToArea(area.id, plant);
    setShowModal(false);
    // Show a small banner instead of Alert (Alert blocks JavaScript on web)
    setAddedMsg(`Added to "${area.name}" ✓`);
  }

  function handleCreateAndAdd() {
    if (!newAreaName.trim()) return;
    // Use the atomic version — creates the area AND adds the plant
    // in a single state update to avoid a race condition
    const area = createAreaAndAddPlant(newAreaName, newAreaEmoji, plant);
    setShowNewArea(false);
    setShowModal(false);
    setNewAreaName('');
    // Show a small banner instead of Alert (Alert blocks JavaScript on web)
    setAddedMsg(`Created "${area.name}" and added plant ✓`);
  }

  // Support both new crops.json (plant.name) and custom user-added seeds (plant.title)
  const plantName = plant.name || (plant.title || '').replace(/\s+seeds?$/i, '');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Back button lives outside the ScrollView so it stays visible when scrolled down.
          hitSlop extends the invisible tap area so it's easier to hit reliably. */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 40 }}
      >
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero image ── */}
        {plant.image_url ? (
          <Image
            source={{ uri: plant.image_url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.heroImage, styles.heroFallback]}>
            {/* Use the crop's own emoji first, then category fallback */}
            <Text style={{ fontSize: 72 }}>{plant.emoji || CAT_EMOJI[plant.category] || '🌱'}</Text>
          </View>
        )}

        <View style={styles.content}>

          {/* ── Title block ── */}
          <View style={styles.titleBlock}>
            <Text style={styles.category}>{plant.category}</Text>
            <Text style={styles.title}>{plantName}</Text>
            {plant.scientific_name && (
              <Text style={styles.scientific}>{plant.scientific_name}</Text>
            )}
          </View>

          {/* ── Add to Garden button ── */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setAddedMsg(''); setShowModal(true); }}
          >
            <Text style={styles.addBtnText}>🪴  Add to My Garden</Text>
          </TouchableOpacity>

          {/* ── Success banner (shown after adding) ── */}
          {addedMsg !== '' && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{addedMsg}</Text>
            </View>
          )}

          {/* ── Description ── */}
          {plant.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{plant.description}</Text>
            </View>
          ) : null}

          {/* ── Growing info ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Growing Guide</Text>
            <View style={styles.infoCard}>
              {/* ── When to grow ── */}
              <InfoRow icon="🌰"  label="Sow from seed"        value={formatMonths(plant.sow_months)} />
              <InfoRow icon="🌱"  label="Plant seedlings"      value={formatMonths(plant.plant_months)} />
              <InfoRow icon="🍽️" label="Harvest"              value={formatMonths(plant.harvest_months)} />

              {/* ── Basic growing needs ── */}
              <InfoRow icon="☀️"  label="Sun"                  value={plant.sun || plant.sun_requirements} />
              <InfoRow icon="💧"  label="Watering"             value={plant.water || plant.watering} />
              <InfoRow icon="⭐"  label="Difficulty"           value={plant.difficulty} />
              <InfoRow icon="🔄"  label="Plant life"           value={plant.plant_life} />

              {/* ── Timing numbers ── */}
              <InfoRow icon="🌿"  label="Days to germinate"
                value={plant.days_to_germination ? `${plant.days_to_germination} days` : null} />
              <InfoRow icon="🗓"  label="Weeks to harvest"
                value={plant.weeks_to_harvest ? `${plant.weeks_to_harvest} weeks` : plant.days_to_harvest} />
              {plant.years_to_first_harvest && (
                <InfoRow icon="🌳" label="Years to first harvest"
                  value={`${plant.years_to_first_harvest} year${plant.years_to_first_harvest > 1 ? 's' : ''}`} />
              )}

              {/* ── Planting numbers ── */}
              <InfoRow icon="📏"  label="Sowing depth"
                value={plant.sowing_depth_mm ? `${plant.sowing_depth_mm} mm` : plant.sowing_depth} />
              <InfoRow icon="↔️"  label="Plant spacing"
                value={plant.spacing_cm ? `${plant.spacing_cm} cm` : plant.spacing} />
              <InfoRow icon="📐"  label="Plant height"
                value={plant.height_cm ? `${plant.height_cm} cm` : plant.plant_height} />

              {/* ── Conditions ── */}
              <InfoRow icon="❄️"  label="Frost tolerance"
                value={
                  plant.frost_tolerant !== undefined
                    ? (plant.frost_tolerant ? 'Frost tolerant' : 'Frost tender — protect from frost')
                    : plant.frost_tolerance
                }
              />
              <InfoRow icon="🪴"  label="Container growing"
                value={
                  plant.suitable_for_containers !== undefined
                    ? (plant.suitable_for_containers
                        ? `Suitable for pots${plant.min_pot_size_L ? ` (min ${plant.min_pot_size_L}L)` : ''}`
                        : 'Not recommended for pots')
                    : null
                }
              />
              <InfoRow icon="🏜️" label="Drought tolerance"
                value={plant.drought_tolerant ? 'Drought tolerant once established' : 'Needs regular water'} />
              <InfoRow icon="🪢"  label="Trellis"
                value={plant.requires_trellis ? 'Requires trellis or support' : 'No trellis needed'} />

              {/* ── Companions ── */}
              <InfoRow icon="🤝"  label="Companion plants"
                value={
                  plant.companions?.join(', ') ||
                  (Array.isArray(plant.companion_plants) ? plant.companion_plants.join(', ') : plant.companion_plants)
                }
              />
              <InfoRow icon="⚠️"  label="Keep away from"
                value={plant.avoid?.join(', ')} />
            </View>
          </View>

          {/* ── Tips ── */}
          {plant.tips && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Growing Tips</Text>
              <Text style={styles.description}>{plant.tips}</Text>
            </View>
          )}

          {/* ── Common problems ── */}
          {plant.common_problems?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Common Problems</Text>
              <View style={styles.infoCard}>
                {plant.common_problems.map((problem, i) => (
                  <View key={i} style={styles.infoRow}>
                    <Text style={styles.infoIcon}>🐛</Text>
                    <View style={styles.infoText}>
                      <Text style={styles.infoValue}>{problem}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}



        </View>
      </ScrollView>

      {/* ── Single modal: toggles between "pick area" and "create area" views ──
          iOS does not support two stacked modals — merging into one avoids
          touch-blocking bugs that occur when a second Modal opens over the first. */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowModal(false); setShowNewArea(false); setNewAreaName(''); }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => { setShowModal(false); setShowNewArea(false); setNewAreaName(''); }}
          />

          {showNewArea ? (
            // ── View 2: Create new area form ──────────────────────────────
            <View style={styles.modalSheet}>
              {/* Back link returns to the area picker without closing the modal */}
              <TouchableOpacity
                onPress={() => { setShowNewArea(false); setNewAreaName(''); setNewAreaEmoji('🪴'); }}
                style={styles.backToPickerBtn}
              >
                <Text style={styles.backToPickerText}>‹ Back</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>New garden area</Text>
              <Text style={styles.modalSub}>Give it a name — anything you like!</Text>

              {/* ScrollView so emoji picker + button are reachable above keyboard */}
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <TextInput
                  style={styles.areaInput}
                  placeholder="e.g. Planter Box 1, Back Pot, Raised Bed..."
                  placeholderTextColor={COLORS.textLight}
                  value={newAreaName}
                  onChangeText={setNewAreaName}
                  autoFocus
                />

                <Text style={[styles.modalSub, { marginBottom: 6 }]}>Pick an icon:</Text>
                {EMOJI_SECTIONS.map((section) => (
                  <View key={section.label}>
                    <Text style={styles.emojiSectionLabel}>{section.label}</Text>
                    <View style={[styles.emojiRow, { marginBottom: 6 }]}>
                      {section.emojis.map((e) => (
                        <TouchableOpacity
                          key={e}
                          style={[styles.emojiOption, newAreaEmoji === e && styles.emojiOptionActive]}
                          onPress={() => setNewAreaEmoji(e)}
                        >
                          <Text style={{ fontSize: 24 }}>{e}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}

                <View style={styles.customEmojiRow}>
                  <Text style={styles.customEmojiLabel}>Or type any emoji:</Text>
                  <TextInput
                    style={[
                      styles.customEmojiInput,
                      !ALL_AREA_EMOJIS.includes(newAreaEmoji) && styles.emojiOptionActive,
                    ]}
                    value={ALL_AREA_EMOJIS.includes(newAreaEmoji) ? '' : newAreaEmoji}
                    onChangeText={(text) => { if (text.trim()) setNewAreaEmoji(text.trim()); }}
                    placeholder="🎨"
                    maxLength={8}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.addBtn, !newAreaName.trim() && { opacity: 0.4 }]}
                  onPress={handleCreateAndAdd}
                  disabled={!newAreaName.trim()}
                >
                  <Text style={styles.addBtnText}>Create and add plant</Text>
                </TouchableOpacity>

                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          ) : (
            // ── View 1: Pick an existing area ─────────────────────────────
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Add to which area?</Text>
              <Text style={styles.modalSub}>
                Choose an existing garden area or create a new one.
              </Text>

              {areas.length === 0 && (
                <Text style={styles.noAreas}>
                  You haven't created any garden areas yet.
                </Text>
              )}

              {areas.map((area) => (
                <TouchableOpacity
                  key={area.id}
                  style={styles.areaRow}
                  onPress={() => handleAddToArea(area)}
                >
                  <Text style={styles.areaEmoji}>{area.emoji}</Text>
                  <View style={styles.areaInfo}>
                    <Text style={styles.areaName}>{area.name}</Text>
                    <Text style={styles.areaCount}>
                      {area.plants.length} plant{area.plants.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text style={styles.areaArrow}>+</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.newAreaBtn}
                onPress={() => setShowNewArea(true)}
              >
                <Text style={styles.newAreaBtnText}>＋  Create new area</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 40 },

  backBtn: { paddingHorizontal: 16, paddingVertical: 14, alignSelf: 'flex-start' },
  backText: { fontSize: 17, color: COLORS.primary, fontWeight: '600' },

  heroImage: { width: '100%', height: 240 },
  heroFallback: {
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { padding: 20 },

  titleBlock: { marginBottom: 18 },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, lineHeight: 32 },
  scientific: {
    fontSize: 14,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 4,
  },

  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoIcon: { fontSize: 18, width: 30 },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: COLORS.textLight, fontWeight: '600' },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: '500', marginTop: 1 },
  infoValueEmpty: { color: COLORS.textLight, fontStyle: 'italic' },

  fieldCount: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 10,
    fontStyle: 'italic',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: COLORS.textLight, marginBottom: 16 },
  backToPickerBtn: { marginBottom: 8 },
  backToPickerText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  noAreas: { color: COLORS.textLight, fontStyle: 'italic', marginBottom: 12 },

  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  areaEmoji: { fontSize: 24, marginRight: 12 },
  areaInfo: { flex: 1 },
  areaName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  areaCount: { fontSize: 12, color: COLORS.textLight },
  areaArrow: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: '700',
    paddingLeft: 8,
  },

  newAreaBtn: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  newAreaBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },

  cancelBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { color: COLORS.textLight, fontSize: 15 },

  areaInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
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
  emojiRow: {
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
  emojiOption: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#f0f4f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#eaf7eb',
  },

  successBanner: {
    backgroundColor: '#eaf7eb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  successBannerText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
});
