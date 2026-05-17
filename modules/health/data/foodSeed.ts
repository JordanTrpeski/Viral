import { db } from '@core/db/database'
import * as Crypto from 'expo-crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeedFood {
  name: string
  brand?: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g?: number
  barcode?: string
}

// ─── Food Database ────────────────────────────────────────────────────────────
// 100 common foods, all values per 100g.

const FOODS: SeedFood[] = [

  // ── Proteins — Meat & Poultry ─────────────────────────────────────────────
  { name: 'Chicken Breast (cooked)',    caloriesPer100g: 165, proteinPer100g: 31.0, carbsPer100g: 0.0, fatPer100g: 3.6 },
  { name: 'Chicken Thigh (cooked)',     caloriesPer100g: 209, proteinPer100g: 26.0, carbsPer100g: 0.0, fatPer100g: 10.9 },
  { name: 'Ground Beef (lean, cooked)', caloriesPer100g: 215, proteinPer100g: 21.0, carbsPer100g: 0.0, fatPer100g: 14.0 },
  { name: 'Beef Steak (lean, cooked)',  caloriesPer100g: 250, proteinPer100g: 26.0, carbsPer100g: 0.0, fatPer100g: 15.0 },
  { name: 'Turkey Breast (cooked)',     caloriesPer100g: 135, proteinPer100g: 30.0, carbsPer100g: 0.0, fatPer100g: 1.0 },
  { name: 'Pork Tenderloin (cooked)',   caloriesPer100g: 143, proteinPer100g: 26.0, carbsPer100g: 0.0, fatPer100g: 3.5 },
  { name: 'Lamb (lean, cooked)',        caloriesPer100g: 258, proteinPer100g: 25.0, carbsPer100g: 0.0, fatPer100g: 17.0 },

  // ── Proteins — Seafood ────────────────────────────────────────────────────
  { name: 'Salmon (baked)',             caloriesPer100g: 208, proteinPer100g: 20.0, carbsPer100g: 0.0, fatPer100g: 13.0 },
  { name: 'Tuna (canned in water)',     caloriesPer100g: 116, proteinPer100g: 26.0, carbsPer100g: 0.0, fatPer100g: 1.0 },
  { name: 'Cod (baked)',                caloriesPer100g: 105, proteinPer100g: 23.0, carbsPer100g: 0.0, fatPer100g: 0.9 },
  { name: 'Shrimp (cooked)',            caloriesPer100g: 85,  proteinPer100g: 18.0, carbsPer100g: 1.0, fatPer100g: 1.0 },
  { name: 'Sardines (canned)',          caloriesPer100g: 208, proteinPer100g: 25.0, carbsPer100g: 0.0, fatPer100g: 11.0 },
  { name: 'Tilapia (baked)',            caloriesPer100g: 128, proteinPer100g: 26.0, carbsPer100g: 0.0, fatPer100g: 2.7 },

  // ── Proteins — Eggs & Dairy ───────────────────────────────────────────────
  { name: 'Eggs (whole)',               caloriesPer100g: 155, proteinPer100g: 13.0, carbsPer100g: 1.1, fatPer100g: 11.0 },
  { name: 'Egg White',                  caloriesPer100g: 52,  proteinPer100g: 11.0, carbsPer100g: 0.7, fatPer100g: 0.2 },
  { name: 'Cottage Cheese (low fat)',   caloriesPer100g: 98,  proteinPer100g: 11.0, carbsPer100g: 3.4, fatPer100g: 4.3 },
  { name: 'Greek Yogurt (0%)',          caloriesPer100g: 59,  proteinPer100g: 10.0, carbsPer100g: 3.6, fatPer100g: 0.4 },
  { name: 'Greek Yogurt (full fat)',    caloriesPer100g: 115, proteinPer100g: 9.0,  carbsPer100g: 4.0, fatPer100g: 5.0 },

  // ── Proteins — Plant-Based ────────────────────────────────────────────────
  { name: 'Tofu (firm)',                caloriesPer100g: 76,  proteinPer100g: 8.0,  carbsPer100g: 1.9, fatPer100g: 4.2 },
  { name: 'Tempeh',                     caloriesPer100g: 193, proteinPer100g: 19.0, carbsPer100g: 9.0, fatPer100g: 11.0 },
  { name: 'Edamame',                    caloriesPer100g: 121, proteinPer100g: 11.0, carbsPer100g: 8.9, fatPer100g: 5.2 },

  // ── Proteins — Powders ────────────────────────────────────────────────────
  { name: 'Whey Protein Powder',        caloriesPer100g: 370, proteinPer100g: 80.0, carbsPer100g: 5.0, fatPer100g: 4.0 },
  { name: 'Plant Protein Powder',       caloriesPer100g: 360, proteinPer100g: 70.0, carbsPer100g: 8.0, fatPer100g: 6.0 },

  // ── Dairy ─────────────────────────────────────────────────────────────────
  { name: 'Milk (whole)',               caloriesPer100g: 61,  proteinPer100g: 3.2,  carbsPer100g: 4.8, fatPer100g: 3.3 },
  { name: 'Milk (skim)',                caloriesPer100g: 34,  proteinPer100g: 3.4,  carbsPer100g: 5.0, fatPer100g: 0.2 },
  { name: 'Cheddar Cheese',             caloriesPer100g: 402, proteinPer100g: 25.0, carbsPer100g: 1.3, fatPer100g: 33.0 },
  { name: 'Mozzarella',                 caloriesPer100g: 280, proteinPer100g: 28.0, carbsPer100g: 2.2, fatPer100g: 17.0 },
  { name: 'Parmesan',                   caloriesPer100g: 431, proteinPer100g: 38.0, carbsPer100g: 4.1, fatPer100g: 29.0 },
  { name: 'Butter',                     caloriesPer100g: 717, proteinPer100g: 0.9,  carbsPer100g: 0.1, fatPer100g: 81.0 },
  { name: 'Heavy Cream',                caloriesPer100g: 345, proteinPer100g: 2.8,  carbsPer100g: 2.8, fatPer100g: 37.0 },

  // ── Grains & Carbs ────────────────────────────────────────────────────────
  { name: 'White Rice (cooked)',        caloriesPer100g: 130, proteinPer100g: 2.7,  carbsPer100g: 28.0, fatPer100g: 0.3, fiberPer100g: 0.4 },
  { name: 'Brown Rice (cooked)',        caloriesPer100g: 111, proteinPer100g: 2.6,  carbsPer100g: 23.0, fatPer100g: 0.9, fiberPer100g: 1.8 },
  { name: 'Oats (dry)',                 caloriesPer100g: 389, proteinPer100g: 17.0, carbsPer100g: 66.0, fatPer100g: 7.0, fiberPer100g: 10.6 },
  { name: 'Pasta (cooked)',             caloriesPer100g: 158, proteinPer100g: 5.8,  carbsPer100g: 31.0, fatPer100g: 0.9, fiberPer100g: 1.8 },
  { name: 'White Bread',               caloriesPer100g: 265, proteinPer100g: 9.0,  carbsPer100g: 49.0, fatPer100g: 3.2, fiberPer100g: 2.7 },
  { name: 'Whole Wheat Bread',         caloriesPer100g: 247, proteinPer100g: 13.0, carbsPer100g: 41.0, fatPer100g: 4.2, fiberPer100g: 6.8 },
  { name: 'Sourdough Bread',           caloriesPer100g: 269, proteinPer100g: 9.0,  carbsPer100g: 51.0, fatPer100g: 2.7, fiberPer100g: 2.4 },
  { name: 'Quinoa (cooked)',            caloriesPer100g: 120, proteinPer100g: 4.4,  carbsPer100g: 22.0, fatPer100g: 1.9, fiberPer100g: 2.8 },
  { name: 'Potato (boiled)',            caloriesPer100g: 87,  proteinPer100g: 1.9,  carbsPer100g: 20.0, fatPer100g: 0.1, fiberPer100g: 1.8 },
  { name: 'Sweet Potato (baked)',       caloriesPer100g: 90,  proteinPer100g: 2.0,  carbsPer100g: 21.0, fatPer100g: 0.1, fiberPer100g: 3.3 },
  { name: 'Corn',                       caloriesPer100g: 86,  proteinPer100g: 3.3,  carbsPer100g: 19.0, fatPer100g: 1.4, fiberPer100g: 2.7 },
  { name: 'Bagel',                      caloriesPer100g: 270, proteinPer100g: 10.0, carbsPer100g: 53.0, fatPer100g: 1.6, fiberPer100g: 2.3 },
  { name: 'Granola',                    caloriesPer100g: 471, proteinPer100g: 10.0, carbsPer100g: 64.0, fatPer100g: 20.0, fiberPer100g: 6.7 },
  { name: 'Tortilla (flour)',           caloriesPer100g: 294, proteinPer100g: 7.7,  carbsPer100g: 50.0, fatPer100g: 7.3, fiberPer100g: 2.1 },

  // ── Vegetables ────────────────────────────────────────────────────────────
  { name: 'Broccoli',                   caloriesPer100g: 34,  proteinPer100g: 2.8,  carbsPer100g: 7.0,  fatPer100g: 0.4, fiberPer100g: 2.6 },
  { name: 'Spinach',                    caloriesPer100g: 23,  proteinPer100g: 2.9,  carbsPer100g: 3.6,  fatPer100g: 0.4, fiberPer100g: 2.2 },
  { name: 'Kale',                       caloriesPer100g: 49,  proteinPer100g: 4.3,  carbsPer100g: 9.0,  fatPer100g: 0.9, fiberPer100g: 3.6 },
  { name: 'Tomato',                     caloriesPer100g: 18,  proteinPer100g: 0.9,  carbsPer100g: 3.9,  fatPer100g: 0.2, fiberPer100g: 1.2 },
  { name: 'Cucumber',                   caloriesPer100g: 15,  proteinPer100g: 0.7,  carbsPer100g: 3.6,  fatPer100g: 0.1, fiberPer100g: 0.5 },
  { name: 'Carrot',                     caloriesPer100g: 41,  proteinPer100g: 0.9,  carbsPer100g: 10.0, fatPer100g: 0.2, fiberPer100g: 2.8 },
  { name: 'Onion',                      caloriesPer100g: 40,  proteinPer100g: 1.1,  carbsPer100g: 9.3,  fatPer100g: 0.1, fiberPer100g: 1.7 },
  { name: 'Bell Pepper',                caloriesPer100g: 31,  proteinPer100g: 1.0,  carbsPer100g: 6.0,  fatPer100g: 0.3, fiberPer100g: 2.1 },
  { name: 'Mushroom',                   caloriesPer100g: 22,  proteinPer100g: 3.1,  carbsPer100g: 3.3,  fatPer100g: 0.3, fiberPer100g: 1.0 },
  { name: 'Asparagus',                  caloriesPer100g: 20,  proteinPer100g: 2.2,  carbsPer100g: 3.9,  fatPer100g: 0.1, fiberPer100g: 2.1 },
  { name: 'Zucchini',                   caloriesPer100g: 17,  proteinPer100g: 1.2,  carbsPer100g: 3.1,  fatPer100g: 0.3, fiberPer100g: 1.0 },
  { name: 'Cauliflower',                caloriesPer100g: 25,  proteinPer100g: 1.9,  carbsPer100g: 5.0,  fatPer100g: 0.3, fiberPer100g: 2.0 },
  { name: 'Green Beans',               caloriesPer100g: 31,  proteinPer100g: 1.8,  carbsPer100g: 7.0,  fatPer100g: 0.2, fiberPer100g: 3.4 },
  { name: 'Avocado',                    caloriesPer100g: 160, proteinPer100g: 2.0,  carbsPer100g: 9.0,  fatPer100g: 15.0, fiberPer100g: 6.7 },
  { name: 'Garlic',                     caloriesPer100g: 149, proteinPer100g: 6.4,  carbsPer100g: 33.0, fatPer100g: 0.5, fiberPer100g: 2.1 },
  { name: 'Lettuce (romaine)',          caloriesPer100g: 17,  proteinPer100g: 1.2,  carbsPer100g: 3.3,  fatPer100g: 0.3, fiberPer100g: 2.1 },

  // ── Fruits ────────────────────────────────────────────────────────────────
  { name: 'Banana',                     caloriesPer100g: 89,  proteinPer100g: 1.1,  carbsPer100g: 23.0, fatPer100g: 0.3, fiberPer100g: 2.6 },
  { name: 'Apple',                      caloriesPer100g: 52,  proteinPer100g: 0.3,  carbsPer100g: 14.0, fatPer100g: 0.2, fiberPer100g: 2.4 },
  { name: 'Orange',                     caloriesPer100g: 47,  proteinPer100g: 0.9,  carbsPer100g: 12.0, fatPer100g: 0.1, fiberPer100g: 2.4 },
  { name: 'Strawberry',                 caloriesPer100g: 32,  proteinPer100g: 0.7,  carbsPer100g: 7.7,  fatPer100g: 0.3, fiberPer100g: 2.0 },
  { name: 'Blueberry',                  caloriesPer100g: 57,  proteinPer100g: 0.7,  carbsPer100g: 14.0, fatPer100g: 0.3, fiberPer100g: 2.4 },
  { name: 'Watermelon',                 caloriesPer100g: 30,  proteinPer100g: 0.6,  carbsPer100g: 7.6,  fatPer100g: 0.2, fiberPer100g: 0.4 },
  { name: 'Mango',                      caloriesPer100g: 60,  proteinPer100g: 0.8,  carbsPer100g: 15.0, fatPer100g: 0.4, fiberPer100g: 1.6 },
  { name: 'Pineapple',                  caloriesPer100g: 50,  proteinPer100g: 0.5,  carbsPer100g: 13.0, fatPer100g: 0.1, fiberPer100g: 1.4 },
  { name: 'Pear',                       caloriesPer100g: 57,  proteinPer100g: 0.4,  carbsPer100g: 15.0, fatPer100g: 0.1, fiberPer100g: 3.1 },
  { name: 'Kiwi',                       caloriesPer100g: 61,  proteinPer100g: 1.1,  carbsPer100g: 15.0, fatPer100g: 0.5, fiberPer100g: 3.0 },
  { name: 'Raspberry',                  caloriesPer100g: 52,  proteinPer100g: 1.2,  carbsPer100g: 12.0, fatPer100g: 0.7, fiberPer100g: 6.5 },
  { name: 'Cherry',                     caloriesPer100g: 63,  proteinPer100g: 1.1,  carbsPer100g: 16.0, fatPer100g: 0.2, fiberPer100g: 2.1 },

  // ── Legumes ───────────────────────────────────────────────────────────────
  { name: 'Black Beans (cooked)',       caloriesPer100g: 132, proteinPer100g: 8.9,  carbsPer100g: 24.0, fatPer100g: 0.5, fiberPer100g: 8.7 },
  { name: 'Chickpeas (cooked)',         caloriesPer100g: 164, proteinPer100g: 8.9,  carbsPer100g: 27.0, fatPer100g: 2.6, fiberPer100g: 7.6 },
  { name: 'Lentils (cooked)',           caloriesPer100g: 116, proteinPer100g: 9.0,  carbsPer100g: 20.0, fatPer100g: 0.4, fiberPer100g: 7.9 },
  { name: 'Kidney Beans (cooked)',      caloriesPer100g: 127, proteinPer100g: 8.7,  carbsPer100g: 23.0, fatPer100g: 0.5, fiberPer100g: 6.4 },
  { name: 'Peanut Butter',             caloriesPer100g: 588, proteinPer100g: 25.0, carbsPer100g: 20.0, fatPer100g: 50.0, fiberPer100g: 6.0 },
  { name: 'Almond Butter',             caloriesPer100g: 614, proteinPer100g: 21.0, carbsPer100g: 19.0, fatPer100g: 55.0, fiberPer100g: 10.0 },
  { name: 'Hummus',                     caloriesPer100g: 177, proteinPer100g: 8.2,  carbsPer100g: 20.0, fatPer100g: 9.6, fiberPer100g: 6.0 },

  // ── Nuts & Seeds ──────────────────────────────────────────────────────────
  { name: 'Almonds',                    caloriesPer100g: 579, proteinPer100g: 21.0, carbsPer100g: 22.0, fatPer100g: 50.0, fiberPer100g: 12.5 },
  { name: 'Walnuts',                    caloriesPer100g: 654, proteinPer100g: 15.0, carbsPer100g: 14.0, fatPer100g: 65.0, fiberPer100g: 6.7 },
  { name: 'Cashews',                    caloriesPer100g: 553, proteinPer100g: 18.0, carbsPer100g: 30.0, fatPer100g: 44.0, fiberPer100g: 3.3 },
  { name: 'Peanuts',                    caloriesPer100g: 567, proteinPer100g: 26.0, carbsPer100g: 16.0, fatPer100g: 49.0, fiberPer100g: 8.5 },
  { name: 'Pistachios',                 caloriesPer100g: 562, proteinPer100g: 20.0, carbsPer100g: 28.0, fatPer100g: 45.0, fiberPer100g: 10.3 },
  { name: 'Chia Seeds',                 caloriesPer100g: 486, proteinPer100g: 17.0, carbsPer100g: 42.0, fatPer100g: 31.0, fiberPer100g: 34.4 },
  { name: 'Flaxseeds',                  caloriesPer100g: 534, proteinPer100g: 18.0, carbsPer100g: 29.0, fatPer100g: 42.0, fiberPer100g: 27.3 },
  { name: 'Sunflower Seeds',            caloriesPer100g: 584, proteinPer100g: 21.0, carbsPer100g: 20.0, fatPer100g: 51.0, fiberPer100g: 8.6 },

  // ── Oils & Fats ───────────────────────────────────────────────────────────
  { name: 'Olive Oil',                  caloriesPer100g: 884, proteinPer100g: 0.0,  carbsPer100g: 0.0, fatPer100g: 100.0 },
  { name: 'Coconut Oil',                caloriesPer100g: 892, proteinPer100g: 0.0,  carbsPer100g: 0.0, fatPer100g: 100.0 },
  { name: 'Avocado Oil',                caloriesPer100g: 884, proteinPer100g: 0.0,  carbsPer100g: 0.0, fatPer100g: 100.0 },

  // ── Condiments & Sauces ───────────────────────────────────────────────────
  { name: 'Ketchup',                    caloriesPer100g: 112, proteinPer100g: 1.5,  carbsPer100g: 26.0, fatPer100g: 0.1 },
  { name: 'Mayonnaise',                 caloriesPer100g: 680, proteinPer100g: 0.9,  carbsPer100g: 0.6,  fatPer100g: 75.0 },
  { name: 'Soy Sauce',                  caloriesPer100g: 53,  proteinPer100g: 8.1,  carbsPer100g: 5.0,  fatPer100g: 0.1 },
  { name: 'Hot Sauce',                  caloriesPer100g: 12,  proteinPer100g: 0.5,  carbsPer100g: 1.7,  fatPer100g: 0.2 },
  { name: 'Honey',                      caloriesPer100g: 304, proteinPer100g: 0.3,  carbsPer100g: 82.0, fatPer100g: 0.0 },

  // ── Other / Packaged ──────────────────────────────────────────────────────
  { name: 'Dark Chocolate (70%+)',      caloriesPer100g: 598, proteinPer100g: 7.8,  carbsPer100g: 46.0, fatPer100g: 43.0, fiberPer100g: 10.9 },
  { name: 'Protein Bar (avg)',          caloriesPer100g: 350, proteinPer100g: 20.0, carbsPer100g: 40.0, fatPer100g: 10.0, fiberPer100g: 4.0 },
  { name: 'Granola Bar',                caloriesPer100g: 454, proteinPer100g: 7.0,  carbsPer100g: 64.0, fatPer100g: 19.0, fiberPer100g: 4.0 },
  { name: 'Rice Cake (plain)',          caloriesPer100g: 387, proteinPer100g: 7.3,  carbsPer100g: 82.0, fatPer100g: 2.8, fiberPer100g: 2.9 },
  { name: 'Olive (black)',              caloriesPer100g: 115, proteinPer100g: 0.8,  carbsPer100g: 6.0,  fatPer100g: 11.0 },
  { name: 'Pickle (cucumber)',          caloriesPer100g: 11,  proteinPer100g: 0.3,  carbsPer100g: 2.3,  fatPer100g: 0.2, fiberPer100g: 0.5 },

]

// ─── Seed function ────────────────────────────────────────────────────────────

export function seedFoodsIfNeeded(): void {
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM foods')
  if (row && row.count > 0) return

  const now = new Date().toISOString()

  for (const food of FOODS) {
    db.runSync(
      `INSERT INTO foods (
        id, name, brand, calories_per_100g, protein_per_100g,
        carbs_per_100g, fat_per_100g, fiber_per_100g,
        is_custom, barcode, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        Crypto.randomUUID(),
        food.name,
        food.brand ?? null,
        food.caloriesPer100g,
        food.proteinPer100g,
        food.carbsPer100g,
        food.fatPer100g,
        food.fiberPer100g ?? null,
        food.barcode ?? null,
        now,
      ],
    )
  }
}
