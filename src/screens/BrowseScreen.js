/**
 * BrowseScreen.js
 * ─────────────────────────────────────────────
 * Shows all crops with:
 *   - Search bar (filters by name as you type)
 *   - Category filter pills (All / Vegetable / Herb / Legume / etc.)
 *   - Scrollable list of plant cards
 *   - "+" button to add a custom plant to the catalog with a full growing guide form
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, Modal, ScrollView,
} from 'react-native';
import { COLORS } from '../theme';
import ALL_CROPS from '../data/crops.json';
import { useGarden } from '../hooks/GardenContext';

// Short month names for displaying sow hints (index 0 unused; 1 = January)
const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const CATEGORY_FILTERS = [
  { key: 'All',        label: 'All',         emoji: '🌿' },
  { key: 'Vegetable',  label: 'Vegetables',  emoji: '🥦' },
  { key: 'Herb',       label: 'Herbs',       emoji: '🌿' },
  { key: 'Legume',     label: 'Legumes',     emoji: '🫘' },
  { key: 'Fruit',      label: 'Fruit',       emoji: '🍓' },
  { key: 'Tree',       label: 'Trees',       emoji: '🌳' },
  { key: 'Microgreen', label: 'Microgreens', emoji: '🥗' },
];

// The blank starting state for the "Add to catalog" form
const INITIAL_FORM = {
  name: '',
  category: 'Vegetable',
  scientificName: '',
  description: '',
  seasons: [],          // multi-select array
  bestMonths: '',
  sunRequirements: null,
  watering: null,
  frostTolerance: null,
  difficulty: null,
  plantLife: null,
  suitableForPots: false,
  requiresTrellis: false,
  daysToGermination: '',
  daysToHarvest: '',
  sowingDepth: '',
  spacing: '',
  companionPlants: '',
};

// Reusable pill selector — highlights the chosen option
function PillRow({ options, value, onSelect }) {
  return (
    <View style={styles.catRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.catPill, value === opt && styles.catPillActive]}
          onPress={() => onSelect(opt)}
        >
          <Text style={[styles.catPillText, value === opt && styles.catPillTextActive]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function BrowseScreen({ navigation, route }) {
  // Allow the Home screen to pass a category filter when navigating here
  const initialCategory = route.params?.filterCategory || 'All';

  const { customSeeds, addCustomSeedToCatalog } = useGarden();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  // "Add to catalog" modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  // Update a single field in the form object
  function updateForm(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Toggle a planting season on/off in the multi-select array
  function toggleSeason(s) {
    setForm((f) => ({
      ...f,
      seasons: f.seasons.includes(s)
        ? f.seasons.filter((x) => x !== s)
        : [...f.seasons, s],
    }));
  }

  function handleAddSeed() {
    if (!form.name.trim()) return;
    addCustomSeedToCatalog({
      name: form.name,
      category: form.category,
      scientificName: form.scientificName,
      description: form.description,
      seasons: form.seasons,
      bestMonths: form.bestMonths,
      sunRequirements: form.sunRequirements,
      watering: form.watering,
      frostTolerance: form.frostTolerance,
      difficulty: form.difficulty,
      plantLife: form.plantLife,
      suitableForPots: form.suitableForPots,
      requiresTrellis: form.requiresTrellis,
      daysToGermination: form.daysToGermination,
      daysToHarvest: form.daysToHarvest,
      sowingDepth: form.sowingDepth,
      spacing: form.spacing,
      companionPlants: form.companionPlants,
    });
    setShowAddModal(false);
    setForm(INITIAL_FORM);
  }

  // When the Home screen navigates here with a category, apply it.
  // useState only runs once on mount, so without this effect the filter
  // wouldn't update if the Browse tab was already open from a previous visit.
  useEffect(() => {
    if (route.params?.filterCategory) {
      setActiveCategory(route.params.filterCategory);
    }
  }, [route.params?.filterCategory]);

  // Merge built-in catalog with user-added crops
  const allCrops = useMemo(() => [...ALL_CROPS, ...customSeeds], [customSeeds]);

  // Filter the combined list whenever search or category changes
  const filtered = useMemo(() => {
    let results = allCrops;

    // Filter by category
    if (activeCategory !== 'All') {
      results = results.filter((s) => s.category === activeCategory);
    }

    // Filter by search text — uses 'name' (new schema) with 'title' as fallback for custom entries
    const q = search.trim().toLowerCase();
    if (q) {
      results = results.filter((s) =>
        (s.name || s.title || '').toLowerCase().includes(q) ||
        (s.scientific_name || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
      );
    }

    return results;
  }, [search, activeCategory, allCrops]);

  function renderPlant({ item }) {
    // Show sow months as a season hint (e.g. "Sow: Sep · Oct")
    const sowHint = item.sow_months?.length > 0
      ? 'Sow: ' + item.sow_months.slice(0, 3).map((m) => MONTH_NAMES[m]).join(' · ')
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PlantDetail', { plant: item })}
        activeOpacity={0.75}
      >
        {/* Emoji fallback — crops.json uses emoji instead of image URLs */}
        <View style={[styles.cardImage, styles.cardImageFallback]}>
          <Text style={{ fontSize: 30 }}>{item.emoji || '🌱'}</Text>
        </View>

        {/* Plant info */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name || item.title}
          </Text>
          {item.scientific_name && (
            <Text style={styles.cardScientific} numberOfLines={1}>
              {item.scientific_name}
            </Text>
          )}
          <View style={styles.cardMeta}>
            <Text style={styles.categoryPill}>{item.category}</Text>
            {sowHint && (
              <Text style={styles.seasonPill}>{sowHint}</Text>
            )}
          </View>
          {item.weeks_to_harvest && (
            <Text style={styles.cardDetail}>
              🗓 {item.weeks_to_harvest} weeks to harvest
            </Text>
          )}
        </View>

        {/* Arrow */}
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      {/* Back button and + button are absolutely positioned so the title stays centred */}
      <View style={styles.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Browse Plants</Text>
        <Text style={styles.headerCount}>{filtered.length} results</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addBtnText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or type..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category filter pills ── */}
      {/* Using a wrapping View instead of a horizontal ScrollView so all pills
          are always visible — horizontal ScrollViews clip content on web */}
      <View style={styles.filterRow}>
        {CATEGORY_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterPill,
              activeCategory === f.key && styles.filterPillActive,
            ]}
            onPress={() => setActiveCategory(f.key)}
          >
            <Text style={[
              styles.filterPillText,
              activeCategory === f.key && styles.filterPillTextActive,
            ]}>
              {f.emoji} {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Plant list ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPlant}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌵</Text>
            <Text style={styles.emptyText}>No plants found</Text>
            <Text style={styles.emptyHint}>Try a different search or category</Text>
          </View>
        }
      />

      {/* ── Add to catalog modal ── */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add to catalog</Text>
            <Text style={styles.sheetSub}>
              Your plant will appear in Browse and can be added to any garden area.
            </Text>

            {/* The form is scrollable because it has many fields */}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── Name — required ── */}
              <TextInput
                style={styles.sheetInput}
                placeholder="Plant name (required)"
                placeholderTextColor={COLORS.textLight}
                value={form.name}
                onChangeText={(v) => updateForm('name', v)}
                autoFocus
                returnKeyType="next"
              />

              {/* ── Category ── */}
              <Text style={styles.sheetLabel}>Category</Text>
              <PillRow
                options={['Vegetable', 'Herb', 'Fruit', 'Flower', 'Other']}
                value={form.category}
                onSelect={(v) => updateForm('category', v)}
              />

              {/* ── Planting seasons — multi-select ── */}
              <Text style={styles.sheetLabel}>Planting seasons</Text>
              <View style={styles.catRow}>
                {['Spring', 'Summer', 'Autumn', 'Winter'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.catPill, form.seasons.includes(s) && styles.catPillActive]}
                    onPress={() => toggleSeason(s)}
                  >
                    <Text style={[styles.catPillText, form.seasons.includes(s) && styles.catPillTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Best months — free text ── */}
              <TextInput
                style={styles.sheetInput}
                placeholder="Best months to plant (e.g. Jan – Apr, Jun – Sep)"
                placeholderTextColor={COLORS.textLight}
                value={form.bestMonths}
                onChangeText={(v) => updateForm('bestMonths', v)}
              />

              {/* ── Light requirements ── */}
              <Text style={styles.sheetLabel}>Light requirements</Text>
              <PillRow
                options={['Full Sun', 'Part Sun / Shade', 'Full Shade']}
                value={form.sunRequirements}
                onSelect={(v) => updateForm('sunRequirements', v)}
              />

              {/* ── Watering ── */}
              <Text style={styles.sheetLabel}>Watering needs</Text>
              <PillRow
                options={['Low', 'Moderate', 'High']}
                value={form.watering}
                onSelect={(v) => updateForm('watering', v)}
              />

              {/* ── Frost tolerance ── */}
              <Text style={styles.sheetLabel}>Frost tolerance</Text>
              <PillRow
                options={['Frost Hardy', 'Semi-Hardy', 'Frost Tender']}
                value={form.frostTolerance}
                onSelect={(v) => updateForm('frostTolerance', v)}
              />

              {/* ── Difficulty ── */}
              <Text style={styles.sheetLabel}>Difficulty</Text>
              <PillRow
                options={['Easy', 'Intermediate', 'Advanced']}
                value={form.difficulty}
                onSelect={(v) => updateForm('difficulty', v)}
              />

              {/* ── Plant life ── */}
              <Text style={styles.sheetLabel}>Plant life</Text>
              <PillRow
                options={['Annual', 'Biennial', 'Perennial']}
                value={form.plantLife}
                onSelect={(v) => updateForm('plantLife', v)}
              />

              {/* ── Container growing & trellis — Yes / No toggles ── */}
              <Text style={styles.sheetLabel}>Suitable for pots?</Text>
              <PillRow
                options={['No', 'Yes']}
                value={form.suitableForPots ? 'Yes' : 'No'}
                onSelect={(v) => updateForm('suitableForPots', v === 'Yes')}
              />

              <Text style={styles.sheetLabel}>Requires trellis?</Text>
              <PillRow
                options={['No', 'Yes']}
                value={form.requiresTrellis ? 'Yes' : 'No'}
                onSelect={(v) => updateForm('requiresTrellis', v === 'Yes')}
              />

              {/* ── Planting guide numbers — side by side ── */}
              <View style={styles.twoCol}>
                <TextInput
                  style={[styles.sheetInput, styles.halfInput]}
                  placeholder="Days to germinate"
                  placeholderTextColor={COLORS.textLight}
                  value={form.daysToGermination}
                  onChangeText={(v) => updateForm('daysToGermination', v)}
                />
                <TextInput
                  style={[styles.sheetInput, styles.halfInput]}
                  placeholder="Days to harvest"
                  placeholderTextColor={COLORS.textLight}
                  value={form.daysToHarvest}
                  onChangeText={(v) => updateForm('daysToHarvest', v)}
                />
              </View>
              <View style={styles.twoCol}>
                <TextInput
                  style={[styles.sheetInput, styles.halfInput]}
                  placeholder="Sowing depth"
                  placeholderTextColor={COLORS.textLight}
                  value={form.sowingDepth}
                  onChangeText={(v) => updateForm('sowingDepth', v)}
                />
                <TextInput
                  style={[styles.sheetInput, styles.halfInput]}
                  placeholder="Plant spacing"
                  placeholderTextColor={COLORS.textLight}
                  value={form.spacing}
                  onChangeText={(v) => updateForm('spacing', v)}
                />
              </View>

              {/* ── Scientific name — optional ── */}
              <TextInput
                style={styles.sheetInput}
                placeholder="Scientific name (optional)"
                placeholderTextColor={COLORS.textLight}
                value={form.scientificName}
                onChangeText={(v) => updateForm('scientificName', v)}
                returnKeyType="next"
              />

              {/* ── Companion plants — optional ── */}
              <TextInput
                style={styles.sheetInput}
                placeholder="Companion plants (e.g. Basil, Marigold)"
                placeholderTextColor={COLORS.textLight}
                value={form.companionPlants}
                onChangeText={(v) => updateForm('companionPlants', v)}
              />

              {/* ── Description — optional ── */}
              <TextInput
                style={[styles.sheetInput, styles.sheetInputMulti]}
                placeholder="Description / growing notes (optional)"
                placeholderTextColor={COLORS.textLight}
                value={form.description}
                onChangeText={(v) => updateForm('description', v)}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.sheetSaveBtn, !form.name.trim() && { opacity: 0.4 }]}
                onPress={handleAddSeed}
                disabled={!form.name.trim()}
              >
                <Text style={styles.sheetSaveBtnText}>Add to catalog</Text>
              </TouchableOpacity>

              {/* Bottom padding so the save button clears the keyboard */}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    alignItems: 'center',          // centre children horizontally
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 16,
  },
  backText: { fontSize: 30, color: COLORS.primary, fontWeight: '300', lineHeight: 32 },
  addBtn: {
    position: 'absolute',          // mirror of backBtn, but on the right
    right: 16,
    top: 14,
  },
  addBtnText: { fontSize: 26, color: COLORS.primary, fontWeight: '400', lineHeight: 32 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  headerCount: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 44,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  clearBtn: { fontSize: 16, color: COLORS.textLight, padding: 4 },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  filterPillTextActive: { color: '#fff', fontWeight: '700' },

  list: { paddingHorizontal: 16, paddingBottom: 20 },

  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cardImage: { width: 80, height: 80 },
  cardImageFallback: {
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 19 },
  cardScientific: { fontSize: 11, color: COLORS.textLight, fontStyle: 'italic', marginTop: 2 },
  cardMeta: { flexDirection: 'row', marginTop: 6, gap: 6, flexWrap: 'wrap' },
  categoryPill: {
    fontSize: 10,
    color: COLORS.primary,
    backgroundColor: '#eaf7eb',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
    overflow: 'hidden',
  },
  seasonPill: {
    fontSize: 10,
    color: '#7a6000',
    backgroundColor: '#fff8d6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
    overflow: 'hidden',
  },
  cardDetail: { fontSize: 11, color: COLORS.textLight, marginTop: 4 },
  arrow: { fontSize: 22, color: COLORS.textLight, paddingHorizontal: 12 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyHint: { fontSize: 14, color: COLORS.textLight, marginTop: 6 },

  // "Add to catalog" modal
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
    paddingBottom: 0,        // ScrollView handles bottom padding
    maxHeight: '92%',        // never taller than 92% of the screen
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sheetSub: { fontSize: 13, color: COLORS.textLight, marginBottom: 16 },
  sheetLabel: { fontSize: 13, color: COLORS.textLight, marginBottom: 8, marginTop: 2 },
  sheetInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 14,
  },
  sheetInputMulti: { minHeight: 70, textAlignVertical: 'top' },

  // Pill selector rows (category, seasons, light, watering, etc.)
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f4f0',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  catPillActive: { borderColor: COLORS.primary, backgroundColor: '#eaf7eb' },
  catPillText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  catPillTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Two-column layout for short number inputs (days / depth / spacing)
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },

  sheetSaveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  sheetSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
