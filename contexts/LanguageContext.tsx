// contexts/LanguageContext.tsx
import React, { createContext, useEffect, useMemo, useState, useContext, ReactNode } from 'react';
import { translations, LanguageCode } from '../translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const STORAGE_KEY = 'app_language';

const isLanguageCode = (val: string): val is LanguageCode => {
  return Object.prototype.hasOwnProperty.call(translations, val);
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  // Load saved language once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isLanguageCode(saved)) {
        setLanguageState(saved);
      }
    } catch {
      // ignore (SSR / privacy mode)
    }
  }, []);

  // Persist whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
      // Optional: keep <html lang=".."> in sync
      if (typeof document !== 'undefined') {
        document.documentElement.lang = language;
      }
    } catch {
      // ignore
    }
  }, [language]);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
  };

  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>): string => {
      let text = translations[language]?.[key] ?? translations.en?.[key] ?? key;

      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
        }
      }
      return text;
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
