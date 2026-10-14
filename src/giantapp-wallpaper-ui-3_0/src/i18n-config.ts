//与社区端（giantapp-wallpaper-server/i18n-config.ts）保持一致，仅 zh 不带地区后缀（历史配置兼容）
export const i18n = {
    defaultLocale: "en",
    locales: ["zh", "zh-Hant", "en", "es", "ar", "hi", "pt-BR", "fr", "ja", "de", "ru"]
} as const;

export type Locale = (typeof i18n)["locales"][number];
export type LocaleDirection = "ltr" | "rtl";

//从右到左书写的语言（如阿拉伯语）
const localeDirections: Partial<Record<Locale, LocaleDirection>> = {
    ar: "rtl"
};

export function getLocaleDirection(locale: string): LocaleDirection {
    return (localeDirections as Record<string, LocaleDirection>)[locale] ?? "ltr";
}

declare global {
    var __DICTIONARY__: any; // Replace 'any' with the type of your dictionary
}

//设置全局dictionary
export const setGlobal = (dictionary: unknown) => {
    globalThis.__DICTIONARY__ = dictionary;
}

//获取全局dictionary
export const getGlobal = <T = unknown>(): T => {
    return globalThis.__DICTIONARY__ as T;
}
