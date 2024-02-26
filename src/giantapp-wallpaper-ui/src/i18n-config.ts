export const i18n = {
    defaultLocale: "en",
    locales: ["zh", "en"],
    localesDescriptions: {
        zh: "中文",
        en: "English",
    },
} as const;

export type Locale = (typeof i18n)["locales"][number];

declare global {
    var __DICTIONARY__: any; // Replace 'any' with the type of your dictionary
}

//设置全局dictionary
export const setGlobal = (dictionary: any) => {
    globalThis.__DICTIONARY__ = dictionary;
}

//获取全局dictionary
export const getGlobal = () => {
    return globalThis.__DICTIONARY__;
}