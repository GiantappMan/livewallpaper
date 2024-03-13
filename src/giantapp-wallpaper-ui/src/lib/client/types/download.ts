type DownloadItem = {
    id: string;
    desc: string;
    percent: number;
    totalBytes: number;
    receivedBytes: number;
    isDownloading: boolean;
}

type DownloadStatus = {
    items: DownloadItem[];
}