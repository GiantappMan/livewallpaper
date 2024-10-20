export type DownloadItem = {
    id: string;
    desc: string;
    percent: number;
    totalBytes: number;
    receivedBytes: number;
    isDownloading: boolean;
    isDownloadCompleted: boolean;
    IsCanceled: boolean;
}

type DownloadStatus = {
    items: DownloadItem[];
}