import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from 'react';
import { translations, LanguageCode } from '../translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const STORAGE_KEY = 'app_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  // Load language from localStorage on first mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (stored && translations[stored]) {
      setLanguageState(stored);
    }
  }, []);

  // Save language to localStorage when it changes
  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  const t = (
    key: string,
    params?: Record<string, string | number>
  ): string => {
    // 1️⃣ Try selected language
    // 2️⃣ Fallback to English
    // 3️⃣ Fallback to key itself
    let text =
      translations[language]?.[key] ??
      translations.en?.[key] ??
      key;

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(
          new RegExp(`{${paramKey}}`, 'g'),
          String(value)
        );
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
