export const CATEGORIES = [
  { id: "food", label: "Food & drinks", emoji: "🍜" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "rent", label: "Rent & bills", emoji: "🏠" },
  { id: "groceries", label: "Groceries", emoji: "🛒" },
  { id: "fun", label: "Fun", emoji: "🎉" },
  { id: "other", label: "Other", emoji: "🧾" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export function getCategory(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
