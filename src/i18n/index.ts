export * from './types';
export * from './I18nContext';
export * from './context';
export * from './useI18n';
export { EN } from './en';
export { VI } from './vi';

/** Fills `{placeholder}` slots in a translated string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
}
