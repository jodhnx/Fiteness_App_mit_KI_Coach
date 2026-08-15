/** Module-level exercise picker lists — must clear on account switch. */

type ListsCache = {
  recent: unknown[];
  favorites: unknown[];
  frequent: unknown[];
  loadedAt: number;
};

let listsCache: ListsCache | null = null;

export function getExercisePickerListsCache(): ListsCache | null {
  return listsCache;
}

export function setExercisePickerListsCache(next: ListsCache) {
  listsCache = next;
}

export function clearExercisePickerListsCache() {
  listsCache = null;
}
