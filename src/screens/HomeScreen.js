/**
 * HomeScreen.js
 * ─────────────────────────────────────────────
 * Shows month-specific planting suggestions split into two groups:
 *   - "Sow from seed" — direct sow in ground, or start in trays
 *   - "Plant seedlings" — transplant established seedlings into beds/pots
 *
 * Uses a hand-curated monthly guide calibrated for
 * temperate SE Australia (Sydney / Melbourne / Adelaide).
 */

import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, SafeAreaView,
} from 'react-native';
import { COLORS } from '../theme';
import ALL_SEEDS from '../data/seeds.json';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Month-by-month planting guide ─────────────────────────────
// "sow"   = seeds to direct-sow in ground OR start in trays this month
// "plant" = seedlings to transplant into beds or pots this month
//
// Keywords are matched against seed titles using whole-word matching,
// so "pea" won't accidentally match "pear" or "capsicum".
const MONTHLY_GUIDE = {
  1: {
    tip: 'Late summer — direct-sow fast-maturing crops. Too late to start tomatoes or cucumbers from seed (not enough time before autumn).',
    sow:   ['bean', 'beetroot', 'carrot', 'radish', 'zucchini', 'lettuce'],
    plant: ['capsicum', 'eggplant', 'basil'],
  },
  2: {
    tip: 'Summer winding down — begin autumn crops. Sow broccoli and leafy greens now for a cool-season harvest. Too late for tomatoes or cucumbers from seed.',
    sow:   ['broccoli', 'beetroot', 'carrot', 'kale', 'lettuce', 'radish', 'silverbeet', 'spinach'],
    plant: ['silverbeet', 'spinach', 'lettuce', 'bok choy'],
  },
  3: {
    tip: 'Autumn begins — ideal for brassicas and root vegetables. Start winding down summer crops.',
    sow:   ['broccoli', 'cabbage', 'carrot', 'cauliflower', 'kale', 'lettuce', 'onion', 'pea', 'silverbeet', 'spinach'],
    plant: ['broccoli', 'cabbage', 'cauliflower', 'lettuce', 'silverbeet'],
  },
  4: {
    tip: 'Peak autumn planting. Sow peas, garlic, and brassicas. Cooler soil means less watering needed.',
    sow:   ['broad bean', 'beetroot', 'broccoli', 'cabbage', 'carrot', 'garlic', 'kale', 'onion', 'pea', 'radish', 'silverbeet', 'spinach'],
    plant: ['broccoli', 'cabbage', 'cauliflower', 'silverbeet'],
  },
  5: {
    tip: 'Cooler weather sets in. Great time for garlic, winter leafy greens, and peas.',
    sow:   ['broad bean', 'broccoli', 'cabbage', 'carrot', 'garlic', 'kale', 'leek', 'onion', 'pea', 'silverbeet', 'spinach'],
    plant: ['broccoli', 'cabbage', 'silverbeet', 'spinach'],
  },
  6: {
    tip: 'Winter — keep sowing cold-hardy crops. Garlic and broad beans thrive in the cold.',
    sow:   ['broad bean', 'garlic', 'kale', 'onion', 'pea', 'silverbeet', 'spinach'],
    plant: ['broccoli', 'cabbage', 'kale', 'onion'],
  },
  7: {
    tip: 'Mid-winter. Sow onions and leeks; plant out autumn-started brassica seedlings.',
    sow:   ['broad bean', 'garlic', 'leek', 'onion', 'pea', 'silverbeet', 'spinach'],
    plant: ['broccoli', 'cabbage', 'onion', 'leek'],
  },
  8: {
    tip: 'Late winter — start tomatoes and capsicum in trays indoors now. Direct-sow early spring crops outside.',
    sow:   ['beetroot', 'broccoli', 'carrot', 'kale', 'lettuce', 'pea', 'radish', 'silverbeet', 'tomato', 'capsicum'],
    plant: ['broccoli', 'cabbage', 'onion', 'leek', 'silverbeet'],
  },
  9: {
    tip: "Spring! Start cucumber, pumpkin, and zucchini in trays indoors — it's still too cold at night for them outside.",
    sow:   ['basil', 'bean', 'beetroot', 'carrot', 'cucumber', 'lettuce', 'pumpkin', 'radish', 'silverbeet', 'tomato', 'zucchini'],
    plant: ['broccoli', 'celery', 'lettuce', 'onion', 'silverbeet', 'tomato'],
  },
  10: {
    tip: 'Full spring — safe to transplant tomatoes, cucumbers, and zucchini outdoors after the last frost.',
    sow:   ['basil', 'bean', 'beetroot', 'capsicum', 'carrot', 'cucumber', 'lettuce', 'pumpkin', 'radish', 'sweet corn', 'zucchini'],
    plant: ['basil', 'capsicum', 'celery', 'cucumber', 'eggplant', 'pumpkin', 'tomato', 'zucchini'],
  },
  11: {
    tip: 'Late spring — keep transplanting summer seedlings and direct-sowing fast croppers.',
    sow:   ['basil', 'bean', 'beetroot', 'carrot', 'cucumber', 'lettuce', 'pumpkin', 'radish', 'sweet corn', 'zucchini'],
    plant: ['basil', 'bean', 'capsicum', 'cucumber', 'eggplant', 'pumpkin', 'sweet corn', 'tomato', 'zucchini'],
  },
  12: {
    tip: 'Early summer — direct-sow heat-lovers. Keep seedlings well watered in the heat.',
    sow:   ['bean', 'beetroot', 'carrot', 'cucumber', 'lettuce', 'pumpkin', 'radish', 'sweet corn', 'zucchini'],
    plant: ['basil', 'bean', 'capsicum', 'cucumber', 'eggplant', 'pumpkin', 'sweet corn', 'zucchini'],
  },
};

// Returns true if the seed title contains any of the given keywords
// as whole words (so "pea" won't match "pear" or "capsicum").
function matchesAny(title, keywords) {
  const t = title.toLowerCase();
  return keywords.some((kw) => new RegExp(`\\b${kw}\\b`).test(t));
}

// Category display config
const CATEGORIES = [
  { key: 'Vegetable',    label: 'Vegetables', emoji: '🥦', color: '#d4edda' },
  { key: 'Herb',         label: 'Herbs',      emoji: '🌿', color: '#d4f0e8' },
  { key: 'Flower',       label: 'Flowers',    emoji: '🌺', color: '#fde4ec' },
  { key: 'Sprout',       label: 'Sprouts',    emoji: '🌱', color: '#e8f5d4' },
  { key: 'Microgreen',   label: 'Microgreens',emoji: '🥗', color: '#fffbd4' },
  { key: 'Produce Bulb', label: 'Bulbs',      emoji: '🧄', color: '#f5e8d4' },
];

export default function HomeScreen({ navigation }) {
  const now = new Date();
  const month = now.getMonth() + 1;   // 1–12
  const monthName = MONTH_NAMES[month];
  const guide = MONTHLY_GUIDE[month];

  // Seeds to direct-sow or start in trays this month
  const sowPlants = useMemo(
    () => ALL_SEEDS.filter((s) => matchesAny(s.title, guide.sow)).slice(0, 14),
    [month]
  );

  // Seedlings ready to transplant this month
  const plantSeedlings = useMemo(
    () => ALL_SEEDS.filter((s) => matchesAny(s.title, guide.plant)).slice(0, 14),
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
          <Text style={styles.tipText}>{guide.tip}</Text>
        </View>

        {/* ── Sow from seed this month ── */}
        {sowPlants.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🌰  Sow from seed</Text>
            <Text style={styles.sectionSub}>Direct sow in ground, or start in trays indoors</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {sowPlants.map((plant) => (
                <TouchableOpacity
                  key={plant.id}
                  style={styles.plantCard}
                  onPress={() => navigation.navigate('PlantDetail', { plant })}
                >
                  {plant.image_url ? (
                    <Image
                      source={{ uri: plant.image_url }}
                      style={styles.plantImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.plantImage, styles.plantImageFallback]}>
                      <Text style={{ fontSize: 32 }}>🌱</Text>
                    </View>
                  )}
                  <Text style={styles.plantCardTitle} numberOfLines={2}>
                    {plant.title.replace(/\s+seeds?$/i, '')}
                  </Text>
                  <Text style={styles.plantCardCat}>{plant.category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Plant seedlings this month ── */}
        {plantSeedlings.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>🌱  Plant seedlings</Text>
            <Text style={styles.sectionSub}>Transplant established seedlings into beds or pots</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {plantSeedlings.map((plant) => (
                <TouchableOpacity
                  key={plant.id}
                  style={styles.plantCard}
                  onPress={() => navigation.navigate('PlantDetail', { plant })}
                >
                  {plant.image_url ? (
                    <Image
                      source={{ uri: plant.image_url }}
                      style={styles.plantImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.plantImage, styles.plantImageFallback]}>
                      <Text style={{ fontSize: 32 }}>🌱</Text>
                    </View>
                  )}
                  <Text style={styles.plantCardTitle} numberOfLines={2}>
                    {plant.title.replace(/\s+seeds?$/i, '')}
                  </Text>
                  <Text style={styles.plantCardCat}>{plant.category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Browse by category ── */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Browse by category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const count = ALL_SEEDS.filter((s) => s.category === cat.key).length;
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
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  categoryCard: {
    width: '30%',
    margin: '1.5%',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  categoryEmoji: { fontSize: 28, marginBottom: 6 },
  categoryLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  categoryCount: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
});
