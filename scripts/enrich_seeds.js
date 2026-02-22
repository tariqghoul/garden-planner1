/**
 * enrich_seeds.js
 *
 * Reads src/data/seeds.json, fills in any null/empty growing data fields
 * using the PLANT_DATA lookup below, then saves the file back.
 *
 * Matching works by checking the plant title (lowercased) against
 * keyword rules in order. First match wins.
 *
 * Run with:  node scripts/enrich_seeds.js
 * Dry run:   node scripts/enrich_seeds.js --dry-run
 */

const fs = require('fs');
const path = require('path');

// ─── PLANT DATA LOOKUP ────────────────────────────────────────────────────────
// Each entry:
//   keywords  – ALL of these must appear in the lowercased title
//   excludes  – NONE of these may appear in the lowercased title (optional)
//   data      – fields to apply (only fills null / empty values)
//
// Australian temperate climate (Sydney / Melbourne / Adelaide).
// Seasons: "Spring" = Sep-Nov, "Summer" = Dec-Feb, "Autumn" = Mar-May, "Winter" = Jun-Aug
// ─────────────────────────────────────────────────────────────────────────────

const PLANT_DATA = [

  // ── SPECIFIC OVERRIDES (must be before the general rules they'd otherwise match) ──
  {
    // "All Year Round" varieties genuinely grow in all four seasons
    keywords: ['all year round'],
    data: {
      planting_seasons: ['Spring', 'Summer', 'Autumn', 'Winter'],
    },
  },

  // ── TOMATOES ──────────────────────────────────────────────────────────────
  {
    keywords: ['tomato'],
    excludes: ['cherry', 'tiny tom', 'sweet 100', 'sweet million', 'sungold', 'juliet', 'tigerella', 'black cherry', 'cherry roma'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 75,
      sowing_depth: 6,
      spacing: 60,
      frost_tolerance: 'Frost tender – plant out after last frost',
      plant_height: 120,
      watering: 'Regular',
    },
  },
  {
    // Cherry / cocktail tomatoes (including named cherry varieties)
    keywords: ['tomato'],
    excludes: [],
    // Catch-all for remaining tomato types not matched above
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 65,
      sowing_depth: 6,
      spacing: 50,
      frost_tolerance: 'Frost tender – plant out after last frost',
      plant_height: 150,
      watering: 'Regular',
    },
  },
  {
    keywords: ['tiny tom'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 60,
      sowing_depth: 6,
      spacing: 40,
      frost_tolerance: 'Frost tender',
      plant_height: 45,
      watering: 'Regular',
    },
  },
  {
    keywords: ['honeybee tomato'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 60,
      sowing_depth: 6,
      spacing: 50,
      frost_tolerance: 'Frost tender',
      plant_height: 150,
      watering: 'Regular',
    },
  },
  {
    keywords: ['tommy toe'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 65,
      sowing_depth: 6,
      spacing: 50,
      frost_tolerance: 'Frost tender',
      plant_height: 150,
      watering: 'Regular',
    },
  },
  {
    keywords: ['tomatillo'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 75,
      sowing_depth: 6,
      spacing: 60,
      frost_tolerance: 'Frost tender',
      plant_height: 90,
      watering: 'Regular',
    },
  },

  // ── CAPSICUM ──────────────────────────────────────────────────────────────
  {
    keywords: ['capsicum'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 80,
      sowing_depth: 6,
      spacing: 45,
      frost_tolerance: 'Frost tender',
      plant_height: 70,
      watering: 'Regular',
    },
  },
  {
    keywords: ['california wonder capsicum'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 75,
      sowing_depth: 6,
      spacing: 45,
      frost_tolerance: 'Frost tender',
      plant_height: 65,
      watering: 'Regular',
    },
  },

  // ── CHILLI ────────────────────────────────────────────────────────────────
  {
    keywords: ['super hot chilli'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 21,
      days_to_harvest: 100,
      sowing_depth: 6,
      spacing: 50,
      frost_tolerance: 'Frost tender',
      plant_height: 80,
      watering: 'Regular',
    },
  },
  {
    keywords: ['chilli'],
    excludes: ['super hot'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 85,
      sowing_depth: 6,
      spacing: 45,
      frost_tolerance: 'Frost tender',
      plant_height: 75,
      watering: 'Regular',
    },
  },

  // ── EGGPLANT ──────────────────────────────────────────────────────────────
  {
    keywords: ['eggplant'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 80,
      sowing_depth: 6,
      spacing: 60,
      frost_tolerance: 'Frost tender',
      plant_height: 80,
      watering: 'Regular',
    },
  },

  // ── BEANS ─────────────────────────────────────────────────────────────────
  {
    keywords: ['broad bean'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 90,
      sowing_depth: 50,
      spacing: 20,
      frost_tolerance: 'Hardy – tolerates frost',
      plant_height: 90,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['bean, broad'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 90,
      sowing_depth: 50,
      spacing: 20,
      frost_tolerance: 'Hardy – tolerates frost',
      plant_height: 90,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['scarlet runner bean'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 70,
      sowing_depth: 30,
      spacing: 20,
      frost_tolerance: 'Frost tender',
      plant_height: 200,
      watering: 'Regular',
    },
  },
  {
    keywords: ['snake bean'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 8,
      days_to_harvest: 60,
      sowing_depth: 25,
      spacing: 30,
      frost_tolerance: 'Frost tender',
      plant_height: 200,
      watering: 'Regular',
    },
  },
  {
    keywords: ['soy bean'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 90,
      sowing_depth: 25,
      spacing: 15,
      frost_tolerance: 'Frost tender',
      plant_height: 60,
      watering: 'Regular',
    },
  },
  {
    // Climbing / pole beans (not broad, not snake, not runner)
    keywords: ['bean'],
    excludes: ['broad', 'butter', 'dwarf', 'snake', 'runner', 'soy', 'sprouting', 'adzuki'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 8,
      days_to_harvest: 60,
      sowing_depth: 25,
      spacing: 20,
      frost_tolerance: 'Frost tender',
      plant_height: 200,
      watering: 'Regular',
    },
  },
  {
    keywords: ['bean, butter'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 8,
      days_to_harvest: 55,
      sowing_depth: 25,
      spacing: 15,
      frost_tolerance: 'Frost tender',
      plant_height: 45,
      watering: 'Regular',
    },
  },
  {
    // Dwarf / bush beans
    keywords: ['bean, dwarf'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 8,
      days_to_harvest: 55,
      sowing_depth: 25,
      spacing: 15,
      frost_tolerance: 'Frost tender',
      plant_height: 45,
      watering: 'Regular',
    },
  },
  {
    keywords: ['dwarf bean'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 8,
      days_to_harvest: 55,
      sowing_depth: 25,
      spacing: 15,
      frost_tolerance: 'Frost tender',
      plant_height: 45,
      watering: 'Regular',
    },
  },

  // ── PEAS ──────────────────────────────────────────────────────────────────
  {
    keywords: ['snow pea'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 8,
      days_to_harvest: 60,
      sowing_depth: 25,
      spacing: 10,
      frost_tolerance: 'Hardy – tolerates moderate frost',
      plant_height: 150,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['sugar snap'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 8,
      days_to_harvest: 65,
      sowing_depth: 25,
      spacing: 10,
      frost_tolerance: 'Hardy – tolerates moderate frost',
      plant_height: 150,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['winged pea'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 60,
      sowing_depth: 25,
      spacing: 15,
      frost_tolerance: 'Hardy',
      plant_height: 40,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['pea'],
    excludes: ['snow', 'sugar snap', 'winged', 'sprouting', 'sweet pea'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 8,
      days_to_harvest: 65,
      sowing_depth: 25,
      spacing: 10,
      frost_tolerance: 'Hardy – tolerates moderate frost',
      plant_height: 80,
      watering: 'Moderate',
    },
  },

  // ── CUCUMBER ──────────────────────────────────────────────────────────────
  {
    keywords: ['cucumber'],
    excludes: ['african horned', 'kiwano', 'cucamelon'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 55,
      sowing_depth: 12,
      spacing: 40,
      frost_tolerance: 'Frost tender',
      plant_height: 200,
      watering: 'Regular',
    },
  },
  {
    keywords: ['cucamelon'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 70,
      sowing_depth: 12,
      spacing: 30,
      frost_tolerance: 'Frost tender',
      plant_height: 200,
      watering: 'Regular',
    },
  },

  // ── ZUCCHINI ──────────────────────────────────────────────────────────────
  {
    keywords: ['zucchini'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 55,
      sowing_depth: 25,
      spacing: 90,
      frost_tolerance: 'Frost tender',
      plant_height: 60,
      watering: 'Regular',
    },
  },

  // ── PUMPKIN / SQUASH / MARROW ─────────────────────────────────────────────
  {
    keywords: ['pumpkin'],
    excludes: ['little gardeners'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 110,
      sowing_depth: 25,
      spacing: 120,
      frost_tolerance: 'Frost tender',
      plant_height: 40,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['squash'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 60,
      sowing_depth: 25,
      spacing: 90,
      frost_tolerance: 'Frost tender',
      plant_height: 50,
      watering: 'Regular',
    },
  },
  {
    keywords: ['marrow'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 70,
      sowing_depth: 25,
      spacing: 90,
      frost_tolerance: 'Frost tender',
      plant_height: 60,
      watering: 'Regular',
    },
  },
  {
    keywords: ['gourd'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 80,
      sowing_depth: 25,
      spacing: 100,
      frost_tolerance: 'Frost tender',
      plant_height: 30,
      watering: 'Regular',
    },
  },

  // ── WATERMELON / ROCKMELON / MELON ───────────────────────────────────────
  {
    keywords: ['watermelon'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 90,
      sowing_depth: 25,
      spacing: 150,
      frost_tolerance: 'Frost tender',
      plant_height: 30,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['rockmelon'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 85,
      sowing_depth: 25,
      spacing: 120,
      frost_tolerance: 'Frost tender',
      plant_height: 30,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['melon'],
    excludes: ['watermelon', 'rockmelon', 'bitter melon'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 80,
      sowing_depth: 25,
      spacing: 120,
      frost_tolerance: 'Frost tender',
      plant_height: 30,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['bitter melon'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 70,
      sowing_depth: 12,
      spacing: 60,
      frost_tolerance: 'Frost tender',
      plant_height: 200,
      watering: 'Regular',
    },
  },

  // ── SWEET CORN ────────────────────────────────────────────────────────────
  {
    keywords: ['sweet corn'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 75,
      sowing_depth: 25,
      spacing: 30,
      frost_tolerance: 'Frost tender',
      plant_height: 180,
      watering: 'Regular',
    },
  },

  // ── LETTUCE ───────────────────────────────────────────────────────────────
  {
    keywords: ['lettuce'],
    data: {
      planting_seasons: ['Spring', 'Autumn', 'Winter'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 60,
      sowing_depth: 3,
      spacing: 25,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 30,
      watering: 'Regular',
    },
  },
  {
    keywords: ['mesclun'],
    data: {
      planting_seasons: ['Spring', 'Autumn', 'Winter'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 30,
      sowing_depth: 3,
      spacing: 10,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 20,
      watering: 'Regular',
    },
  },

  // ── SPINACH / SILVERBEET ──────────────────────────────────────────────────
  {
    keywords: ['spinach'],
    excludes: ['malabar', 'egyptian', 'kang kong', 'perpetual'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 45,
      sowing_depth: 12,
      spacing: 15,
      frost_tolerance: 'Hardy – tolerates frost',
      plant_height: 30,
      watering: 'Regular',
    },
  },
  {
    keywords: ['silverbeet'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Biennial',
      days_to_germination: 10,
      days_to_harvest: 55,
      sowing_depth: 12,
      spacing: 30,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 50,
      watering: 'Regular',
    },
  },
  {
    keywords: ['silver beet'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Biennial',
      days_to_germination: 10,
      days_to_harvest: 55,
      sowing_depth: 12,
      spacing: 30,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 50,
      watering: 'Regular',
    },
  },
  {
    keywords: ['perpetual'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 10,
      days_to_harvest: 55,
      sowing_depth: 12,
      spacing: 30,
      frost_tolerance: 'Hardy',
      plant_height: 50,
      watering: 'Regular',
    },
  },
  {
    keywords: ['malabar'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 70,
      sowing_depth: 6,
      spacing: 30,
      frost_tolerance: 'Frost tender',
      plant_height: 200,
      watering: 'Regular',
    },
  },
  {
    keywords: ['kang kong'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 30,
      sowing_depth: 6,
      spacing: 20,
      frost_tolerance: 'Frost tender',
      plant_height: 40,
      watering: 'Regular',
    },
  },
  {
    keywords: ['egyptian spinach'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 40,
      sowing_depth: 6,
      spacing: 30,
      frost_tolerance: 'Frost tender',
      plant_height: 150,
      watering: 'Moderate',
    },
  },

  // ── KALE ──────────────────────────────────────────────────────────────────
  {
    keywords: ['kale'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 60,
      sowing_depth: 6,
      spacing: 45,
      frost_tolerance: 'Very hardy – improves after frost',
      plant_height: 60,
      watering: 'Moderate',
    },
  },

  // ── BROCCOLI ──────────────────────────────────────────────────────────────
  {
    keywords: ['broccoli'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 80,
      sowing_depth: 6,
      spacing: 45,
      frost_tolerance: 'Hardy – tolerates moderate frost',
      plant_height: 60,
      watering: 'Regular',
    },
  },
  {
    keywords: ['broccoletti'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 60,
      sowing_depth: 6,
      spacing: 30,
      frost_tolerance: 'Hardy',
      plant_height: 40,
      watering: 'Regular',
    },
  },

  // ── CAULIFLOWER ───────────────────────────────────────────────────────────
  {
    keywords: ['cauliflower'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 90,
      sowing_depth: 6,
      spacing: 50,
      frost_tolerance: 'Hardy – tolerates moderate frost',
      plant_height: 50,
      watering: 'Regular',
    },
  },

  // ── CABBAGE ───────────────────────────────────────────────────────────────
  {
    keywords: ['cabbage'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 90,
      sowing_depth: 6,
      spacing: 45,
      frost_tolerance: 'Hardy – tolerates frost',
      plant_height: 40,
      watering: 'Regular',
    },
  },

  // ── BRUSSELS SPROUT ───────────────────────────────────────────────────────
  {
    keywords: ['brussels'],
    data: {
      planting_seasons: ['Autumn'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 120,
      sowing_depth: 6,
      spacing: 60,
      frost_tolerance: 'Very hardy – frost improves flavour',
      plant_height: 90,
      watering: 'Regular',
    },
  },

  // ── BOK CHOI / PAK CHOI / CHOY ───────────────────────────────────────────
  {
    keywords: ['pak choi'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 45,
      sowing_depth: 6,
      spacing: 20,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 30,
      watering: 'Regular',
    },
  },
  {
    keywords: ['bok choi'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 45,
      sowing_depth: 6,
      spacing: 20,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 30,
      watering: 'Regular',
    },
  },
  {
    keywords: ['choy sum'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 40,
      sowing_depth: 6,
      spacing: 20,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 35,
      watering: 'Regular',
    },
  },
  {
    keywords: ['chopsuey'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 40,
      sowing_depth: 6,
      spacing: 20,
      frost_tolerance: 'Hardy',
      plant_height: 40,
      watering: 'Regular',
    },
  },
  {
    keywords: ['chinese cabbage'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 60,
      sowing_depth: 6,
      spacing: 30,
      frost_tolerance: 'Hardy',
      plant_height: 40,
      watering: 'Regular',
    },
  },
  {
    keywords: ['kailaan'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 50,
      sowing_depth: 6,
      spacing: 20,
      frost_tolerance: 'Hardy',
      plant_height: 40,
      watering: 'Regular',
    },
  },

  // ── CARROT ────────────────────────────────────────────────────────────────
  {
    keywords: ['carrot'],
    data: {
      planting_seasons: ['Spring', 'Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 75,
      sowing_depth: 6,
      spacing: 5,
      frost_tolerance: 'Hardy – tolerates frost',
      plant_height: 30,
      watering: 'Moderate',
    },
  },

  // ── BEETROOT ──────────────────────────────────────────────────────────────
  {
    keywords: ['beetroot'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 70,
      sowing_depth: 12,
      spacing: 10,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 40,
      watering: 'Moderate',
    },
  },

  // ── RADISH ────────────────────────────────────────────────────────────────
  {
    keywords: ['radish'],
    excludes: ['daikon', 'rat tail', 'sprouting'],
    data: {
      planting_seasons: ['Spring', 'Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 5,
      days_to_harvest: 30,
      sowing_depth: 12,
      spacing: 5,
      frost_tolerance: 'Hardy',
      plant_height: 20,
      watering: 'Regular',
    },
  },
  {
    keywords: ['daikon'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 60,
      sowing_depth: 12,
      spacing: 20,
      frost_tolerance: 'Hardy',
      plant_height: 30,
      watering: 'Regular',
    },
  },
  {
    keywords: ['rat tail radish'],
    data: {
      planting_seasons: ['Spring', 'Summer', 'Autumn'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 50,
      sowing_depth: 12,
      spacing: 20,
      frost_tolerance: 'Hardy',
      plant_height: 90,
      watering: 'Moderate',
    },
  },

  // ── PARSNIP ───────────────────────────────────────────────────────────────
  {
    keywords: ['parsnip'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 21,
      days_to_harvest: 100,
      sowing_depth: 12,
      spacing: 10,
      frost_tolerance: 'Very hardy – improves after frost',
      plant_height: 40,
      watering: 'Moderate',
    },
  },

  // ── TURNIP / SWEDE / KOHLRABI ─────────────────────────────────────────────
  {
    keywords: ['turnip'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 50,
      sowing_depth: 6,
      spacing: 15,
      frost_tolerance: 'Hardy',
      plant_height: 30,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['swede'],
    data: {
      planting_seasons: ['Autumn'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 90,
      sowing_depth: 6,
      spacing: 20,
      frost_tolerance: 'Very hardy',
      plant_height: 40,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['kohl rabi'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 55,
      sowing_depth: 6,
      spacing: 15,
      frost_tolerance: 'Hardy',
      plant_height: 30,
      watering: 'Moderate',
    },
  },

  // ── ONION / SPRING ONION / SHALLOT / LEEK ────────────────────────────────
  {
    keywords: ['spring onion'],
    data: {
      planting_seasons: ['Spring', 'Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 60,
      sowing_depth: 6,
      spacing: 5,
      frost_tolerance: 'Hardy – tolerates frost',
      plant_height: 40,
      watering: 'Regular',
    },
  },
  {
    keywords: ['onion'],
    excludes: ['spring', 'shallot', 'bunching'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 120,
      sowing_depth: 6,
      spacing: 10,
      frost_tolerance: 'Hardy – tolerates frost',
      plant_height: 50,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['shallot'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 90,
      sowing_depth: 6,
      spacing: 10,
      frost_tolerance: 'Hardy',
      plant_height: 40,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['leek'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 140,
      sowing_depth: 12,
      spacing: 15,
      frost_tolerance: 'Very hardy – tolerates frost',
      plant_height: 50,
      watering: 'Moderate',
    },
  },

  // ── FENNEL ────────────────────────────────────────────────────────────────
  {
    keywords: ['fennel'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 90,
      sowing_depth: 6,
      spacing: 30,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 90,
      watering: 'Moderate',
    },
  },

  // ── CELERY / CELERIAC ─────────────────────────────────────────────────────
  {
    keywords: ['celery'],
    excludes: ['celeriac'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 120,
      sowing_depth: 3,
      spacing: 30,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 60,
      watering: 'Regular',
    },
  },
  {
    keywords: ['celeriac'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 150,
      sowing_depth: 3,
      spacing: 30,
      frost_tolerance: 'Hardy – tolerates frost',
      plant_height: 50,
      watering: 'Regular',
    },
  },

  // ── ROCKET ────────────────────────────────────────────────────────────────
  {
    keywords: ['rocket'],
    data: {
      planting_seasons: ['Spring', 'Autumn', 'Winter'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 30,
      sowing_depth: 3,
      spacing: 15,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 25,
      watering: 'Regular',
    },
  },

  // ── ENDIVE / RADICCHIO ────────────────────────────────────────────────────
  {
    keywords: ['endive'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 65,
      sowing_depth: 3,
      spacing: 25,
      frost_tolerance: 'Hardy',
      plant_height: 25,
      watering: 'Regular',
    },
  },
  {
    keywords: ['radicchio'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 70,
      sowing_depth: 3,
      spacing: 30,
      frost_tolerance: 'Hardy',
      plant_height: 25,
      watering: 'Regular',
    },
  },

  // ── CRESS / WATERCRESS ────────────────────────────────────────────────────
  {
    keywords: ['cress'],
    excludes: ['land cress'],
    data: {
      planting_seasons: ['Spring', 'Autumn', 'Winter'],
      sun_requirements: 'Part Shade',
      plant_life: 'Annual',
      days_to_germination: 5,
      days_to_harvest: 14,
      sowing_depth: 3,
      spacing: 5,
      frost_tolerance: 'Hardy',
      plant_height: 15,
      watering: 'Regular',
    },
  },
  {
    keywords: ['land cress'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Part Shade',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 40,
      sowing_depth: 3,
      spacing: 15,
      frost_tolerance: 'Hardy',
      plant_height: 20,
      watering: 'Regular',
    },
  },

  // ── ARTICHOKE ─────────────────────────────────────────────────────────────
  {
    keywords: ['artichoke'],
    excludes: ['jerusalem'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 14,
      days_to_harvest: 365,
      sowing_depth: 6,
      spacing: 90,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 150,
      watering: 'Moderate',
    },
  },

  // ── OKRA ──────────────────────────────────────────────────────────────────
  {
    keywords: ['okra'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 60,
      sowing_depth: 12,
      spacing: 40,
      frost_tolerance: 'Frost tender',
      plant_height: 120,
      watering: 'Moderate',
    },
  },

  // ── MUSTARD ───────────────────────────────────────────────────────────────
  {
    keywords: ['mustard'],
    excludes: ['sprouting'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 5,
      days_to_harvest: 30,
      sowing_depth: 6,
      spacing: 15,
      frost_tolerance: 'Hardy',
      plant_height: 40,
      watering: 'Moderate',
    },
  },

  // ── AMARANTH ──────────────────────────────────────────────────────────────
  {
    keywords: ['amaranth'],
    excludes: ['sprouting'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 50,
      sowing_depth: 3,
      spacing: 30,
      frost_tolerance: 'Frost tender',
      plant_height: 100,
      watering: 'Moderate',
    },
  },

  // ── ROSELLA ───────────────────────────────────────────────────────────────
  {
    keywords: ['rosella'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 150,
      sowing_depth: 6,
      spacing: 60,
      frost_tolerance: 'Frost tender',
      plant_height: 150,
      watering: 'Moderate',
    },
  },

  // ── CAPE GOOSEBERRY ───────────────────────────────────────────────────────
  {
    keywords: ['cape gooseberry'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 120,
      sowing_depth: 3,
      spacing: 90,
      frost_tolerance: 'Frost tender',
      plant_height: 90,
      watering: 'Moderate',
    },
  },

  // ── PASSIONFRUIT ──────────────────────────────────────────────────────────
  {
    keywords: ['passionfruit'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 21,
      days_to_harvest: 548,
      sowing_depth: 6,
      spacing: 300,
      frost_tolerance: 'Frost tender',
      plant_height: 500,
      watering: 'Regular',
    },
  },

  // ── PEANUT ────────────────────────────────────────────────────────────────
  {
    keywords: ['peanut'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 120,
      sowing_depth: 50,
      spacing: 30,
      frost_tolerance: 'Frost tender',
      plant_height: 40,
      watering: 'Moderate',
    },
  },

  // ── STRAWBERRY (seed) ─────────────────────────────────────────────────────
  {
    keywords: ['strawberry'],
    excludes: ['crown', 'crowns'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 21,
      days_to_harvest: 120,
      sowing_depth: 1,
      spacing: 30,
      frost_tolerance: 'Hardy – tolerates frost when dormant',
      plant_height: 20,
      watering: 'Regular',
    },
  },

  // ── GOJI BERRY ────────────────────────────────────────────────────────────
  {
    keywords: ['goji'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 14,
      days_to_harvest: 548,
      sowing_depth: 3,
      spacing: 120,
      frost_tolerance: 'Hardy – tolerates frost',
      plant_height: 200,
      watering: 'Low',
    },
  },

  // ── LUFFA ─────────────────────────────────────────────────────────────────
  {
    keywords: ['luffa'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 120,
      sowing_depth: 25,
      spacing: 100,
      frost_tolerance: 'Frost tender',
      plant_height: 400,
      watering: 'Regular',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HERBS
  // ─────────────────────────────────────────────────────────────────────────

  {
    keywords: ['basil'],
    excludes: ['thai'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 30,
      sowing_depth: 3,
      spacing: 20,
      frost_tolerance: 'Frost tender',
      plant_height: 40,
      watering: 'Regular',
    },
  },
  {
    keywords: ['thai'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 7,
      days_to_harvest: 30,
      sowing_depth: 3,
      spacing: 20,
      frost_tolerance: 'Frost tender',
      plant_height: 40,
      watering: 'Regular',
    },
  },
  {
    keywords: ['parsley'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Biennial',
      days_to_germination: 21,
      days_to_harvest: 70,
      sowing_depth: 3,
      spacing: 20,
      frost_tolerance: 'Hardy – tolerates frost',
      plant_height: 30,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['coriander'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 40,
      sowing_depth: 6,
      spacing: 15,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 50,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['dill'],
    data: {
      planting_seasons: ['Spring', 'Summer', 'Autumn'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 10,
      days_to_harvest: 40,
      sowing_depth: 6,
      spacing: 20,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 80,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['chives'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 14,
      days_to_harvest: 60,
      sowing_depth: 3,
      spacing: 20,
      frost_tolerance: 'Very hardy',
      plant_height: 30,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['mint'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 14,
      days_to_harvest: 60,
      sowing_depth: 3,
      spacing: 30,
      frost_tolerance: 'Hardy – dies back in winter, regrows',
      plant_height: 40,
      watering: 'Regular',
    },
  },
  {
    keywords: ['thyme'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 14,
      days_to_harvest: 90,
      sowing_depth: 3,
      spacing: 30,
      frost_tolerance: 'Hardy',
      plant_height: 20,
      watering: 'Low',
    },
  },
  {
    keywords: ['rosemary'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 21,
      days_to_harvest: 90,
      sowing_depth: 3,
      spacing: 60,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 120,
      watering: 'Low',
    },
  },
  {
    keywords: ['oregano'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 14,
      days_to_harvest: 60,
      sowing_depth: 3,
      spacing: 30,
      frost_tolerance: 'Hardy',
      plant_height: 40,
      watering: 'Low',
    },
  },
  {
    keywords: ['sage'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 14,
      days_to_harvest: 75,
      sowing_depth: 6,
      spacing: 45,
      frost_tolerance: 'Hardy',
      plant_height: 60,
      watering: 'Low',
    },
  },
  {
    keywords: ['tarragon'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 14,
      days_to_harvest: 60,
      sowing_depth: 3,
      spacing: 45,
      frost_tolerance: 'Hardy',
      plant_height: 60,
      watering: 'Low',
    },
  },
  {
    keywords: ['chervil'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Part Shade',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 50,
      sowing_depth: 3,
      spacing: 20,
      frost_tolerance: 'Hardy',
      plant_height: 40,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['lemon grass'],
    data: {
      planting_seasons: ['Spring', 'Summer'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 21,
      days_to_harvest: 90,
      sowing_depth: 6,
      spacing: 60,
      frost_tolerance: 'Frost tender',
      plant_height: 120,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['chamomile'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 60,
      sowing_depth: 1,
      spacing: 20,
      frost_tolerance: 'Hardy',
      plant_height: 30,
      watering: 'Low',
    },
  },
  {
    keywords: ['lemon balm'],
    data: {
      planting_seasons: ['Spring', 'Autumn'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 14,
      days_to_harvest: 60,
      sowing_depth: 3,
      spacing: 45,
      frost_tolerance: 'Hardy',
      plant_height: 50,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['stevia'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 14,
      days_to_harvest: 60,
      sowing_depth: 3,
      spacing: 45,
      frost_tolerance: 'Frost tender',
      plant_height: 60,
      watering: 'Moderate',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PRODUCE BULBS
  // ─────────────────────────────────────────────────────────────────────────

  {
    keywords: ['asparagus'],
    data: {
      planting_seasons: ['Winter', 'Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 21,
      days_to_harvest: 730,
      sowing_depth: 12,
      spacing: 40,
      frost_tolerance: 'Very hardy',
      plant_height: 150,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['garlic'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 180,
      sowing_depth: 50,
      spacing: 10,
      frost_tolerance: 'Hardy – tolerates frost',
      plant_height: 60,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['shallots golden'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 90,
      sowing_depth: 25,
      spacing: 15,
      frost_tolerance: 'Hardy',
      plant_height: 40,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['shallots red'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 90,
      sowing_depth: 25,
      spacing: 15,
      frost_tolerance: 'Hardy',
      plant_height: 40,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['echalion'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Annual',
      days_to_germination: 14,
      days_to_harvest: 90,
      sowing_depth: 25,
      spacing: 15,
      frost_tolerance: 'Hardy',
      plant_height: 40,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['strawberry'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 0,
      days_to_harvest: 120,
      sowing_depth: 0,
      spacing: 30,
      frost_tolerance: 'Hardy – tolerates frost when dormant',
      plant_height: 20,
      watering: 'Regular',
    },
  },
  {
    keywords: ['raspberry'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 0,
      days_to_harvest: 365,
      sowing_depth: 0,
      spacing: 60,
      frost_tolerance: 'Very hardy',
      plant_height: 150,
      watering: 'Regular',
    },
  },
  {
    keywords: ['blackberry'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 0,
      days_to_harvest: 365,
      sowing_depth: 0,
      spacing: 150,
      frost_tolerance: 'Very hardy',
      plant_height: 200,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['boysenberry'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 0,
      days_to_harvest: 365,
      sowing_depth: 0,
      spacing: 150,
      frost_tolerance: 'Hardy',
      plant_height: 200,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['loganberry'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 0,
      days_to_harvest: 365,
      sowing_depth: 0,
      spacing: 150,
      frost_tolerance: 'Hardy',
      plant_height: 200,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['tayberry'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 0,
      days_to_harvest: 365,
      sowing_depth: 0,
      spacing: 150,
      frost_tolerance: 'Hardy',
      plant_height: 200,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['youngberry'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 0,
      days_to_harvest: 365,
      sowing_depth: 0,
      spacing: 150,
      frost_tolerance: 'Hardy',
      plant_height: 200,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['red currant'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 0,
      days_to_harvest: 365,
      sowing_depth: 0,
      spacing: 120,
      frost_tolerance: 'Very hardy',
      plant_height: 150,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['black currant'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 0,
      days_to_harvest: 365,
      sowing_depth: 0,
      spacing: 120,
      frost_tolerance: 'Very hardy',
      plant_height: 150,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['gooseberry'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 0,
      days_to_harvest: 365,
      sowing_depth: 0,
      spacing: 120,
      frost_tolerance: 'Very hardy',
      plant_height: 120,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['elderberry'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 0,
      days_to_harvest: 548,
      sowing_depth: 0,
      spacing: 300,
      frost_tolerance: 'Very hardy',
      plant_height: 400,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['rhubarb'],
    data: {
      planting_seasons: ['Autumn', 'Winter'],
      sun_requirements: 'Full Sun to Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 0,
      days_to_harvest: 365,
      sowing_depth: 0,
      spacing: 90,
      frost_tolerance: 'Very hardy',
      plant_height: 80,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['ginger'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 14,
      days_to_harvest: 300,
      sowing_depth: 50,
      spacing: 30,
      frost_tolerance: 'Frost tender',
      plant_height: 100,
      watering: 'Regular',
    },
  },
  {
    keywords: ['turmeric'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 21,
      days_to_harvest: 300,
      sowing_depth: 50,
      spacing: 30,
      frost_tolerance: 'Frost tender',
      plant_height: 100,
      watering: 'Regular',
    },
  },
  {
    keywords: ['galangal'],
    data: {
      planting_seasons: ['Spring'],
      sun_requirements: 'Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 21,
      days_to_harvest: 365,
      sowing_depth: 50,
      spacing: 50,
      frost_tolerance: 'Frost tender',
      plant_height: 150,
      watering: 'Regular',
    },
  },
  {
    keywords: ['horseradish'],
    data: {
      planting_seasons: ['Autumn', 'Winter', 'Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 14,
      days_to_harvest: 180,
      sowing_depth: 50,
      spacing: 30,
      frost_tolerance: 'Very hardy',
      plant_height: 80,
      watering: 'Moderate',
    },
  },
  {
    keywords: ['wasabi'],
    data: {
      planting_seasons: ['Autumn', 'Spring'],
      sun_requirements: 'Part Shade',
      plant_life: 'Perennial',
      days_to_germination: 30,
      days_to_harvest: 548,
      sowing_depth: 12,
      spacing: 30,
      frost_tolerance: 'Hardy – tolerates light frost',
      plant_height: 50,
      watering: 'Regular',
    },
  },
  {
    keywords: ['artichoke jerusalem'],
    data: {
      planting_seasons: ['Winter', 'Spring'],
      sun_requirements: 'Full Sun',
      plant_life: 'Perennial',
      days_to_germination: 14,
      days_to_harvest: 180,
      sowing_depth: 100,
      spacing: 30,
      frost_tolerance: 'Very hardy',
      plant_height: 250,
      watering: 'Low',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SPROUTS & MICROGREENS (grown in trays – no outdoor spacing)
  // ─────────────────────────────────────────────────────────────────────────
  {
    keywords: ['sprout'],
    data: {
      planting_seasons: ['Spring', 'Summer', 'Autumn', 'Winter'],
      sun_requirements: 'Indirect Light',
      plant_life: 'Annual',
      days_to_germination: 2,
      days_to_harvest: 7,
      sowing_depth: 0,
      spacing: 0,
      frost_tolerance: 'Grown indoors',
      plant_height: 5,
      watering: 'Rinse daily',
    },
  },
  {
    keywords: ['sprouting'],
    data: {
      planting_seasons: ['Spring', 'Summer', 'Autumn', 'Winter'],
      sun_requirements: 'Indirect Light',
      plant_life: 'Annual',
      days_to_germination: 2,
      days_to_harvest: 7,
      sowing_depth: 0,
      spacing: 0,
      frost_tolerance: 'Grown indoors',
      plant_height: 5,
      watering: 'Rinse daily',
    },
  },
  {
    keywords: ['microgreen'],
    data: {
      planting_seasons: ['Spring', 'Summer', 'Autumn', 'Winter'],
      sun_requirements: 'Indirect Light / Sunny windowsill',
      plant_life: 'Annual',
      days_to_germination: 3,
      days_to_harvest: 14,
      sowing_depth: 0,
      spacing: 0,
      frost_tolerance: 'Grown indoors',
      plant_height: 10,
      watering: 'Mist daily',
    },
  },
  {
    keywords: ['cat grass'],
    data: {
      planting_seasons: ['Spring', 'Summer', 'Autumn', 'Winter'],
      sun_requirements: 'Sunny windowsill',
      plant_life: 'Annual',
      days_to_germination: 2,
      days_to_harvest: 10,
      sowing_depth: 0,
      spacing: 0,
      frost_tolerance: 'Grown indoors',
      plant_height: 15,
      watering: 'Mist daily',
    },
  },
  {
    keywords: ['wheatgrass'],
    data: {
      planting_seasons: ['Spring', 'Summer', 'Autumn', 'Winter'],
      sun_requirements: 'Sunny windowsill',
      plant_life: 'Annual',
      days_to_germination: 2,
      days_to_harvest: 10,
      sowing_depth: 0,
      spacing: 0,
      frost_tolerance: 'Grown indoors',
      plant_height: 15,
      watering: 'Mist daily',
    },
  },
  {
    keywords: ['alfalfa'],
    data: {
      planting_seasons: ['Spring', 'Summer', 'Autumn', 'Winter'],
      sun_requirements: 'Indirect Light',
      plant_life: 'Annual',
      days_to_germination: 2,
      days_to_harvest: 5,
      sowing_depth: 0,
      spacing: 0,
      frost_tolerance: 'Grown indoors',
      plant_height: 5,
      watering: 'Rinse daily',
    },
  },

];

// ─── FLOWERS ─────────────────────────────────────────────────────────────────
// Basic data for common flower groups.
// The detailed flowers_australia_temperate.json can be merged separately.

const FLOWER_DATA = [
  // ── MISSING VEGETABLES ───────────────────────────────────────────────────
  { keywords: ['kiwano'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 25, spacing: 120, frost_tolerance: 'Frost tender', plant_height: 30, watering: 'Moderate' } },
  { keywords: ['african horned'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 25, spacing: 120, frost_tolerance: 'Frost tender', plant_height: 30, watering: 'Moderate' } },
  { keywords: ['dwarf banjo'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 8, days_to_harvest: 55, sowing_depth: 25, spacing: 15, frost_tolerance: 'Frost tender', plant_height: 45, watering: 'Regular' } },
  { keywords: ['dwarf bronco'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 8, days_to_harvest: 55, sowing_depth: 25, spacing: 15, frost_tolerance: 'Frost tender', plant_height: 45, watering: 'Regular' } },

  // ── MORE FLOWERS ─────────────────────────────────────────────────────────
  { keywords: ['alyssum'], data: { planting_seasons: ['Autumn','Winter','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 7, days_to_harvest: 60, sowing_depth: 1, spacing: 20, frost_tolerance: 'Hardy', plant_height: 15, watering: 'Low' } },
  { keywords: ['marigold'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 7, days_to_harvest: 60, sowing_depth: 3, spacing: 25, frost_tolerance: 'Frost tender', plant_height: 40, watering: 'Low' } },
  { keywords: ['calendula'], data: { planting_seasons: ['Autumn','Winter','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 7, days_to_harvest: 50, sowing_depth: 6, spacing: 30, frost_tolerance: 'Hardy', plant_height: 40, watering: 'Low' } },
  { keywords: ['nasturtium'], data: { planting_seasons: ['Spring','Summer','Autumn'], sun_requirements: 'Full Sun to Part Shade', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 50, sowing_depth: 12, spacing: 30, frost_tolerance: 'Frost tender', plant_height: 30, watering: 'Low' } },
  { keywords: ['sunflower'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 7, days_to_harvest: 75, sowing_depth: 12, spacing: 40, frost_tolerance: 'Frost tender', plant_height: 150, watering: 'Low' } },
  { keywords: ['zinnia'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 7, days_to_harvest: 65, sowing_depth: 6, spacing: 30, frost_tolerance: 'Frost tender', plant_height: 60, watering: 'Moderate' } },
  { keywords: ['cosmos'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 7, days_to_harvest: 60, sowing_depth: 6, spacing: 45, frost_tolerance: 'Frost tender', plant_height: 100, watering: 'Low' } },
  { keywords: ['sweet pea'], data: { planting_seasons: ['Autumn','Winter'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 25, spacing: 15, frost_tolerance: 'Hardy', plant_height: 180, watering: 'Moderate' } },
  { keywords: ['borage'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 7, days_to_harvest: 50, sowing_depth: 12, spacing: 30, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Low' } },
  { keywords: ['lavender'], data: { planting_seasons: ['Spring'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 21, days_to_harvest: 120, sowing_depth: 1, spacing: 45, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Low' } },
  { keywords: ['poppy'], data: { planting_seasons: ['Autumn','Winter'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 90, sowing_depth: 1, spacing: 20, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Low' } },
  { keywords: ['pansy'], data: { planting_seasons: ['Autumn','Winter'], sun_requirements: 'Full Sun to Part Shade', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 60, sowing_depth: 3, spacing: 20, frost_tolerance: 'Hardy – tolerates frost', plant_height: 20, watering: 'Moderate' } },
  { keywords: ['viola'], data: { planting_seasons: ['Autumn','Winter'], sun_requirements: 'Full Sun to Part Shade', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 60, sowing_depth: 3, spacing: 15, frost_tolerance: 'Hardy', plant_height: 15, watering: 'Moderate' } },
  { keywords: ['petunia'], data: { planting_seasons: ['Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 60, sowing_depth: 1, spacing: 30, frost_tolerance: 'Frost tender', plant_height: 30, watering: 'Moderate' } },
  { keywords: ['snapdragon'], data: { planting_seasons: ['Autumn','Winter'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 1, spacing: 25, frost_tolerance: 'Hardy', plant_height: 45, watering: 'Moderate' } },
  { keywords: ['cornflower'], data: { planting_seasons: ['Autumn','Winter','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 6, spacing: 20, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Low' } },
  { keywords: ['dianthus'], data: { planting_seasons: ['Autumn','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 3, spacing: 20, frost_tolerance: 'Hardy', plant_height: 25, watering: 'Moderate' } },
  { keywords: ['carnation'], data: { planting_seasons: ['Autumn','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 3, spacing: 25, frost_tolerance: 'Hardy', plant_height: 40, watering: 'Moderate' } },
  { keywords: ['dahlia'], data: { planting_seasons: ['Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 90, sowing_depth: 6, spacing: 45, frost_tolerance: 'Frost tender', plant_height: 80, watering: 'Regular' } },
  { keywords: ['impatiens'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Part Shade', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 70, sowing_depth: 1, spacing: 25, frost_tolerance: 'Frost tender', plant_height: 30, watering: 'Regular' } },
  { keywords: ['foxglove'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun to Part Shade', plant_life: 'Biennial', days_to_germination: 14, days_to_harvest: 365, sowing_depth: 1, spacing: 40, frost_tolerance: 'Hardy', plant_height: 120, watering: 'Moderate' } },
  { keywords: ['hollyhock'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Biennial', days_to_germination: 10, days_to_harvest: 365, sowing_depth: 6, spacing: 45, frost_tolerance: 'Hardy', plant_height: 180, watering: 'Moderate' } },
  { keywords: ['delphinium'], data: { planting_seasons: ['Autumn','Spring'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 14, days_to_harvest: 120, sowing_depth: 3, spacing: 60, frost_tolerance: 'Hardy', plant_height: 150, watering: 'Regular' } },
  { keywords: ['lupin'], data: { planting_seasons: ['Autumn','Winter'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 100, sowing_depth: 12, spacing: 30, frost_tolerance: 'Hardy', plant_height: 90, watering: 'Low' } },
  { keywords: ['statice'], data: { planting_seasons: ['Autumn','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 3, spacing: 30, frost_tolerance: 'Hardy', plant_height: 50, watering: 'Low' } },
  { keywords: ['stock'], data: { planting_seasons: ['Autumn','Winter'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 3, spacing: 25, frost_tolerance: 'Hardy', plant_height: 50, watering: 'Moderate' } },
  { keywords: ['gypsophila'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 3, spacing: 30, frost_tolerance: 'Hardy', plant_height: 50, watering: 'Low' } },
  { keywords: ['aster'], data: { planting_seasons: ['Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 3, spacing: 30, frost_tolerance: 'Frost tender', plant_height: 60, watering: 'Moderate' } },
  { keywords: ['celosia'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 3, spacing: 25, frost_tolerance: 'Frost tender', plant_height: 40, watering: 'Moderate' } },
  { keywords: ['candytuft'], data: { planting_seasons: ['Autumn','Winter','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 60, sowing_depth: 6, spacing: 15, frost_tolerance: 'Hardy', plant_height: 25, watering: 'Low' } },
  { keywords: ['strawflower'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 7, days_to_harvest: 60, sowing_depth: 1, spacing: 30, frost_tolerance: 'Frost tender', plant_height: 60, watering: 'Low' } },
  { keywords: ['lisianthus'], data: { planting_seasons: ['Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 21, days_to_harvest: 150, sowing_depth: 1, spacing: 20, frost_tolerance: 'Frost tender', plant_height: 60, watering: 'Moderate' } },
  { keywords: ['nigella'], data: { planting_seasons: ['Autumn','Winter','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 3, spacing: 20, frost_tolerance: 'Hardy', plant_height: 40, watering: 'Low' } },
  { keywords: ['scabiosa'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 80, sowing_depth: 6, spacing: 30, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Moderate' } },
  { keywords: ['aquilegia'], data: { planting_seasons: ['Autumn','Spring'], sun_requirements: 'Full Sun to Part Shade', plant_life: 'Perennial', days_to_germination: 21, days_to_harvest: 180, sowing_depth: 3, spacing: 30, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Moderate' } },
  { keywords: ['aubrieta'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 21, days_to_harvest: 180, sowing_depth: 3, spacing: 25, frost_tolerance: 'Hardy', plant_height: 10, watering: 'Low' } },
  { keywords: ['agastache'], data: { planting_seasons: ['Spring'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 3, spacing: 45, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Low' } },
  { keywords: ['catmint'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 3, spacing: 45, frost_tolerance: 'Hardy', plant_height: 50, watering: 'Low' } },
  { keywords: ['catnip'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 3, spacing: 45, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Low' } },
  { keywords: ['african daisy'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 3, spacing: 25, frost_tolerance: 'Frost tender', plant_height: 40, watering: 'Low' } },
  { keywords: ['california poppy'], data: { planting_seasons: ['Autumn','Winter','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 80, sowing_depth: 3, spacing: 20, frost_tolerance: 'Hardy', plant_height: 30, watering: 'Low' } },
  { keywords: ['californian poppy'], data: { planting_seasons: ['Autumn','Winter','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 80, sowing_depth: 3, spacing: 20, frost_tolerance: 'Hardy', plant_height: 30, watering: 'Low' } },
  { keywords: ['daisy'], excludes: ['african', 'rottnest'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 3, spacing: 25, frost_tolerance: 'Hardy', plant_height: 40, watering: 'Moderate' } },
  { keywords: ['catananche'], data: { planting_seasons: ['Spring'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 3, spacing: 30, frost_tolerance: 'Hardy', plant_height: 50, watering: 'Low' } },
  { keywords: ['chrysanthemum'], data: { planting_seasons: ['Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 3, spacing: 40, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Moderate' } },
  { keywords: ['echinacea'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 21, days_to_harvest: 120, sowing_depth: 3, spacing: 45, frost_tolerance: 'Very hardy', plant_height: 80, watering: 'Low' } },
  { keywords: ['rudbeckia'], data: { planting_seasons: ['Spring'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 3, spacing: 45, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Low' } },
  { keywords: ['gaillardia'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 14, days_to_harvest: 80, sowing_depth: 3, spacing: 30, frost_tolerance: 'Hardy', plant_height: 40, watering: 'Low' } },
  { keywords: ['gazania'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 3, spacing: 25, frost_tolerance: 'Frost tender', plant_height: 25, watering: 'Low' } },
  { keywords: ['salvia'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 70, sowing_depth: 3, spacing: 30, frost_tolerance: 'Frost tender', plant_height: 50, watering: 'Moderate' } },
  { keywords: ['lobelia'], data: { planting_seasons: ['Spring'], sun_requirements: 'Full Sun to Part Shade', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 70, sowing_depth: 1, spacing: 15, frost_tolerance: 'Frost tender', plant_height: 15, watering: 'Regular' } },
  { keywords: ['verbena'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 21, days_to_harvest: 80, sowing_depth: 3, spacing: 30, frost_tolerance: 'Frost tender', plant_height: 30, watering: 'Moderate' } },
  { keywords: ['phlox'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 6, spacing: 25, frost_tolerance: 'Hardy', plant_height: 30, watering: 'Moderate' } },
  { keywords: ['forget-me-not'], data: { planting_seasons: ['Autumn','Winter'], sun_requirements: 'Part Shade', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 3, spacing: 20, frost_tolerance: 'Hardy', plant_height: 25, watering: 'Moderate' } },
  { keywords: ['larkspur'], data: { planting_seasons: ['Autumn','Winter'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 6, spacing: 25, frost_tolerance: 'Hardy', plant_height: 90, watering: 'Moderate' } },
  { keywords: ['linaria'], data: { planting_seasons: ['Autumn','Winter','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 1, spacing: 15, frost_tolerance: 'Hardy', plant_height: 30, watering: 'Low' } },
  { keywords: ['nemesia'], data: { planting_seasons: ['Autumn','Winter','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 60, sowing_depth: 3, spacing: 15, frost_tolerance: 'Hardy', plant_height: 25, watering: 'Moderate' } },
  { keywords: ['nemophila'], data: { planting_seasons: ['Autumn','Winter','Spring'], sun_requirements: 'Full Sun to Part Shade', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 60, sowing_depth: 3, spacing: 15, frost_tolerance: 'Hardy', plant_height: 20, watering: 'Moderate' } },
  { keywords: ['portulaca'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 60, sowing_depth: 1, spacing: 20, frost_tolerance: 'Frost tender', plant_height: 15, watering: 'Low' } },
  { keywords: ['feverfew'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 1, spacing: 40, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Low' } },
  { keywords: ['heartsease'], data: { planting_seasons: ['Autumn','Winter'], sun_requirements: 'Full Sun to Part Shade', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 70, sowing_depth: 3, spacing: 15, frost_tolerance: 'Hardy', plant_height: 15, watering: 'Moderate' } },
  { keywords: ['johnny jump up'], data: { planting_seasons: ['Autumn','Winter'], sun_requirements: 'Full Sun to Part Shade', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 70, sowing_depth: 3, spacing: 15, frost_tolerance: 'Hardy', plant_height: 15, watering: 'Moderate' } },
  { keywords: ['cleome'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 70, sowing_depth: 3, spacing: 45, frost_tolerance: 'Frost tender', plant_height: 90, watering: 'Low' } },
  { keywords: ['diascia'], data: { planting_seasons: ['Autumn','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 70, sowing_depth: 1, spacing: 20, frost_tolerance: 'Hardy', plant_height: 30, watering: 'Moderate' } },
  { keywords: ['coreopsis'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 14, days_to_harvest: 80, sowing_depth: 3, spacing: 30, frost_tolerance: 'Hardy', plant_height: 50, watering: 'Low' } },
  { keywords: ['mallow'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 80, sowing_depth: 6, spacing: 40, frost_tolerance: 'Hardy', plant_height: 90, watering: 'Low' } },
  { keywords: ['platycodon'], data: { planting_seasons: ['Spring'], sun_requirements: 'Full Sun to Part Shade', plant_life: 'Perennial', days_to_germination: 21, days_to_harvest: 120, sowing_depth: 3, spacing: 30, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Moderate' } },
  { keywords: ['pincushion'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 80, sowing_depth: 3, spacing: 30, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Moderate' } },
  { keywords: ['echinops'], data: { planting_seasons: ['Spring'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 21, days_to_harvest: 120, sowing_depth: 3, spacing: 60, frost_tolerance: 'Hardy', plant_height: 90, watering: 'Low' } },
  { keywords: ['xeranthemum'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 70, sowing_depth: 3, spacing: 20, frost_tolerance: 'Hardy', plant_height: 50, watering: 'Low' } },
  { keywords: ['veronica'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 21, days_to_harvest: 120, sowing_depth: 1, spacing: 30, frost_tolerance: 'Hardy', plant_height: 40, watering: 'Moderate' } },
  { keywords: ['cineraria'], data: { planting_seasons: ['Autumn','Winter'], sun_requirements: 'Part Shade', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 1, spacing: 25, frost_tolerance: 'Hardy', plant_height: 40, watering: 'Regular' } },
  { keywords: ['poached egg'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 10, days_to_harvest: 50, sowing_depth: 3, spacing: 15, frost_tolerance: 'Hardy', plant_height: 30, watering: 'Low' } },
  { keywords: ['bergamot'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 21, days_to_harvest: 90, sowing_depth: 3, spacing: 45, frost_tolerance: 'Hardy', plant_height: 80, watering: 'Moderate' } },
  { keywords: ['irish moss'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun to Part Shade', plant_life: 'Perennial', days_to_germination: 21, days_to_harvest: 90, sowing_depth: 1, spacing: 20, frost_tolerance: 'Hardy', plant_height: 5, watering: 'Regular' } },
  { keywords: ['cynoglossum'], data: { planting_seasons: ['Autumn','Winter','Spring'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 70, sowing_depth: 6, spacing: 30, frost_tolerance: 'Hardy', plant_height: 50, watering: 'Moderate' } },
  { keywords: ['cactus mix'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 21, days_to_harvest: 365, sowing_depth: 1, spacing: 20, frost_tolerance: 'Frost tender', plant_height: 30, watering: 'Low' } },
  { keywords: ['dichondra'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun to Part Shade', plant_life: 'Perennial', days_to_germination: 21, days_to_harvest: 90, sowing_depth: 3, spacing: 15, frost_tolerance: 'Hardy', plant_height: 5, watering: 'Moderate' } },
  { keywords: ['erigeron'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 3, spacing: 30, frost_tolerance: 'Hardy', plant_height: 30, watering: 'Low' } },
  { keywords: ['daucus'], data: { planting_seasons: ['Spring','Summer'], sun_requirements: 'Full Sun', plant_life: 'Annual', days_to_germination: 14, days_to_harvest: 90, sowing_depth: 3, spacing: 30, frost_tolerance: 'Hardy', plant_height: 60, watering: 'Low' } },
  { keywords: ['eucalyptus'], data: { planting_seasons: ['Spring'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 21, days_to_harvest: 730, sowing_depth: 1, spacing: 300, frost_tolerance: 'Hardy', plant_height: 600, watering: 'Low' } },
  { keywords: ['kangaroo paw'], data: { planting_seasons: ['Spring','Autumn'], sun_requirements: 'Full Sun', plant_life: 'Perennial', days_to_germination: 30, days_to_harvest: 365, sowing_depth: 3, spacing: 60, frost_tolerance: 'Hardy – tolerates light frost', plant_height: 100, watering: 'Low' } },
];

// Combine all rules
const ALL_RULES = [...PLANT_DATA, ...FLOWER_DATA];

// ─── BEST MONTHS LOOKUP ───────────────────────────────────────────────────────
// Maps a keyword (checked against lowercased title) to the best sowing months
// for Australian temperate climate (Sydney / Melbourne / Adelaide).
// More specific keywords must come BEFORE general ones (e.g. 'broad bean' before 'bean').
// ─────────────────────────────────────────────────────────────────────────────
const BEST_MONTHS = [
  // Overrides
  ['all year round',       'Any time'],
  // Sprouts / microgreens
  ['microgreen',           'Any time'],
  ['wheatgrass',           'Any time'],
  ['cat grass',            'Any time'],
  ['alfalfa',              'Any time'],
  ['sprouting',            'Any time'],
  ['sprout',               'Any time'],
  // Tomatoes
  ['tiny tom',             'Oct – Nov'],
  ['honeybee tomato',      'Oct – Nov'],
  ['tommy toe',            'Oct – Nov'],
  ['tomatillo',            'Oct – Nov'],
  ['tomato',               'Oct – Nov'],
  // Capsicum / chilli / eggplant
  ['super hot chilli',     'Sep – Oct'],
  ['capsicum',             'Sep – Oct'],
  ['chilli',               'Sep – Oct'],
  ['eggplant',             'Sep – Oct'],
  // Beans
  ['broad bean',           'Apr – Jun'],
  ['bean, broad',          'Apr – Jun'],
  ['scarlet runner bean',  'Oct – Dec'],
  ['snake bean',           'Oct – Dec'],
  ['soy bean',             'Oct – Nov'],
  ['bean, butter',         'Oct – Dec'],
  ['bean, dwarf',          'Oct – Dec'],
  ['dwarf bean',           'Oct – Dec'],
  ['dwarf banjo',          'Oct – Dec'],
  ['dwarf bronco',         'Oct – Dec'],
  ['bean',                 'Oct – Dec'],
  // Peas (sweet pea is a flower, must come before generic 'pea')
  ['sweet pea',            'Mar – Jun'],
  ['snow pea',             'Mar – May, Aug – Sep'],
  ['sugar snap',           'Mar – May, Aug – Sep'],
  ['winged pea',           'Mar – May, Aug – Sep'],
  ['pea',                  'Mar – May, Aug – Sep'],
  // Cucurbits
  ['cucamelon',            'Oct – Nov'],
  ['cucumber',             'Oct – Dec'],
  ['zucchini',             'Oct – Dec'],
  ['pumpkin',              'Sep – Nov'],
  ['squash',               'Oct – Dec'],
  ['marrow',               'Oct – Dec'],
  ['luffa',                'Oct – Nov'],
  ['bitter melon',         'Oct – Nov'],
  ['gourd',                'Oct – Nov'],
  ['watermelon',           'Oct – Dec'],
  ['rockmelon',            'Oct – Nov'],
  ['melon',                'Oct – Nov'],
  // Corn
  ['sweet corn',           'Oct – Dec'],
  // Leafy greens
  ['malabar',              'Oct – Nov'],
  ['kang kong',            'Oct – Dec'],
  ['egyptian spinach',     'Oct – Nov'],
  ['perpetual',            'Mar – May, Sep – Oct'],
  ['silverbeet',           'Mar – May, Sep – Oct'],
  ['silver beet',          'Mar – May, Sep – Oct'],
  ['spinach',              'Mar – May, Aug – Sep'],
  ['kale',                 'Feb – Apr, Aug – Sep'],
  ['mesclun',              'Mar – May, Sep – Oct'],
  ['lettuce',              'Mar – May, Sep – Oct'],
  ['rocket',               'Mar – May, Sep – Oct'],
  ['endive',               'Mar – May, Sep – Oct'],
  ['radicchio',            'Mar – May'],
  ['land cress',           'Mar – May'],
  ['cress',                'Mar – May, Sep – Oct'],
  // Brassicas
  ['broccoletti',          'Feb – Apr'],
  ['broccoli',             'Feb – Apr'],
  ['cauliflower',          'Feb – Apr'],
  ['brussels',             'Jan – Mar'],
  ['kailaan',              'Mar – May, Aug – Oct'],
  ['choy sum',             'Mar – May, Aug – Oct'],
  ['chopsuey',             'Mar – May, Aug – Oct'],
  ['pak choi',             'Mar – May, Aug – Oct'],
  ['bok choi',             'Mar – May, Aug – Oct'],
  ['chinese cabbage',      'Mar – May'],
  ['cabbage',              'Feb – Apr'],
  // Root veg
  ['rat tail radish',      'Sep – Nov'],
  ['daikon',               'Mar – May'],
  ['radish',               'Mar – May, Sep – Nov'],
  ['parsnip',              'Mar – May'],
  ['swede',                'Feb – Apr'],
  ['kohl rabi',            'Mar – May, Aug – Sep'],
  ['turnip',               'Mar – May'],
  ['beetroot',             'Mar – May, Sep – Oct'],
  ['carrot',               'Mar – May, Sep – Oct'],
  // Alliums
  ['spring onion',         'Mar – May, Sep – Oct'],
  ['shallots golden',      'Apr – Jun'],
  ['shallots red',         'Apr – Jun'],
  ['echalion',             'Apr – Jun'],
  ['shallot',              'Mar – May'],
  ['leek',                 'Mar – May'],
  ['onion',                'Mar – Apr'],
  // Other veg
  ['celeriac',             'Aug – Sep'],
  ['celery',               'Mar – May, Sep – Oct'],
  ['fennel',               'Mar – May, Sep – Oct'],
  ['artichoke jerusalem',  'Jul – Sep'],
  ['artichoke',            'Aug – Oct'],
  ['okra',                 'Oct – Nov'],
  ['mustard',              'Mar – May, Sep – Oct'],
  ['amaranth',             'Oct – Nov'],
  ['rosella',              'Oct – Nov'],
  ['cape gooseberry',      'Sep – Oct'],
  ['passionfruit',         'Sep – Oct'],
  ['peanut',               'Oct – Nov'],
  ['goji',                 'Sep – Oct'],
  ['kiwano',               'Oct – Nov'],
  ['african horned',       'Oct – Nov'],
  // Strawberry seed vs crown (crowns go in Jun-Aug)
  ['strawberry temptation','Sep – Oct'],
  ['strawberry red',       'Jun – Aug'],
  ['strawberry',           'Jun – Aug'],
  // Herbs
  ['basil',                'Oct – Dec'],
  ['thai',                 'Oct – Dec'],
  ['coriander',            'Mar – May, Sep – Oct'],
  ['chervil',              'Mar – May, Aug – Sep'],
  ['parsley',              'Mar – May, Sep – Oct'],
  ['dill',                 'Sep – Nov, Mar – Apr'],
  ['chives',               'Sep – Oct, Mar – Apr'],
  ['mint',                 'Sep – Oct'],
  ['thyme',                'Sep – Oct, Mar – Apr'],
  ['rosemary',             'Sep – Oct, Mar – Apr'],
  ['oregano',              'Sep – Oct, Mar – Apr'],
  ['sage',                 'Sep – Oct'],
  ['tarragon',             'Sep – Oct'],
  ['lemon grass',          'Oct – Nov'],
  ['chamomile',            'Sep – Oct, Mar – Apr'],
  ['lemon balm',           'Sep – Oct, Mar – Apr'],
  ['stevia',               'Sep – Oct'],
  // Produce bulbs
  ['asparagus',            'Jun – Aug'],
  ['garlic',               'Apr – Jun'],
  ['raspberry',            'Jun – Aug'],
  ['blackberry',           'Jun – Aug'],
  ['boysenberry',          'Jun – Aug'],
  ['loganberry',           'Jun – Aug'],
  ['tayberry',             'Jun – Aug'],
  ['youngberry',           'Jun – Aug'],
  ['red currant',          'Jun – Aug'],
  ['black currant',        'Jun – Aug'],
  ['gooseberry',           'Jun – Aug'],
  ['elderberry',           'Jun – Aug'],
  ['rhubarb',              'Jun – Aug'],
  ['ginger',               'Sep – Oct'],
  ['turmeric',             'Sep – Oct'],
  ['galangal',             'Sep – Oct'],
  ['horseradish',          'Jun – Aug'],
  ['wasabi',               'Mar – May, Sep – Oct'],
  // Flowers
  ['california poppy',     'Mar – May, Sep – Oct'],
  ['californian poppy',    'Mar – May, Sep – Oct'],
  ['forget-me-not',        'Mar – May'],
  ['larkspur',             'Mar – May'],
  ['poppy',                'Mar – May'],
  ['pansy',                'Mar – May'],
  ['viola',                'Mar – May'],
  ['snapdragon',           'Mar – May'],
  ['stock',                'Mar – May'],
  ['cineraria',            'Mar – May'],
  ['heartsease',           'Mar – May'],
  ['johnny jump up',       'Mar – May'],
  ['nemesia',              'Mar – May, Sep – Oct'],
  ['nemophila',            'Mar – May, Sep – Oct'],
  ['candytuft',            'Mar – May, Sep – Oct'],
  ['nigella',              'Mar – May, Sep – Oct'],
  ['cornflower',           'Mar – May, Sep – Oct'],
  ['linaria',              'Mar – May, Sep – Oct'],
  ['foxglove',             'Sep – Nov'],
  ['hollyhock',            'Sep – Nov'],
  ['lupin',                'Mar – Jun'],
  ['nasturtium',           'Sep – Nov'],
  ['marigold',             'Sep – Nov'],
  ['sunflower',            'Oct – Dec'],
  ['zinnia',               'Oct – Nov'],
  ['cosmos',               'Oct – Nov'],
  ['celosia',              'Oct – Nov'],
  ['portulaca',            'Oct – Dec'],
  ['strawflower',          'Sep – Nov'],
  ['salvia',               'Sep – Nov'],
  ['gazania',              'Sep – Nov'],
  ['dahlia',               'Sep – Nov'],
  ['daucus',               'Sep – Nov'],
  ['impatiens',            'Sep – Oct'],
  ['petunia',              'Sep – Oct'],
  ['lobelia',              'Sep – Oct'],
  ['lisianthus',           'Sep – Oct'],
  ['aster',                'Sep – Oct'],
  ['agastache',            'Sep – Oct'],
  ['echinacea',            'Sep – Oct'],
  ['rudbeckia',            'Sep – Oct'],
  ['chrysanthemum',        'Sep – Oct'],
  ['catananche',           'Sep – Oct'],
  ['echinops',             'Sep – Oct'],
  ['eucalyptus',           'Sep – Oct'],
  ['platycodon',           'Sep – Oct'],
  ['cactus mix',           'Oct – Nov'],
  ['xeranthemum',          'Oct – Nov'],
  ['dichondra',            'Oct – Nov'],
  ['cleome',               'Oct – Nov'],
  ['aquilegia',            'Mar – May, Sep – Oct'],
  ['dianthus',             'Mar – May, Sep – Oct'],
  ['carnation',            'Mar – May, Sep – Oct'],
  ['statice',              'Mar – May, Sep – Oct'],
  ['scabiosa',             'Sep – Oct, Mar – Apr'],
  ['delphinium',           'Mar – Apr, Sep – Oct'],
  ['gaillardia',           'Sep – Oct, Mar – Apr'],
  ['coreopsis',            'Sep – Oct, Mar – Apr'],
  ['phlox',                'Sep – Oct, Mar – Apr'],
  ['pincushion',           'Sep – Oct, Mar – Apr'],
  ['gypsophila',           'Sep – Oct, Mar – Apr'],
  ['catmint',              'Sep – Oct, Mar – Apr'],
  ['catnip',               'Sep – Oct, Mar – Apr'],
  ['borage',               'Sep – Oct, Mar – Apr'],
  ['aubrieta',             'Sep – Oct, Mar – Apr'],
  ['feverfew',             'Sep – Oct, Mar – Apr'],
  ['mallow',               'Sep – Oct, Mar – Apr'],
  ['bergamot',             'Sep – Oct, Mar – Apr'],
  ['irish moss',           'Sep – Oct, Mar – Apr'],
  ['poached egg',          'Sep – Oct, Mar – Apr'],
  ['verbena',              'Sep – Oct'],
  ['diascia',              'Mar – May, Sep – Oct'],
  ['veronica',             'Mar – May, Sep – Oct'],
  ['cynoglossum',          'Mar – May, Sep – Oct'],
  ['erigeron',             'Sep – Oct, Mar – Apr'],
  ['lavender',             'Sep – Oct'],
  ['african daisy',        'Sep – Nov'],
  ['daisy',                'Sep – Oct, Mar – Apr'],
  ['calendula',            'Mar – May, Sep – Oct'],
  ['alyssum',              'Mar – May, Sep – Oct'],
  ['kangaroo paw',         'Sep – Oct, Mar – Apr'],
];

// Look up best months by matching the first keyword found in the title
function findBestMonths(title) {
  const lower = title.toLowerCase()
    .replace(/\s*seed tape\s*/g, ' ')
    .replace(/\s*seed mat\s*/g, ' ')
    .trim();
  for (const [keyword, months] of BEST_MONTHS) {
    if (lower.includes(keyword)) return months;
  }
  return null;
}

// ─── MATCHING FUNCTION ────────────────────────────────────────────────────────
function findMatch(title) {
  // Strip format suffixes so "Beetroot Boltardy Seed Tape" matches the beetroot rule
  const lower = title.toLowerCase()
    .replace(/\s*seed tape\s*/g, ' ')
    .replace(/\s*seed mat\s*/g, ' ')
    .trim();
  for (const rule of ALL_RULES) {
    const allKeywordsMatch = rule.keywords.every(kw => lower.includes(kw));
    if (!allKeywordsMatch) continue;
    const anyExcludeMatch = (rule.excludes || []).some(ex => lower.includes(ex));
    if (anyExcludeMatch) continue;
    return rule.data;
  }
  return null;
}

// ─── APPLY DATA ───────────────────────────────────────────────────────────────
// Fills null/empty fields — but always overwrites planting_seasons,
// since the original scrape was unreliable for that field specifically.
function applyData(plant, enrichmentData) {
  let changed = false;
  for (const [field, value] of Object.entries(enrichmentData)) {
    const current = plant[field];
    const isEmpty = current === null || current === undefined ||
                    (Array.isArray(current) && current.length === 0);
    const alwaysOverwrite = field === 'planting_seasons';
    if (isEmpty || alwaysOverwrite) {
      plant[field] = value;
      changed = true;
    }
  }
  return changed;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const isDryRun = process.argv.includes('--dry-run');
const dataPath = path.join(__dirname, '..', 'src', 'data', 'seeds.json');

console.log(`Reading ${dataPath}...`);
const plants = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let matched = 0;
let unmatched = 0;
const unmatchedTitles = [];

for (const plant of plants) {
  // Skip bundle/kit products, mixes, and native wildflowers
  const skipKeywords = [
    'bundle', 'mix pack', 'multipack', 'starter pack', 'gift',
    'little gardeners', 'mystery pack', 'foraging mix',
    'wildflower', 'wildflowers', 'green manure',
    'splash of', 'cottage garden mix', 'bee and butterfly', 'butterfly garden',
    'beneficial insect', 'rockery flower', 'mixed annuals',
  ];
  const isBundle = skipKeywords.some(kw => plant.title.toLowerCase().includes(kw));
  if (isBundle) continue;

  const enrichmentData = findMatch(plant.title);
  if (enrichmentData) {
    applyData(plant, enrichmentData);
    matched++;
  } else {
    unmatched++;
    unmatchedTitles.push(`[${plant.category}] ${plant.title}`);
  }

  // Apply best_months — always overwrite (same logic as planting_seasons)
  const bestMonths = findBestMonths(plant.title);
  if (bestMonths) plant.best_months = bestMonths;
}

console.log(`\nResults:`);
console.log(`  Matched:   ${matched}`);
console.log(`  Unmatched: ${unmatched}`);

if (unmatchedTitles.length > 0) {
  console.log(`\nUnmatched plants (no rule found):`);
  unmatchedTitles.forEach(t => console.log(`  - ${t}`));
}

if (isDryRun) {
  console.log('\n[DRY RUN] seeds.json was NOT modified.');
} else {
  fs.writeFileSync(dataPath, JSON.stringify(plants, null, 2), 'utf8');
  console.log(`\nseeds.json updated successfully.`);
}
