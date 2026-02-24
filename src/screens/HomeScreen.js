/**
 * HomeScreen.js
 * ─────────────────────────────────────────────
 * Shows month-specific planting suggestions split into two groups:
 *   - "Sow from seed" — direct sow in ground, or start in trays
 *   - "Plant seedlings" — transplant established seedlings into beds/pots
 *
 * Uses crops.json sow_months and plant_months arrays for SE Australia
 * (Sydney / Melbourne / Adelaide). Month numbers are 1–12.
 */

import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { COLORS } from '../theme';
import ALL_CROPS from '../data/crops.json';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Monthly tips ───────────────────────────────────────────────
// Plain text advice for each month. Crop suggestions come automatically
// from sow_months / plant_months arrays in crops.json — no keyword guessing.
const MONTH_TIPS = {
  1:  'Late summer — direct-sow fast-maturing crops. Too late to start tomatoes or cucumbers from seed (not enough time before autumn).',
  2:  'Summer winding down — begin autumn crops. Sow broccoli and leafy greens now for a cool-season harvest.',
  3:  'Autumn begins — ideal for brassicas and root vegetables. Start winding down summer crops.',
  4:  'Peak autumn planting. Sow peas, garlic, and brassicas. Cooler soil means less watering needed.',
  5:  'Cooler weather sets in. Great time for garlic, winter leafy greens, and peas.',
  6:  'Winter — keep sowing cold-hardy crops. Garlic and broad beans thrive in the cold.',
  7:  'Mid-winter. Sow onions and leeks; plant out autumn-started brassica seedlings.',
  8:  'Late winter — start tomatoes and capsicum in trays indoors now. Direct-sow early spring crops outside.',
  9:  "Spring! Start cucumber, pumpkin, and zucchini in trays indoors — it's still too cold at night for them outside.",
  10: 'Full spring — safe to transplant tomatoes, cucumbers, and zucchini outdoors after the last frost.',
  11: 'Late spring — keep transplanting summer seedlings and direct-sowing fast croppers.',
  12: 'Early summer — direct-sow heat-lovers. Keep seedlings well watered in the heat.',
};

// ── Category display config ────────────────────────────────────
// Updated to match the categories used in crops.json
const CATEGORIES = [
  { key: 'Vegetable',  label: 'Vegetables',  emoji: '🥦', color: '#d4edda' },
  { key: 'Herb',       label: 'Herbs',       emoji: '🌿', color: '#d4f0e8' },
  { key: 'Legume',     label: 'Legumes',     emoji: '🫘', color: '#f5f0d4' },
  { key: 'Fruit',      label: 'Fruit',       emoji: '🍓', color: '#fde4ec' },
  { key: 'Tree',       label: 'Trees',       emoji: '🌳', color: '#e8f5d4' },
  { key: 'Microgreen', label: 'Microgreens', emoji: '🥗', color: '#fffbd4' },
];

export default function HomeScreen({ navigation }) {
  const now = new Date();
  const month = now.getMonth() + 1;   // 1–12
  const monthName = MONTH_NAMES[month];

  // Crops with sow_months including this month — direct sow or start in trays
  const sowCrops = useMemo(
    () => ALL_CROPS.filter((c) => c.sow_months?.includes(month)).slice(0, 14),
    [month]
  );

  // Crops with plant_months including this month — transplant seedlings
  const plantCrops = useMemo(
    () => ALL_CROPS.filter((c) => c.plant_months?.includes(month)).slice(0, 14),
    [month]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.greeting}>🌿 Garden Planner</Text>
          <Text style={styles.monthText}>{monthName}</Text>
        </View>

        {/* ── Month tip card ── */}
        <View style={styles.tipCard}>
          <Text style={styles.tipMonth}>{monthName} in Australia</Text>
          <Text style={styles.tipText}>{MONTH_TIPS[month]}</Text>
        </View>

        {/* ── Sow from seed this month ── */}
        {sowCrops.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🌰  Sow from seed</Text>
            <Text style={styles.sectionSub}>Direct sow in ground, or start in trays indoors</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {sowCrops.map((crop) => (
                <TouchableOpacity
                  key={crop.id}
                  style={styles.plantCard}
                  onPress={() => navigation.navigate('PlantDetail', { plant: crop })}
                >
                  {/* Use the crop's emoji as the visual — no images in crops.json yet */}
                  <View style={[styles.plantImage, styles.plantImageFallback]}>
                    <Text style={{ fontSize: 32 }}>{crop.emoji || '🌱'}</Text>
                  </View>
                  <Text style={styles.plantCardTitle} numberOfLines={2}>
                    {crop.name}
                  </Text>
                  <Text style={styles.plantCardCat}>{crop.category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Plant seedlings this month ── */}
        {plantCrops.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>🌱  Plant seedlings</Text>
            <Text style={styles.sectionSub}>Transplant established seedlings into beds or pots</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {plantCrops.map((crop) => (
                <TouchableOpacity
                  key={crop.id}
                  style={styles.plantCard}
                  onPress={() => navigation.navigate('PlantDetail', { plant: crop })}
                >
                  <View style={[styles.plantImage, styles.plantImageFallback]}>
                    <Text style={{ fontSize: 32 }}>{crop.emoji || '🌱'}</Text>
                  </View>
                  <Text style={styles.plantCardTitle} numberOfLines={2}>
                    {crop.name}
                  </Text>
                  <Text style={styles.plantCardCat}>{crop.category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Browse by category ── */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Browse by category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const count = ALL_CROPS.filter((c) => c.category === cat.key).length;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryCard, { backgroundColor: cat.color }]}
                onPress={() =>
                  navigation.navigate('Browse', {
                    screen: 'BrowseList',
                    params: { filterCategory: cat.key },
                  })
                }
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
                <Text style={styles.categoryCount}>{count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 32 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  greeting: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  monthText: { fontSize: 14, color: COLORS.textLight, marginTop: 2 },

  tipCard: {
    backgroundColor: '#eaf5eb',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 14,
  },
  tipMonth: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 5 },
  tipText: { fontSize: 13, color: COLORS.textLight, lineHeight: 19 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: 20,
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textLight,
    marginHorizontal: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },

  horizontalScroll: { paddingHorizontal: 20, paddingBottom: 8 },
  plantCard: {
    width: 120,
    marginRight: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  plantImage: { width: '100%', height: 90 },
  plantImageFallback: {
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    margin: 8,
    marginBottom: 2,
    lineHeight: 16,
  },
  plantCardCat: {
    fontSize: 10,
    color: COLORS.textLight,
    marginHorizontal: 8,
    marginBottom: 8,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 24,
    gap: 8,
  },
  categoryCard: {
    width: '30%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  categoryEmoji: { fontSize: 28, marginBottom: 6 },
  categoryLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  categoryCount: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
});
