import "server-only";
import type { Locale } from "./i18n-config";
import { i18n } from "./i18n-config";
// We enumerate all dictionaries here for better linting and typescript support
// We also get the default import for cleaner types
// const dictionaries = {
//     zh: () => import("./dictionaries/zh.json").then((module) => module.default),
//     en: () => import("./dictionaries/en.json").then((module) => module.default),
//     ru: () => import("./dictionaries/ru.json").then((module) => module.default),
// };

const dictionaries = i18n.locales.reduce((acc, locale) => {
    acc[locale] = () => import(`./dictionaries/${locale}.json`).then((module) => module.default);
    return acc;
}, {} as Record<Locale, () => Promise<any>>);

export const getDictionary = async (locale: Locale) =>
    dictionaries[locale]?.() ?? dictionaries.en();
