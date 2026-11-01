import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "er-live-map:prefs:v3";

export interface Preferences {
  mapId: string | null;
  hiddenCategories: ReadonlySet<number>;
  hideFound: boolean;
  sidebarOpen: boolean;
  expandedGroups: ReadonlySet<number> | null;
}

interface StoredPreferences {
  mapId?: string | null;
  hiddenCategories?: number[];
  hideFound?: boolean;
  sidebarOpen?: boolean;
  expandedGroups?: number[] | null;
}

function readPreferences(): Preferences {
  let stored: StoredPreferences = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as StoredPreferences;
  } catch {
    stored = {};
  }
  return {
    mapId: stored.mapId ?? null,
    hiddenCategories: new Set(stored.hiddenCategories ?? []),
    hideFound: stored.hideFound ?? false,
    sidebarOpen: stored.sidebarOpen ?? true,
    expandedGroups: stored.expandedGroups ? new Set(stored.expandedGroups) : null,
  };
}

export function usePreferences() {
  const [preferences, setPreferences] = useState(readPreferences);

  useEffect(() => {
    const stored: StoredPreferences = {
      ...preferences,
      hiddenCategories: [...preferences.hiddenCategories],
      expandedGroups: preferences.expandedGroups && [...preferences.expandedGroups],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [preferences]);

  const update = useCallback((changes: Partial<Preferences>) => {
    setPreferences((current) => ({ ...current, ...changes }));
  }, []);

  const setCategoriesHidden = useCallback((categoryIds: number[], hidden: boolean) => {
    setPreferences((current) => {
      const hiddenCategories = new Set(current.hiddenCategories);
      for (const id of categoryIds) {
        if (hidden) hiddenCategories.add(id);
        else hiddenCategories.delete(id);
      }
      return { ...current, hiddenCategories };
    });
  }, []);

  return { preferences, update, setCategoriesHidden };
}
