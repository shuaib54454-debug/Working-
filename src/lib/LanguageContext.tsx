import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, translations } from "./i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof translations.ar;
  dir: "rtl" | "ltr";
  isAr: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("rec_language") as Language;
      if (saved === "ar" || saved === "en") return saved;
    } catch (e) {
      console.warn("Error reading language from localStorage", e);
    }
    return "ar";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("rec_language", lang);
    } catch (e) {
      console.warn("Error saving language to localStorage", e);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  const dir = language === "ar" ? "rtl" : "ltr";
  const isAr = language === "ar";
  const t = translations[language];

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        dir,
        isAr
      }}
    >
      <div dir={dir} className={isAr ? "font-cairo" : "font-sans"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
