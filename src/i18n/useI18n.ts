import { useContext } from 'react';
import { I18nContext, type I18nValue } from './I18nContext';

/** Translator for the current language. Must be used inside <I18nProvider>. */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
