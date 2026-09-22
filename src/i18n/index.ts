import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

import en from "./locales/en.json"
import fr from "./locales/fr.json"
import it from "./locales/it.json"

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      it: { translation: it },
    },
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "cucina-mia-lang",
    },
  })

// Keep <html lang> in sync so screen readers use the right pronunciation
function syncDocumentLang(lng: string | undefined) {
  if (lng && typeof document !== "undefined") document.documentElement.lang = lng.slice(0, 2)
}
syncDocumentLang(i18n.resolvedLanguage)
i18n.on("languageChanged", syncDocumentLang)

export default i18n
