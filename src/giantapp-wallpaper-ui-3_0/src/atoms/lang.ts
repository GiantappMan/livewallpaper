import { atom } from "jotai";

//当前语言
export const langAtom = atom("en");
//当前语言的字典
export const langDictAtom = atom<any>({});