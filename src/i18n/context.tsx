import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { I18nContext, type I18nValue } from './I18nContext';
import { EN } from './en';
import { VI } from './vi';
import type { Dict, Lang } from './types';

const DICTS: Record<Lang, Dict> = { en: EN, vi: VI };
const STORAGE_KEY = 'dicethrone.lang';

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'vi') return stored;
    if (navigator.language?.toLowerCase().startsWith('vi')) return 'vi';
  } catch {
    // Private mode or blocked storage: fall through to the default.
  }
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not being able to remember the choice is not worth failing over.
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dict = DICTS[lang];
    const t = (key: string, fallback?: string) => dict[key] ?? fallback ?? EN[key] ?? key;
    return {
      lang,
      setLang,
      t,
      tList: (keyFor, fallback) => fallback.map((line, i) => t(keyFor(i), line)),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
