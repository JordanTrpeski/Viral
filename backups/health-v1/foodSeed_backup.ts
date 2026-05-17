import { db } from '@core/db/database'
import { dbInsertFood, dbGetFoodCount } from '@core/db/dietQueries'
import * as Crypto from 'expo-crypto'

// Each entry: [name, brand?, cal, protein, carbs, fat, fiber?] per 100g
type SeedRow = [string] | [string, string | null, number, number, number, number, number?]

const FOODS: [string, string | null, number, number, number, number, number?][] = [
  // ── Proteins ──────────────────────────────────────────────────────────────
  ['Chicken Breast (cooked)', null, 165, 31, 0, 3.6],
  ['Chicken Thigh (cooked)', null, 209, 26, 0, 10.9],
  ['Beef (lean, cooked)', null, 250, 26, 0, 15],
  ['Beef Mince (lean)', null, 215, 21, 0, 14],
  ['Salmon (baked)', null, 208, 20, 0, 13],
  ['Tuna (canned in water)', null, 116, 26, 0, 1],
  ['Cod (baked)', null, 105, 23, 0, 0.9],
  ['Shrimp (cooked)', null, 85, 18, 1, 1],
  ['Sardines (canned)', null, 208, 25, 0, 11],
  ['Eggs (whole)', null, 155, 13, 1.1, 11],
  ['Egg White', null, 52, 11, 0.7, 0.2],
  ['Pork Tenderloin (cooked)', null, 143, 26, 0, 3.5],
  ['Turkey Breast (cooked)', null, 135, 30, 0, 1],
  ['Lamb (lean, cooked)', null, 258, 25, 0, 17],
  ['Cottage Cheese (low fat)', null, 98, 11, 3.4, 4.3],
  ['Greek Yogurt (0%)', null, 59, 10, 3.6, 0.4],
  ['Greek Yogurt (full fat)', null, 115, 9, 4, 5],
  ['Tofu (firm)', null, 76, 8, 1.9, 4.2],
  ['Tempeh', null, 193, 19, 9, 11],
  ['Edamame', null, 121, 11, 8.9, 5.2],
  ['Whey Protein Powder', null, 370, 80, 5, 4],
  ['Plant Protein Powder', null, 360, 70, 8, 6],

  // ── Dairy ─────────────────────────────────────────────────────────────────
  ['Milk (whole)', null, 61, 3.2, 4.8, 3.3],
  ['Milk (skim)', null, 34, 3.4, 5, 0.2],
  ['Cheddar Cheese', null, 402, 25, 1.3, 33],
  ['Mozzarella', null, 280, 28, 2.2, 17],
  ['Parmesan', null, 431, 38, 4.1, 29],
  ['Butter', null, 717, 0.9, 0.1, 81],
  ['Cream Cheese', null, 342, 6, 4.1, 34],
  ['Heavy Cream', null, 345, 2.8, 2.8, 37],
  ['Sour Cream', null, 198, 2.4, 4.6, 19],
  ['Ice Cream (vanilla)', null, 207, 3.5, 24, 11],

  // ── Grains & Carbs ────────────────────────────────────────────────────────
  ['White Rice (cooked)', null, 130, 2.7, 28, 0.3, 0.4],
  ['Brown Rice (cooked)', null, 111, 2.6, 23, 0.9, 1.8],
  ['Oats (dry)', null, 389, 17, 66, 7, 10.6],
  ['Pasta (cooked)', null, 158, 5.8, 31, 0.9, 1.8],
  ['Spaghetti (cooked)', null, 158, 5.8, 31, 0.9, 1.8],
  ['White Bread', null, 265, 9, 49, 3.2, 2.7],
  ['Whole Wheat Bread', null, 247, 13, 41, 4.2, 6.8],
  ['Sourdough Bread', null, 269, 9, 51, 2.7, 2.4],
  ['Quinoa (cooked)', null, 120, 4.4, 22, 1.9, 2.8],
  ['Potato (boiled)', null, 87, 1.9, 20, 0.1, 1.8],
  ['Sweet Potato (baked)', null, 90, 2, 21, 0.1, 3.3],
  ['Corn', null, 86, 3.3, 19, 1.4, 2.7],
  ['Bagel', null, 270, 10, 53, 1.6, 2.3],
  ['Granola', null, 471, 10, 64, 20, 6.7],
  ['Tortilla (flour)', null, 294, 7.7, 50, 7.3, 2.1],
  ['Crackers (whole wheat)', null, 413, 9, 68, 12, 7.5],

  // ── Vegetables ────────────────────────────────────────────────────────────
  ['Broccoli', null, 34, 2.8, 7, 0.4, 2.6],
  ['Spinach', null, 23, 2.9, 3.6, 0.4, 2.2],
  ['Kale', null, 49, 4.3, 9, 0.9, 3.6],
  ['Tomato', null, 18, 0.9, 3.9, 0.2, 1.2],
  ['Cucumber', null, 15, 0.7, 3.6, 0.1, 0.5],
  ['Carrot', null, 41, 0.9, 10, 0.2, 2.8],
  ['Onion', null, 40, 1.1, 9.3, 0.1, 1.7],
  ['Bell Pepper', null, 31, 1, 6, 0.3, 2.1],
  ['Lettuce (romaine)', null, 17, 1.2, 3.3, 0.3, 2.1],
  ['Mushroom', null, 22, 3.1, 3.3, 0.3, 1],
  ['Asparagus', null, 20, 2.2, 3.9, 0.1, 2.1],
  ['Zucchini', null, 17, 1.2, 3.1, 0.3, 1],
  ['Cauliflower', null, 25, 1.9, 5, 0.3, 2],
  ['Green Beans', null, 31, 1.8, 7, 0.2, 3.4],
  ['Peas', null, 81, 5.4, 14, 0.4, 5.1],
  ['Celery', null, 16, 0.7, 3, 0.2, 1.6],
  ['Garlic', null, 149, 6.4, 33, 0.5, 2.1],
  ['Avocado', null, 160, 2, 9, 15, 6.7],

  // ── Fruits ───────────────────────────────────────────────────────────────
  ['Banana', null, 89, 1.1, 23, 0.3, 2.6],
  ['Apple', null, 52, 0.3, 14, 0.2, 2.4],
  ['Orange', null, 47, 0.9, 12, 0.1, 2.4],
  ['Strawberry', null, 32, 0.7, 7.7, 0.3, 2],
  ['Blueberry', null, 57, 0.7, 14, 0.3, 2.4],
  ['Grape', null, 67, 0.6, 17, 0.4, 0.9],
  ['Watermelon', null, 30, 0.6, 7.6, 0.2, 0.4],
  ['Mango', null, 60, 0.8, 15, 0.4, 1.6],
  ['Pineapple', null, 50, 0.5, 13, 0.1, 1.4],
  ['Peach', null, 39, 0.9, 10, 0.3, 1.5],
  ['Pear', null, 57, 0.4, 15, 0.1, 3.1],
  ['Kiwi', null, 61, 1.1, 15, 0.5, 3],
  ['Cherry', null, 63, 1.1, 16, 0.2, 2.1],
  ['Raspberry', null, 52, 1.2, 12, 0.7, 6.5],

  // ── Legumes ───────────────────────────────────────────────────────────────
  ['Black Beans (cooked)', null, 132, 8.9, 24, 0.5, 8.7],
  ['Chickpeas (cooked)', null, 164, 8.9, 27, 2.6, 7.6],
  ['Lentils (cooked)', null, 116, 9, 20, 0.4, 7.9],
  ['Kidney Beans (cooked)', null, 127, 8.7, 23, 0.5, 6.4],
  ['Peanut Butter', null, 588, 25, 20, 50, 6],
  ['Almond Butter', null, 614, 21, 19, 55, 10],
  ['Hummus', null, 177, 8.2, 20, 9.6, 6],

  // ── Nuts & Seeds ──────────────────────────────────────────────────────────
  ['Almonds', null, 579, 21, 22, 50, 12.5],
  ['Walnuts', null, 654, 15, 14, 65, 6.7],
  ['Cashews', null, 553, 18, 30, 44, 3.3],
  ['Peanuts', null, 567, 26, 16, 49, 8.5],
  ['Pistachios', null, 562, 20, 28, 45, 10.3],
  ['Brazil Nuts', null, 659, 14, 12, 67, 7.5],
  ['Chia Seeds', null, 486, 17, 42, 31, 34.4],
  ['Flaxseeds', null, 534, 18, 29, 42, 27.3],
  ['Sunflower Seeds', null, 584, 21, 20, 51, 8.6],

  // ── Oils & Fats ───────────────────────────────────────────────────────────
  ['Olive Oil', null, 884, 0, 0, 100],
  ['Coconut Oil', null, 892, 0, 0, 100],
  ['Avocado Oil', null, 884, 0, 0, 100],

  // ── Sauces & Condiments ───────────────────────────────────────────────────
  ['Ketchup', null, 112, 1.5, 26, 0.1],
  ['Mayonnaise', null, 680, 0.9, 0.6, 75],
  ['Soy Sauce', null, 53, 8.1, 5, 0.1],
  ['Hot Sauce', null, 12, 0.5, 1.7, 0.2],
  ['Ranch Dressing', null, 547, 1.5, 5, 57],
  ['Balsamic Vinegar', null, 88, 0.5, 17, 0],
  ['Honey', null, 304, 0.3, 82, 0],
  ['Maple Syrup', null, 260, 0, 67, 0.1],

  // ── Other ─────────────────────────────────────────────────────────────────
  ['Dark Chocolate (70%+)', null, 598, 7.8, 46, 43, 10.9],
  ['Milk Chocolate', null, 535, 7.6, 59, 30, 3.4],
  ['Protein Bar (avg)', null, 350, 20, 40, 10, 4],
  ['Granola Bar', null, 454, 7, 64, 19, 4],
  ['Olive (black)', null, 115, 0.8, 6, 11],
  ['Pickle (cucumber)', null, 11, 0.3, 2.3, 0.2, 0.5],
]

export function seedFoodsIfNeeded(): void {
  if (dbGetFoodCount() > 0) return

  const now = new Date().toISOString()
  for (const [name, brand, cal, protein, carbs, fat, fiber] of FOODS) {
    dbInsertFood({
      id: Crypto.randomUUID(),
      name,
      brand: brand ?? undefined,
      caloriesPer100g: cal,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
      fiberPer100g: fiber,
      isCustom: false,
      createdAt: now,
    })
  }
}
