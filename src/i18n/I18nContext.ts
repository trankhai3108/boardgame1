import { createContext } from 'react';
import type { Lang } from './types';

export interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /**
   * Looks up `key`. `fallback` is the English already carried by the data, so
   * an untranslated string degrades to English rather than to the raw key.
   */
  t: (key: string, fallback?: string) => string;
  /** Translates a whole array of data lines in one call. */
  tList: (keyFor: (i: number) => string, fallback: readonly string[]) => string[];
}

export const I18nContext = createContext<I18nValue | null>(null);
