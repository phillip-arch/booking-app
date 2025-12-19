import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import App from "./App";
import { useLanguage } from "./contexts/LanguageContext";
import { detectBrowserLanguage } from "./i18n/detectLanguage";
import type { LanguageCode } from "./i18n/translations";
import { LANGUAGES } from "./i18n/translations";

const SUPPORTED = new Set<LanguageCode>(LANGUAGES.map(l => l.code as LanguageCode));
const FALLBACK: LanguageCode = "de";

function LanguageGate() {
  const { lang } = useParams<{ lang: LanguageCode }>();
  const { setLanguage, language } = useLanguage();

  if (!lang || !SUPPORTED.has(lang)) {
    return <Navigate to={`/${FALLBACK}`} replace />;
  }

  useEffect(() => {
    if (lang !== language) setLanguage(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return <App />;
}

export default function LanguageRouter() {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ ONLY redirect when user is exactly on "/"
  useEffect(() => {
    if (location.pathname !== "/") return;

    const detected = detectBrowserLanguage();
    navigate(`/${detected}`, { replace: true });
  }, [location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/" element={<div />} />
      <Route path="/:lang/*" element={<LanguageGate />} />
      <Route path="*" element={<Navigate to={`/${FALLBACK}`} replace />} />
    </Routes>
  );
}
