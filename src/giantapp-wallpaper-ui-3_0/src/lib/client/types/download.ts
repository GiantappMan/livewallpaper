export type DownloadItem = {
    id: string;
    desc: string;
    percent: number;
    totalBytes: number;
    receivedBytes: number;
    isDownloading: boolean;
    isDownloadCompleted: boolean;
    isCanceled: boolean;
}

//下载完成的历史记录
export type DownloadRecord = {
    id: string;
    title: string;
    fileName: string;
    filePath: string;
    totalBytes: number;
    time: string;
}

export type DownloadStatus = {
    items: DownloadItem[];
}
