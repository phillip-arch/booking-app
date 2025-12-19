import type { LanguageCode } from "./translations";

const SUPPORTED: LanguageCode[] = [
  "de",
  "en",
  "sr",
  "hr",
  "tr",
  "uk",
  "ru",
  "fr",
  "it",
  "hu",
];

const FALLBACK: LanguageCode = "de";

export function detectBrowserLanguage(): LanguageCode {
  const languages =
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];

  for (const lang of languages) {
    const base = lang.toLowerCase().split("-")[0] as LanguageCode;
    if (SUPPORTED.includes(base)) {
      return base;
    }
  }

  return FALLBACK;
}