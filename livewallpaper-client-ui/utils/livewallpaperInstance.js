import { HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr'
import { delay, isVersionGreatherThan } from '../utils/common';
let _downloadWallpaperHandlers = [];

// ======== 传输层探测 ========
// 新客户端（WebView2）：走 WebMessage 桥，客户端不开本地端口
// 浏览器/旧客户端（DevHost 开发、线上站调老客户端）：走 SignalR + HTTP（localhost 端口）
export const IS_WEBVIEW_BRIDGE =
    typeof window !== 'undefined' && !!(window.chrome && window.chrome.webview && window.chrome.webview.postMessage)

//桥接模式下图片/上传资源基地址：
//页面本身在虚拟域名上（发布形态）用相对路径；dev 模式页面在 localhost:3001 上，用绝对虚拟域名地址（客户端原生拦截响应）
const BRIDGE_RESOURCE_HOST =
    IS_WEBVIEW_BRIDGE && typeof window !== 'undefined' && window.location.hostname === 'livewallpaper.local'
        ? ''
        : 'https://livewallpaper.local/'

let _bridgeSeq = 0;
const _bridgePending = new Map(); // id -> {resolve, reject, timer}
const _bridgeEventHandlers = {}; // eventName -> Set<callback>

if (IS_WEBVIEW_BRIDGE) {
    window.chrome.webview.addEventListener('message', (e) => {
        let msg;
        try {
            msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        } catch (error) {
            return;
        }
        if (!msg || msg.__lw !== 1) return;

        if (msg.id != null) {
            //RPC 回包
            const pending = _bridgePending.get(msg.id);
            if (!pending) return;
            _bridgePending.delete(msg.id);
            if (pending.timer) clearTimeout(pending.timer);
            if (msg.ok) {
                pending.resolve(msg.result);
            } else {
                pending.reject(new Error(msg.error || 'bridge invoke failed'));
            }
        } else if (msg.event) {
            //推送事件（下载/FFmpeg/播放器进度）
            const handlers = _bridgeEventHandlers[msg.event];
            if (handlers) {
                for (let h of [...handlers]) {
                    h(msg.payload);
                }
            }
        }
    });
}

class LivewallpaperApi {
    constructor(port = 5001) {
        this.setPort(port);
    }
    // ======== 桥接传输 ========
    _bridgeInvoke(method, args) {
        return new Promise((resolve, reject) => {
            const id = ++_bridgeSeq;
            const timer = setTimeout(() => {
                _bridgePending.delete(id);
                reject(new Error(`bridge invoke timeout: ${method}`));
            }, 60000);
            _bridgePending.set(id, { resolve, reject, timer });
            window.chrome.webview.postMessage(JSON.stringify({ __lw: 1, id, method, args: args || [] }));
        });
    }
    _onEvent(eventName, callback) {
        if (IS_WEBVIEW_BRIDGE) {
            if (!_bridgeEventHandlers[eventName])
                _bridgeEventHandlers[eventName] = new Set();
            _bridgeEventHandlers[eventName].add(callback);
        }
        else {
            this.connection.on(eventName, callback);
        }
    }
    _offEvent(eventName) {
        if (IS_WEBVIEW_BRIDGE) {
            delete _bridgeEventHandlers[eventName];
        }
        else if (this.connection) {
            this.connection.off(eventName);
        }
    }

    // ======== SignalR 传输（浏览器/旧客户端） ========
    async _enusureConnected() {
        if (IS_WEBVIEW_BRIDGE)
            return;
        try {
            if (this.connection == null) {
                this.connection = new HubConnectionBuilder()
                    .withUrl(this.serverUrl)
                    .configureLogging(LogLevel.Information)
                    .build();
                this.connection.onclose((error) => console.log("Connection Closed"));
                this.connection.on("send", data => {
                    console.log(data);
                });
            }

            console.log("_enusureConnected started 0", this.connection.state)
            if (this.connection.state == HubConnectionState.Disconnected)
                await this.connection.start();

            //等待连接成功
            let waitingCount = 0;
            while (this.connection.state != HubConnectionState.Connected && waitingCount < 60) {
                waitingCount++;
                console.log("_enusureConnected waiting ", waitingCount)
                await delay(1000);
            }

            console.log("_enusureConnected started 1", this.connection.state)
        } catch (error) {
            console.log("_enusureConnected 1", error)
        }
    }
    async _invoke({ method, parameters }) {
        if (IS_WEBVIEW_BRIDGE)
            return this._bridgeInvoke(method, parameters);
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
    async setPort(port) {
        this.port = port || 5001;
        if (IS_WEBVIEW_BRIDGE) {
            //桥接模式：无本地端口，图片等资源走虚拟域名（客户端原生拦截），dev 模式页面不在虚拟域名上故用绝对地址
            this.serverHost = BRIDGE_RESOURCE_HOST;
            this.serverUrl = '';
        }
        else {
            this.serverHost = `http://localhost:${this.port}/`;
            this.serverUrl = `${this.serverHost}livewallpaper`;
        }
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
            this._onEvent("SetupPlayerProgressChanged", (e) => {
                callback(e);
                if (e.typeStr === 'completed') {
                    completed = true;
                }
            });
        }

        const response = await this._invoke({
            method: "SetupPlayer",
            parameters: [playerType, url]
        });
        console.log(response);
        if (response && response.ok) {
            while (!completed) {
                await delay(1000);
            }

            if (callback) {
                this._offEvent("SetupPlayerProgressChanged");
            }
        }

        return response;
    }
    async setupFFmpeg(url, callback) {
        let completed = false;
        await this._enusureConnected();
        if (callback) {
            this._onEvent("SetupFFmpegProgressChanged", (e) => {
                console.log('setupFFmpeg', e)
                callback(e);
                if (e.typeStr === 'completed') {
                    completed = true;
                }
            });
        }

        const response = await this._invoke({
            method: "SetupFFmpeg",
            parameters: [url]
        });
        console.log(response);
        if (response && response.ok) {
            while (!completed) {
                await delay(1000);
            }

            if (callback) {
                this._offEvent("SetupFFmpegProgressChanged");
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
    //下载历史记账在本地服务端，线上站/本地页等多个UI源读到同一份数据
    async getDownloadRecords() {
        let r = await this._invoke({
            method: "GetDownloadRecords",
        });
        return r;
    }
    async clearDownloadRecords() {
        let r = await this._invoke({
            method: "ClearDownloadRecords",
        });
        return r;
    }
    //把旧版浏览器localStorage里的历史迁移到服务端（仅补缺）
    async addDownloadRecords(records) {
        let r = await this._invoke({
            method: "AddDownloadRecords",
            parameters: [records]
        });
        return r;
    }
    async onDownloadWallpaer(callback) {
        await this._enusureConnected();

        if (callback) {
            var exist = _downloadWallpaperHandlers.find(m => m === callback);
            if (!exist)
                _downloadWallpaperHandlers.push(callback);

            this._offEvent("DownloadWallpaperProgressChanged");
            this._onEvent("DownloadWallpaperProgressChanged", (e) => {
                for (let h of _downloadWallpaperHandlers) {
                    h(e);
                }
            });
        }
    }
    async offDownloadWallpaper(callback) {
        let i = _downloadWallpaperHandlers.indexOf(callback);
        if (i >= 0) {
            _downloadWallpaperHandlers.splice(i, 1);
        }
        if (_downloadWallpaperHandlers.length === 0)
            this._offEvent("DownloadWallpaperProgressChanged");
    }
    async downloadWallpaper(wallpaper) {
        const { wp, wpCover, groupDir, wpTitle, wpId, wpType } = wallpaper
        var info = {
            title: wpTitle,
            id: wpId,
            type: wpType,
        };
        var response = await this._invoke({
            method: "DownloadWallpaperToGroup",
            parameters: [wp, wpCover, info, groupDir]
        });
        return response;
    }
    async stopSetupFFmpeg() {
        let r = await this._invoke({
            method: "StopSetupFFmpeg",
        });
        return r;
    }
    async stopSetupPlayer() {
        var response = await this._invoke({
            method: "StopSetupPlayer",
        });
        return response;
    }
    async getUserSetting() {
        var response = await this._invoke({
            method: "GetUserSetting",
        });
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

        if (IS_WEBVIEW_BRIDGE) {
            //桥接模式：fetch 到虚拟域名 api/upload，客户端原生拦截处理，无 postMessage 体积限制
            const controller = new AbortController();
            const url = `${this.serverHost}api/upload?distDir=${encodeURIComponent(distDir || '')}&fileName=${encodeURIComponent(file.name || '')}`;
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/octet-stream' },
                body: file,
                signal: controller.signal,
            })
                .then((r) => r.json())
                .then(resolve)
                .catch(reject);
            //兼容旧返回值用法：tokenSource.cancel()
            return { cancel: () => controller.abort() };
        }

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
        if (info.groupItems) {
            info.groupItems = info.groupItems.map(m => {
                return {
                    id: m.id,
                    localID: m.localID
                };
            });
        }
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
    async isUwp() {
        let r = await this._invoke({
            method: "IsUwp",
        });
        return r;
    }
}

// const livewallpaperApi = new LivewallpaperApi();
// export { livewallpaperApi };
export { LivewallpaperApi };
