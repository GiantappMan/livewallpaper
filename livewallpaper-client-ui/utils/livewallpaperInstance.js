import { HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr'
import { delay, isVersionGreatherThan } from '../utils/common';
class LivewallpaperApi {
    constructor() {
        this.serverHost = `http://localhost:${5001}/`;
        this.serverUrl = `${this.serverHost}livewallpaper`;
        this.downloadWallpaperHandlers = [];
    }
    async _enusureConnected() {
        var createNew = false;
        try {
            if (this.connection == null)
                createNew = true;
            else if (this.connection.state != HubConnectionState.Connected)
                await this.connection.start();
        } catch (e) {
            createNew = true;
        }

        if (createNew) {
            this.connection = new HubConnectionBuilder()
                .withUrl(this.serverUrl)
                .configureLogging(LogLevel.Information)
                .build();
            this.connection.onclose((error) => console.log("Connection Closed"));
            this.connection.on("send", data => {
                console.log(data);
            });
            await this.connection.start();
        }
    }
    async _invoke({ method, parameters }) {
        console.log('调用', method, parameters);
        await this._enusureConnected();
        let response = null;
        if (parameters)
            response = await this.connection.invoke(method, ...parameters);
        else
            response = await this.connection.invoke(method);
        console.log('调用完成', method, response);
        return response;
    }
    isBusy(errorString) {
        return errorString === 'Busy';
    }
    getTypeString(type) {
        if (type === undefined)
            return "";

        switch (type) {
            case 0:
                return "videoWP";
            case 1:
                return "imageWP";
            case 2:
                return "htmlWP";
            case 3:
                return "exeWP";
        }
    }
    async getWallpapers() {
        let r = await this._invoke({
            method: "GetWallpapers",
        });
        return r;
    }
    async getRunningWallpapers() {
        let r = await this._invoke({
            method: "GetRunningWallpapers",
        });
        return r;
    }
    getFilePath(wp) {
        let path = `${wp.runningData.dir}\\${wp.info.file}`
        return path;
    }
    async getPlayerUrl() {
        if (!this._clientVersion) {
            this._clientVersion = await this.getClientVersion();
        }

        if (isVersionGreatherThan(this._clientVersion, '2.1')) {
            return 'https://6c69-livewallpaper-3ghxzy41e1b569c9-1304209797.tcb.qcloud.la/livewallpaper-assets/LiveWallpaperEngineRender.7z'
        }
        else {
            return 'https://6c69-livewallpaper-3ghxzy41e1b569c9-1304209797.tcb.qcloud.la/livewallpaper-assets/mpv.7z'
        }
    }
    async showWallpaper(wp, screen) {
        if (!this._clientVersion) {
            this._clientVersion = await this.getClientVersion();
        }

        let path = this.getFilePath(wp);

        let r = null;
        if (isVersionGreatherThan(this._clientVersion, '2.1')) {
            r = await this._invoke({
                method: "ShowWallpaper",
                parameters: [path, screen]
            });
        }
        else {
            //2.2版本以下特殊处理，少一个参数
            r = await this._invoke({
                method: "ShowWallpaper",
                parameters: [path]
            });
        }
        return r;
    }
    async closeWallpaper(screens) {
        let r = await this._invoke({
            method: "CloseWallpaper",
            parameters: [screens]
        });
        return r;
    }
    async deleteWallpaper(wp) {
        let path = this.getFilePath(wp);
        let r = await this._invoke({
            method: "DeleteWallpaper",
            parameters: [path]
        });
        return r;
    }
    async explore(path) {
        let r = await this._invoke({
            method: "ExploreFile",
            parameters: [path]
        });
        return r;
    }
    async setupPlayer(playerType, url, callback) {
        let completed = false;
        await this._enusureConnected();
        if (callback) {
            this.connection.on("SetupPlayerProgressChanged", (e) => {
                callback(e);
                if (e.typeStr === 'completed') {
                    completed = true;
                }
            });
        }

        const response = await this.connection.invoke("SetupPlayer", playerType, url);
        console.log(response);
        if (response.ok) {
            while (!completed) {
                await delay(1000);
            }

            if (callback) {
                this.connection.off("SetupPlayerProgressChanged");
            }
        }

        return response;
    }
    async setupFFmpeg(url, callback) {
        let completed = false;
        await this._enusureConnected();
        if (callback) {
            this.connection.on("SetupFFmpegProgressChanged", (e) => {
                console.log('setupFFmpeg', e)
                callback(e);
                if (e.typeStr === 'completed') {
                    completed = true;
                }
            });
        }

        const response = await this.connection.invoke("SetupFFmpeg", url);
        console.log(response);
        if (response.ok) {
            while (!completed) {
                await delay(1000);
            }

            if (callback) {
                this.connection.off("SetupFFmpegProgressChanged");
            }
        }

        return response;
    }
    async stopDownloadWallpaper(wallpaper) {
        let r = await this._invoke({
            method: "StopDownloadWallpaper",
            parameters: [wallpaper]
        });
        return r;
    }
    async onDownloadWallpaer(callback) {
        await this._enusureConnected();

        if (callback) {
            var exist = this.downloadWallpaperHandlers.find(m => m === callback);
            if (!exist)
                this.downloadWallpaperHandlers.push(callback);

            this.connection.off("DownloadWallpaperProgressChanged");
            this.connection.on("DownloadWallpaperProgressChanged", (e) => {
                for (let h of this.downloadWallpaperHandlers) {
                    h(e);
                }
            });
        }
    }

    async offDownloadWallpaper(callback) {
        let i = this.downloadWallpaperHandlers.indexOf(callback);
        if (i >= 0) {
            this.downloadWallpaperHandlers.splice(i, 1);
        }
        if (this.downloadWallpaperHandlers.length === 0)
            this.connection.off("DownloadWallpaperProgressChanged");
    }

    async downloadWallpaper(wallpaper) {
        // let completed = false;
        const { wp, wpCover, groupDir, wpTitle, wpId, wpType } = wallpaper
        var info = {
            title: wpTitle,
            id: wpId,
            type: wpType,
        };
        var response = await this.connection.invoke("DownloadWallpaperToGroup", wp, wpCover, info, groupDir);
        return response;

        await this._enusureConnected();
        if (callback) {
            this.connection.on("DownloadWallpaperProgressChanged", (e) => {
                if (e.path != wp && e.path != cover) {
                    return;
                }
                callback(e);
                if (e.completed === true) {
                    completed = true;
                }
            });
        }
        response = await this.connection.invoke("DownloadWallpaper", wp, cover, info);
        console.log(response);
        if (response.ok) {
            while (!completed) {
                await delay(1000);
            }

            if (callback) {
                this.connection.off("DownloadWallpaperProgressChanged");
            }
        }
        return response;
    }
    async stopSetupFFmpeg() {
        let r = await this._invoke({
            method: "StopSetupFFmpeg",
        });
        return r;
    }
    async stopSetupPlayer() {
        await this._enusureConnected();

        var response = await this.connection.invoke("StopSetupPlayer");
        return response;
    }
    async getUserSetting() {
        await this._enusureConnected();
        var response = await this.connection.invoke("GetUserSetting");
        return response;
    }
    async setUserSetting(setting) {
        let r = await this._invoke({
            method: "SetUserSetting",
            parameters: [setting]
        });
        return r;
    }
    async getThumbnails(wpPath) {
        let r = await this._invoke({
            method: "GetThumbnails",
            parameters: [wpPath]
        });
        return r;
    }
    async getClientVersion() {
        let r = await this._invoke({
            method: "GetClientVersion",
        });
        return r;
    }
    uploadFile($axios, file, distDir, { onUploadProgress, resolve, reject }) {
        console.log("uploadFile", file, distDir)
        let formData = new FormData()
        formData.append('file', file)
        formData.append('distDir', distDir)

        var cancelTokenSource = $axios.CancelToken.source()

        let config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: onUploadProgress,
            cancelToken: cancelTokenSource.token,
        }
        let url = `${this.serverHost}LiveWallpaper/UploadFile`;
        console.log(url);

        $axios
            .$post(url, formData, config).
            then(resolve).
            catch(reject);

        return cancelTokenSource
    }
    async getDraftDir() {
        let r = await this._invoke({
            method: "GetDraftDir",
        });
        return r;
    }
    async updateProjectInfo(destDir, info) {
        let r = await this._invoke({
            method: "UpdateProjectInfo",
            parameters: [destDir, info]
        });
        return r;
    }
    async deleteFiles(paths) {
        let r = await this._invoke({
            method: "DeleteFiles",
            parameters: [paths]
        });
        return r;
    }
    async moveFile(path, dist, deleteSource) {
        let r = await this._invoke({
            method: "MoveFile",
            parameters: [path, dist, deleteSource]
        });
        return r;
    }
    async getWallpaper(path) {
        let r = await this._invoke({
            method: "GetWallpaper",
            parameters: [path]
        });
        return r;
    }
    async updateWallpaperOption(dir, option) {
        let r = await this._invoke({
            method: "UpdateWallpaperOption",
            parameters: [dir, option]
        });
        return r;
    }
    async getWallpaperOption(dir) {
        let r = await this._invoke({
            method: "GetWallpaperOption",
            parameters: [dir]
        });
        return r;
    }
    async openStoreReview() {
        let r = await this._invoke({
            method: "OpenStoreReview",
        });
        return r;
    }
}

const livewallpaperApi = new LivewallpaperApi();
export { livewallpaperApi };
