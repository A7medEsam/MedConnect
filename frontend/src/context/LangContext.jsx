import React, { createContext, useContext, useEffect, useState } from 'react';
import en from '../locales/en';
import ar from '../locales/ar';
import { setClientLang } from '../api/client';

const LangContext = createContext(null);
const LANG_KEY = 'medconnect_lang';

const translations = { en, ar };

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'ar' ? 'ar' : 'en';
  });

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    setClientLang(lang);
  }, [lang]);

  const setLang = (nextLang) => {
    setLangState(nextLang === 'ar' ? 'ar' : 'en');
  };

  const toggleLang = () => {
    setLangState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = translations[lang] || en;
  const isRtl = lang === 'ar';

  return (
    <LangContext.Provider value={{ lang, setLang, toggleLang, t, isRtl }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error('useLang must be used within LangProvider');
  }
  return ctx;
}
