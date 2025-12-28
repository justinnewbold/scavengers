import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import de from './locales/de';

export type Locale = 'en' | 'es' | 'fr' | 'de';

const translations: Record<Locale, typeof en> = {
  en,
  es,
  fr,
  de,
};

const LOCALE_KEY = 'app_locale';

class I18n {
  private currentLocale: Locale = 'en';
  private listeners: Set<(locale: Locale) => void> = new Set();

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(LOCALE_KEY);
      if (stored && this.isValidLocale(stored)) {
        this.currentLocale = stored as Locale;
      }
    } catch {
      // Use default locale
    }
  }

  private isValidLocale(locale: string): locale is Locale {
    return ['en', 'es', 'fr', 'de'].includes(locale);
  }

  getLocale(): Locale {
    return this.currentLocale;
  }

  async setLocale(locale: Locale): Promise<void> {
    this.currentLocale = locale;
    await AsyncStorage.setItem(LOCALE_KEY, locale);
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentLocale));
  }

  onLocaleChange(callback: (locale: Locale) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: unknown = translations[this.currentLocale];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        // Fallback to English
        value = translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = (value as Record<string, unknown>)[fallbackKey];
          } else {
            return key; // Return key if not found
          }
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters
    if (params) {
      return Object.entries(params).reduce(
        (str, [param, val]) => str.replace(new RegExp(`{{${param}}}`, 'g'), String(val)),
        value
      );
    }

    return value;
  }

  getAvailableLocales(): { code: Locale; name: string }[] {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
      { code: 'fr', name: 'Français' },
      { code: 'de', name: 'Deutsch' },
    ];
  }
}

export const i18n = new I18n();
export const t = (key: string, params?: Record<string, string | number>) => i18n.t(key, params);
