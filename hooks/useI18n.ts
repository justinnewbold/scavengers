import { useState, useEffect, useCallback } from 'react';
import { i18n, t as translate, Locale } from '@/lib/i18n';

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(i18n.getLocale());
  const [, forceUpdate] = useState({});

  useEffect(() => {
    // Initialize i18n on mount
    i18n.initialize();

    // Listen for locale changes
    const unsubscribe = i18n.onLocaleChange((newLocale) => {
      setLocaleState(newLocale);
      forceUpdate({});
    });

    return unsubscribe;
  }, []);

  const setLocale = useCallback(async (newLocale: Locale) => {
    await i18n.setLocale(newLocale);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(key, params);
  }, []);

  return {
    locale,
    setLocale,
    t,
    availableLocales: i18n.getAvailableLocales(),
  };
}
