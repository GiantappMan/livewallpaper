/** i18n：语言注册表与词典静态导入（构建期内联，无运行时请求）。 */
import zh from "@/dictionaries/zh.json";
import en from "@/dictionaries/en.json";
import ru from "@/dictionaries/ru.json";
import es from "@/dictionaries/es.json";
import zhHant from "@/dictionaries/zh-Hant.json";
import ja from "@/dictionaries/ja.json";
import de from "@/dictionaries/de.json";
import fr from "@/dictionaries/fr.json";
import ptBR from "@/dictionaries/pt-BR.json";

export const i18n = {
  defaultLocale: "en",
  locales: ["zh", "en", "ru", "es", "zh-Hant", "ja", "de", "fr", "pt-BR"],
} as const;

export type Locale = (typeof i18n)["locales"][number];

export const dictionaries: Record<Locale, any> = {
  zh,
  en,
  ru,
  es,
  "zh-Hant": zhHant,
  ja,
  de,
  fr,
  "pt-BR": ptBR,
};

export function getDictionary(locale: string): any {
  return (dictionaries as Record<string, any>)[locale] ?? dictionaries.en;
}

export const localeDescriptions: Record<Locale, string> = {
  zh: "中文（简体）",
  en: "English",
  ru: "Русский",
  es: "Español",
  "zh-Hant": "中文（繁體）",
  ja: "日本語",
  de: "Deutsch",
  fr: "Français",
  "pt-BR": "Português (Brasil)",
};
