import { atom } from "jotai";

//正在进行的下载任务 id 集合（进度事件为增量推送，需按 id 合并；用于侧边栏角标）
export const activeDownloadIdsAtom = atom<string[]>([]);
