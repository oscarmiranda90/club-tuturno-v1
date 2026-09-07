import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { darkTheme, lightTheme, type Theme } from './colors';

export type Appearance = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  appearance: Appearance;
  setAppearance: (next: Appearance) => void;
  toggleAppearance: () => void;
}

/**
 * Light is the product's look, so it is the default and it does NOT follow the
 * OS: a user whose phone is dark still opens Tu Turno in light. Dark is a
 * choice the user makes here, not one the system makes for them.
 */
const DEFAULT_APPEARANCE: Appearance = 'light';
const STORAGE_KEY = 'tuturno.appearance';

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  appearance: DEFAULT_APPEARANCE,
  setAppearance: () => {},
  toggleAppearance: () => {},
});

/**
 * Appearance state for the whole app.
 *
 * This is the single place the theme is decided. Every component reads it
 * through `useTheme()` and none of them know a preference exists — which is
 * what made switching the entire app a one-line change while it was still a
 * constant, and is what makes it a real setting now without touching a screen.
 *
 * The choice is persisted, because an appearance setting that resets on every
 * launch is not a setting. Reading storage is async, so the first frame renders
 * in the default and corrects itself — for a colour scheme that flash is
 * acceptable; blocking the app behind a disk read is not.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>(DEFAULT_APPEARANCE);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') setAppearanceState(stored);
      })
      // A missing or unreadable preference is not an error worth surfacing:
      // the default is a perfectly good answer.
      .catch(() => {});
  }, []);

  const setAppearance = useCallback((next: Appearance) => {
    setAppearanceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleAppearance = useCallback(() => {
    setAppearanceState((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: appearance === 'dark' ? darkTheme : lightTheme,
      appearance,
      setAppearance,
      toggleAppearance,
    }),
    [appearance, setAppearance, toggleAppearance],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * The tokens for the active appearance.
 *
 * Signature unchanged from when this returned a constant, so no component
 * needed editing to gain a runtime theme.
 */
export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

/** The appearance control, for the settings screen. */
export function useAppearance() {
  const { appearance, setAppearance, toggleAppearance } = useContext(ThemeContext);
  return { appearance, setAppearance, toggleAppearance };
}

export { darkTheme, lightTheme };
