export type ShoppingItem = {
  id: string;
  name: string;
  done: boolean;
};

const KEY = "nexform:shopping-list-v1";

export function loadShoppingList(): ShoppingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ShoppingItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveShoppingList(items: ShoppingItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 80)));
}
