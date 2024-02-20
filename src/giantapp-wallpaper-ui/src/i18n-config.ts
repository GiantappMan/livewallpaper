export const i18n = {
    defaultLocale: "en",
    locales: ["zh", "en"],
} as const;

export type Locale = (typeof i18n)["locales"][number];

//设置全局dictionary
export const setGlobal = (dictionary: any) => {
    globalThis.__DICTIONARY__ = dictionary;
}

//获取全局dictionary
export const getGlobal = () => {
    return globalThis.__DICTIONARY__;
}