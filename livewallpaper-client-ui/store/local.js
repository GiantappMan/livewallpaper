import { LivewallpaperApi } from "../utils/livewallpaperInstance"
import { delay } from "../utils/common"
import Vue from 'vue'

function compareLocalID(a, b) {
    if (a === undefined)
        a = '';
    if (b === undefined)
        b = '';
    return a.toLocaleLowerCase().trim() === b.toLocaleLowerCase().trim();
}

//已注册下载进度监听的api实例（setPort每次导航都可能换实例，用模块变量做幂等标记）
let _downloadListenerApi = null;

function fileNameFromUrl(url) {
    try {
        const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
        return name.replace(/\.[^.]+$/, '') || url;
    } catch (e) {
        return url;
    }
}

function handleDownloadProgress(context, e) {
    const { commit, dispatch, state } = context;
    //wallpaper字段是服务端补的主文件URL（封面/异常阶段path不是主文件URL），旧服务端只有path
    const url = e.wallpaper || e.path;
    if (!url) return;
    const percent = Math.max(0, Math.min(100, Math.round(e.percent || 0)));
    const item = state.downloads.find((d) => d.url === url);
    if (item) {
        commit('updateDownload', { url, e, percent });
    } else {
        commit('pushDownload', {
            url,
            title: e.title || fileNameFromUrl(url),
            percent,
            completed: !!e.completed,
            succeeded: !!e.succeeded,
            cancelled: false,
            cancelling: false,
            //服务端下载异常的原因，用于明确提示
            error: e.error || null,
        });
    }
    if (e.completed && e.succeeded) {
        //下载完成后刷新本地列表，新壁纸立即出现
        dispatch('refresh', {}).catch(() => { });
    }
}

function registerDownloadListener(context) {
    const { state } = context;
    const api = state.livewallpaperApi;
    if (!api || _downloadListenerApi === api) return;
    _downloadListenerApi = api;
    api.onDownloadWallpaer((e) => handleDownloadProgress(context, e))
        .catch((e) => {
            //服务端未启动等场景注册失败，清除标记让下次导航重试
            console.log('registerDownloadListener', e);
            if (_downloadListenerApi === api) _downloadListenerApi = null;
        });
}

export const state = () => ({
    clientVersion: undefined,
    livewallpaperApi: undefined,
    serverPort: undefined,
    expectedClientVersion: process.env.expectedClientVersion,
    isPlaying: false,
    wallpapers: [],
    //从社区站触发的下载任务（服务端只广播进度，这里做归组与状态留存）
    downloads: [],
    runningWallpapers: [],
    isLoading: false,
    isLoadingSetting: false,
    currentAudioWP: null,
    setting: {
        general: {
            startWithSystem: false,
            currentLan: null,
        },
        wallpaper: {
            wallpaperSaveDir: undefined,
            audioScreen: undefined,
            audioScreenOptions: [],
            appMaximizedEffectAllScreen: false,
            forwardMouseEvent: false,
        },
        //实验室设置，仅开发模式（Debug构建）服务端才会返回
        lab: null,
    },
})

export const getters = {
    serverHost: (state, getters) => {
        if (state.livewallpaperApi) {
            return state.livewallpaperApi.serverHost;
        }
        return "";
    }
}

export const mutations = {
    setApiInstance(state, instance) {
        state.livewallpaperApi = instance;
    },
    setServerPort(state, port) {
        state.serverPort = port;
    },
    setIsPlaying(state, playing) {
        state.isPlaying = playing
    },
    setClientVersion(state, clientVersion) {
        state.clientVersion = clientVersion;
    },
    setExpectedClientVersion(state, expectedClientVersion) {
        state.expectedClientVersion = expectedClientVersion
    },
    setSetting(state, setting) {
        state.setting = setting;
    },
    setLoading(state, isLoading) {
        state.isLoading = isLoading;
    },
    setLoadingSetting(state, isLoading) {
        state.isLoadingSetting = isLoading;
    },
    setWallpapers(state, wallpapers) {
        if (!wallpapers)
            wallpapers = []

        for (const wpItem of wallpapers) {
            if (!wpItem.info.groupItems)
                continue;

            var models = wpItem.info.groupItems.map(m => {
                return wallpapers.find(e => compareLocalID(e.info.localID, m.localID))
            }).filter(m => !!m);
            wpItem.info.groupItemWallpaperModels = models;
        }
        state.wallpapers = wallpapers
    },
    setWallpaperBusy(state, { wallpaper, busy }) {
        //由于这个属性一开始没有，所以需要用Vue.set
        Vue.set(wallpaper, 'isBusy', busy)
    },
    setWallpaperOption(state, { wallpaper, option }) {
        //有些脏数据可能没有id
        let existWallpaper = state.runningWallpapers.find(m => (m.info.id && m.info.id === wallpaper.info.id)
            || m.info.localID === wallpaper.info.localID);
        if (existWallpaper)
            existWallpaper.option = option
        else
            //分组下的
            wallpaper.option = option;
    },
    removeWallpaper(state, wallpaper) {
        state.wallpapers.splice(state.wallpapers.indexOf(wallpaper), 1)
    },
    pushDownload(state, item) {
        state.downloads.push(item)
    },
    updateDownload(state, { url, e, percent }) {
        const item = state.downloads.find((d) => d.url === url);
        if (!item) return;
        item.percent = percent;
        if (e.completed) {
            item.completed = true;
            item.succeeded = !!e.succeeded;
            //服务端下载异常的原因，用于明确提示
            item.error = e.error || null;
            //客户端主动取消过的标记为已取消，与服务端失败区分
            if (!e.succeeded && item.cancelling) item.cancelled = true;
        }
    },
    setDownloadCancelling(state, url) {
        const item = state.downloads.find((d) => d.url === url);
        if (item) Vue.set(item, 'cancelling', true);
    },
    clearFinishedDownloads(state) {
        state.downloads = state.downloads.filter((d) => !d.completed);
    },
    setCurrentAudioWP(state, { currentAudioWP }) {
        state.currentAudioWP = currentAudioWP;
    },
    setRunningWallpaper(state, { runningWallpapers }) {
        for (const wpItem of state.wallpapers) {
            wpItem.runningData.isRunning = false;
            wpItem.runningData.screens = [];
        }

        for (const screenName of Object.keys(runningWallpapers)) {
            let runningItem = runningWallpapers[screenName];
            if (!runningItem || !runningItem.runningData)
                continue;

            for (const wpItem of state.wallpapers) {
                if (runningItem.runningData.absolutePath === wpItem.runningData.absolutePath) {
                    wpItem.runningData.isRunning = true;
                    if (!wpItem.runningData.screens)
                        wpItem.runningData.screens = [];

                    wpItem.runningData.screens.push(screenName);
                }
            }
        }

        state.runningWallpapers = state.wallpapers.filter(
            (m) => m.runningData.isRunning === true
        );
        state.isPlaying = state.runningWallpapers && state.runningWallpapers.length > 0;
    }
}

export const actions = {
    setPort(context, port) {
        let { commit, state } = context;
        port = port || 5001
        //同端口复用实例：route.client.js每次导航都会进来，重建实例会泄漏SignalR连接
        if (!(state.livewallpaperApi && String(state.serverPort) === String(port))) {
            commit("setServerPort", port);
            commit("setApiInstance", new LivewallpaperApi(port));
        }
        registerDownloadListener(context);
    },
    async cancelDownload({ commit, state }, url) {
        if (!url) return;
        commit('setDownloadCancelling', url);
        await state.livewallpaperApi.stopDownloadWallpaper(url).catch(console.log);
    },
    async deleteWallpaper(context, { wallpaper, handleClientApiException, toast }) {
        console.log("deleteWallpaper")
        let { commit, state } = context;
        commit('setWallpaperBusy', { wallpaper, busy: true })
        // commit('setLoading', true)
        await state.livewallpaperApi.deleteWallpaper(wallpaper)
            .then((r) => {
                commit('removeWallpaper', wallpaper)
                toast.open(this.$i18n.t('local.wallpaperDeleted'));
            })
            .catch(handleClientApiException)
            .finally(() => {
                // commit('setLoading', false)
            })
    },
    async closeWallpaper({ commit, dispatch, state }, { handleClientApiException }) {
        console.log("closeWallpaper")
        commit('setLoading', true)
        await state.livewallpaperApi.closeWallpaper()
            .then((r) => {
                commit('setIsPlaying', false)
            })
            .catch(handleClientApiException)
            .finally(() => {
                commit('setLoading', false)
            })
        //更新当前播放的壁纸信息
        await dispatch('updateRunningWallpaper');
    },
    async showWallpaper({ commit, dispatch, state }, { wallpaper, screen, handleClientApiException, toast }) {
        console.log("showWallpaper")
        commit('setLoading', true)
        let r = await state.livewallpaperApi.showWallpaper(wallpaper, screen)
            .then(async (r) => {
                console.log(r)
                if (!r.ok) {
                    //隐藏Loading,否则会遮挡界面
                    commit('setLoading', false)

                    if (r.errorString == 'NoPlayer') {
                        // 暂时没有这个场景，屏蔽了
                        // //显示setup窗口
                        // this.showSetupPlayerModal = true
                        // //已经在处理了
                        // if (this.$refs.setupPlayerModal.isSettingUpPlayer) {
                        //     return
                        // }
                        // //开始安装player
                        // await this.$refs.setupPlayerModal.showModal(
                        //     wallpaper.runningData.type
                        // )
                    }
                    else {
                        toast.open(r)
                    }
                } else {
                    commit('setIsPlaying', true)
                }
            })
            .catch(handleClientApiException)
            .finally(() => {
                commit('setLoading', false)
            })

        //更新当前播放的壁纸信息
        await dispatch('updateRunningWallpaper');
        return r;
    },
    async exploreWallpaper({ commit, state }, { wallpaper, handleClientApiException }) {
        console.log("exploreWallpaper")
        commit('setWallpaperBusy', { wallpaper, busy: true })
        await delay(300);//延迟下，界面才有效果。。。
        await state.livewallpaperApi.explore(wallpaper.runningData.absolutePath)
            .catch(handleClientApiException);
        commit('setWallpaperBusy', { wallpaper, busy: false })
    },
    async explore({ state }, { path, handleClientApiException }) {
        console.log("explore")
        await state.livewallpaperApi.explore(path).catch(handleClientApiException);
    },
    async getClientVersion(context, args) {
        let { state } = context;
        const { handleClientApiException } = args || {};
        console.log("getClientVersion")
        await state.livewallpaperApi
            .getClientVersion()
            .then((res) => {
                context.commit('setClientVersion', res)
                context.commit('setExpectedClientVersion', process.env.expectedClientVersion)
            })
            .catch((e) => {
                context.commit('setClientVersion', null)
                if (handleClientApiException)
                    handleClientApiException(e);
            })
            .finally(() => {
            })
    },
    async getWallpaper({ state, dispatch }, { path }) {
        console.log("getWallpaper")
        let { data } = await state.livewallpaperApi
            .getWallpaper(path)
            .catch(() => {
            })
            .finally(() => {
            })

        if (state.wallpapers.length === 0) {
            await dispatch("refresh", {})
        }

        if (data.info.groupItems) {
            var models = data.info.groupItems.map(m => {
                return state.wallpapers.find(e => compareLocalID(e.info.localID, m.localID))
            }).filter(m => !!m);

            data.info.groupItemWallpaperModels = models;
        }

        return data;
    },
    async loadSetting({ commit, dispatch, state }, { handleClientApiException }) {
        console.log("loadSetting")
        commit('setLoadingSetting', true)
        await state
            .livewallpaperApi
            .getUserSetting()
            .then(async (res) => {
                commit('setSetting', res.data)
            })
            .catch(handleClientApiException)
            .finally(() => {
                commit('setLoadingSetting', false)
            })
    },
    async saveSetting({ commit, dispatch, state }, { setting, handleClientApiException }) {
        console.log("saveSetting")
        commit('setLoadingSetting', true)
        try {
            let r = await state.livewallpaperApi.setUserSetting(setting);
            if (r.ok === true) {
                commit('setSetting', setting)
            }
            return r;
        } catch (error) {
            handleClientApiException(error)
        }
        finally {
            commit('setLoadingSetting', false)
        }
    },
    async refresh({ commit, dispatch, state }, { handleClientApiException }) {
        console.log("refresh")
        commit('setLoading', true)

        try {
            let res = await state.livewallpaperApi.getWallpapers()
            commit('setWallpapers', res.data)
            await dispatch("updateRunningWallpaper");
        } catch (error) {
            console.log(error);
            if (handleClientApiException)
                handleClientApiException(error);
        }
        finally {
            commit('setLoading', false)
        }
    },
    async loadWallpaperOption({ commit, state }, { wallpaper }) {
        console.log("loadWallpaperOption")
        let dir = wallpaper.runningData.dir;
        let res = await state.livewallpaperApi.getWallpaperOption(dir)
        console.log(res);
        commit('setWallpaperOption', { wallpaper, option: res.data })
    },
    async setWallpaperOption({ commit, dispatch, state }, { wallpaper, option }) {
        console.log("setWallpaperOption")
        let dir = wallpaper.runningData.dir;
        let res = await state.livewallpaperApi.updateWallpaperOption(dir, option)
        console.log(res);
        if (res.ok === true)
            commit('setWallpaperOption', { wallpaper, option })
        dispatch('updateCurrentAudioWP');
    },
    async updateRunningWallpaper({ commit, state, dispatch }) {
        console.log("updateRunningWallpaper")
        try {
            let runningWallpapers = await state.livewallpaperApi.getRunningWallpapers()
            //去重
            commit('setRunningWallpaper', { runningWallpapers })

            await dispatch('updateCurrentAudioWP')
        } catch (error) {
            //2.2版本以下不支持
            console.log(error);
        }
    },
    async updateCurrentAudioWP({ commit, state, dispatch }) {
        if (!state.runningWallpapers) {
            commit('setCurrentAudioWP', { currentAudioWP: null });
        }
        else {
            const audioScreen = state.setting.wallpaper.audioScreen
            var currentAudioWP = state.runningWallpapers.find(
                (m) => m.runningData.screens.indexOf(audioScreen) >= 0
            )

            if (currentAudioWP && currentAudioWP.info.type === 'group') {
                //分组每次都要重新读取，因为分组下的index会变
                await dispatch('loadWallpaperOption', { wallpaper: currentAudioWP })

                if (currentAudioWP.option) {
                    currentAudioWP = currentAudioWP.info.groupItemWallpaperModels[currentAudioWP.option.lastWallpaperIndex];
                }
            }

            if (currentAudioWP && currentAudioWP.info.type === 'image') {
                currentAudioWP = null;
            }

            if (currentAudioWP == state.currentAudioWP) {
                return;
            }

            if (currentAudioWP && !currentAudioWP.option) {
                await dispatch('loadWallpaperOption', { wallpaper: currentAudioWP })
            }
            commit('setCurrentAudioWP', { currentAudioWP });
        }
    }
}