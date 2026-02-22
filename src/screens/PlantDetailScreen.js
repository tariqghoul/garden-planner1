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
  StyleSheet, SafeAreaView, Modal, TextInput,
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

// Maps category to a fallback emoji
const CAT_EMOJI = {
  Vegetable: '🥦', Herb: '🌿', Flower: '🌺',
  Sprout: '🌱', Microgreen: '🥗', 'Produce Bulb': '🧄',
};

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

  const cleanTitle = plant.title.replace(/\s+seeds?$/i, '');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Back button ── */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        {/* ── Hero image ── */}
        {plant.image_url ? (
          <Image
            source={{ uri: plant.image_url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.heroImage, styles.heroFallback]}>
            <Text style={{ fontSize: 72 }}>{CAT_EMOJI[plant.category] || '🌱'}</Text>
          </View>
        )}

        <View style={styles.content}>

          {/* ── Title block ── */}
          <View style={styles.titleBlock}>
            <Text style={styles.category}>{plant.category}</Text>
            <Text style={styles.title}>{cleanTitle}</Text>
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
          {(() => {
            // Count how many of the 16 guide fields actually have data
            const textFields = [
              plant.sun_requirements,
              plant.planting_seasons?.join(', '),
              plant.best_months,
              plant.days_to_harvest,
              plant.days_to_germination,
              plant.sowing_depth,
              plant.spacing,
              plant.plant_height,
              plant.plant_life,
              plant.frost_tolerance,
              plant.watering,
              plant.difficulty,
              plant.companion_plants,
            ];
            const boolFields = [
              plant.suitable_for_containers,
              plant.drought_tolerant,
              plant.requires_trellis,
            ];
            const filled = textFields.filter(Boolean).length
                         + boolFields.filter(Boolean).length;
            const total  = textFields.length + boolFields.length;
            const empty  = total - filled;

            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Growing Guide</Text>
                <Text style={styles.fieldCount}>
                  {empty === 0
                    ? 'All fields complete'
                    : `${empty} of ${total} fields are empty`}
                </Text>
                <View style={styles.infoCard}>
                  <InfoRow icon="☀️"  label="Sun requirements"    value={plant.sun_requirements} />
                  <InfoRow icon="📅"  label="Planting seasons"    value={plant.planting_seasons?.join(', ')} />
                  <InfoRow icon="📆"  label="Best months to plant" value={plant.best_months} />
                  <InfoRow icon="🗓"  label="Days to harvest"     value={plant.days_to_harvest} />
                  <InfoRow icon="🌿"  label="Days to germinate"   value={plant.days_to_germination} />
                  <InfoRow icon="📏"  label="Sowing depth"        value={plant.sowing_depth} />
                  <InfoRow icon="↔️"  label="Plant spacing"       value={plant.spacing} />
                  <InfoRow icon="📐"  label="Plant height"        value={plant.plant_height} />
                  <InfoRow icon="🔄"  label="Plant life"          value={plant.plant_life} />
                  <InfoRow icon="❄️"  label="Frost tolerance"     value={plant.frost_tolerance} />
                  <InfoRow icon="💧"  label="Watering"            value={plant.watering} />
                  <InfoRow icon="⭐"  label="Difficulty"          value={plant.difficulty} />
                  <InfoRow icon="🪴"  label="Container growing"
                    value={plant.suitable_for_containers ? 'Suitable for pots' : 'Not recommended for pots'}
                  />
                  <InfoRow icon="🏜️" label="Drought tolerance"
                    value={plant.drought_tolerant ? 'Drought tolerant once established' : 'Needs regular water'}
                  />
                  <InfoRow icon="🪢"  label="Trellis"
                    value={plant.requires_trellis ? 'Requires trellis support' : 'No trellis needed'}
                  />
                  <InfoRow icon="🤝"  label="Companion plants"   value={plant.companion_plants} />
                </View>
              </View>
            );
          })()}



        </View>
      </ScrollView>

      {/* ── "Add to Garden" modal ── */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          />
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

            {/* Create new area inline */}
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
        </View>
      </Modal>

      {/* ── "Create new area" mini-modal ── */}
      <Modal
        visible={showNewArea}
        animationType="fade"
        transparent
        onRequestClose={() => setShowNewArea(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowNewArea(false)}
          />
          <View style={[styles.modalSheet, { paddingBottom: 30 }]}>
            <Text style={styles.modalTitle}>New garden area</Text>
            <Text style={styles.modalSub}>
              Give it a name — anything you like!
            </Text>

            <TextInput
              style={styles.areaInput}
              placeholder="e.g. Planter Box 1, Back Pot, Raised Bed..."
              placeholderTextColor={COLORS.textLight}
              value={newAreaName}
              onChangeText={setNewAreaName}
              autoFocus
            />

            {/* Emoji picker — categorised sections */}
            <Text style={[styles.modalSub, { marginBottom: 6 }]}>
              Pick an icon:
            </Text>
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

            {/* Custom emoji — type any emoji */}
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
              style={[
                styles.addBtn,
                !newAreaName.trim() && { opacity: 0.4 },
              ]}
              onPress={handleCreateAndAdd}
              disabled={!newAreaName.trim()}
            >
              <Text style={styles.addBtnText}>Create and add plant</Text>
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

  backBtn: { padding: 16 },
  backText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },

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
