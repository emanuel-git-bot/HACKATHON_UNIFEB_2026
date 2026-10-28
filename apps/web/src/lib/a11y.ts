import { useState } from "react";

export interface A11yPrefs {
  large: boolean;
  contrast: boolean;
  reduceMotion: boolean;
}

const KEY = "campusfeb_a11y";
const DEFAULTS: A11yPrefs = { large: false, contrast: false, reduceMotion: false };

function read(): A11yPrefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<A11yPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

/** Aplica as preferências como classes no <html> (ver index.css). */
export function applyA11yPrefs(prefs: A11yPrefs = read()) {
  const root = document.documentElement;
  root.classList.toggle("a11y-large", prefs.large);
  root.classList.toggle("a11y-contrast", prefs.contrast);
  root.classList.toggle("a11y-reduce-motion", prefs.reduceMotion);
}

export function useA11yPrefs() {
  const [prefs, setPrefs] = useState<A11yPrefs>(read);
  function update(patch: Partial<A11yPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    applyA11yPrefs(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* sem storage: vale só nesta visita */
    }
  }
  return { prefs, update };
}
