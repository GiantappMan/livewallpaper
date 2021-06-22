import { livewallpaperApi } from "../utils/livewallpaperInstance"
import { delay } from "../utils/common"
import Vue from 'vue'

function compareLocalID(a, b) {
    if (a === undefined)
        a = '';
    if (b === undefined)
        b = '';
    return a.toLocaleLowerCase().trim() === b.toLocaleLowerCase().trim();
}

export const state = () => ({
    clientVersion: undefined,
    serverHost: livewallpaperApi.serverHost,
    expectedClientVersion: process.env.expectedClientVersion,
    isPlaying: false,
    wallpapers: [],
    isLoading: false,
    isLoadingSetting: false,
    setting: {
        general: {
            startWithSystem: false,
            currentLan: null,
        },
        wallpaper: {
            wallpaperSaveDir: undefined,
            audioScreenOptions: [],
            appMaximizedEffectAllScreen: false,
            forwardMouseEvent: false,
        },
    },
})

export const mutations = {
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
        wallpaper.option = option
    },
    removeWallpaper(state, wallpaper) {
        state.wallpapers.splice(state.wallpapers.indexOf(wallpaper), 1)
    },
    setRunningWallpaper(state, { runningWallpapers }) {
        for (const wpItem of state.wallpapers) {
            wpItem.runningData.isRunning = false;
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

        state.isPlaying = !!state.wallpapers.find(
            (m) => m.runningData.isRunning === true
        )
    }
}

export const actions = {
    async deleteWallpaper(context, { wallpaper, handleClientApiException, toast }) {
        console.log("deleteWallpaper")
        let { commit } = context;
        commit('setWallpaperBusy', { wallpaper, busy: true })
        // commit('setLoading', true)
        await livewallpaperApi.deleteWallpaper(wallpaper)
            .then((r) => {
                commit('removeWallpaper', wallpaper)
                toast.open(this.$i18n.t('local.wallpaperDeleted'));
            })
            .catch(handleClientApiException)
            .finally(() => {
                // commit('setLoading', false)
            })
    },
    async closeWallpaper({ commit }, { handleClientApiException }) {
        console.log("closeWallpaper")
        commit('setLoading', true)
        await livewallpaperApi.closeWallpaper()
            .then((r) => {
                commit('setIsPlaying', false)
            })
            .catch(handleClientApiException)
            .finally(() => {
                commit('setLoading', false)
            })
    },
    async showWallpaper({ commit }, { wallpaper, screen, handleClientApiException, toast }) {
        console.log("showWallpaper")
        commit('setLoading', true)
        let r = await livewallpaperApi.showWallpaper(wallpaper, screen)
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
        return r;
    },
    async exploreWallpaper({ commit }, { wallpaper, handleClientApiException }) {
        console.log("exploreWallpaper")
        commit('setWallpaperBusy', { wallpaper, busy: true })
        await delay(300);//延迟下，界面才有效果。。。
        await livewallpaperApi.explore(wallpaper.runningData.absolutePath)
            .catch(handleClientApiException);
        commit('setWallpaperBusy', { wallpaper, busy: false })
    },
    async explore(context, { path, handleClientApiException }) {
        console.log("explore")
        await livewallpaperApi.explore(path).catch(handleClientApiException);
    },
    getClientVersion(context) {
        console.log("getClientVersion")
        livewallpaperApi
            .getClientVersion()
            .then((res) => {
                context.commit('setClientVersion', res)
                context.commit('setExpectedClientVersion', process.env.expectedClientVersion)
            })
            .catch(() => {
                context.commit('setClientVersion', null)
            })
            .finally(() => {
            })
    },
    async getWallpaper({ state, dispatch }, { path }) {
        console.log("getWallpaper")
        let { data } = await livewallpaperApi
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
    async loadSetting({ commit, dispatch }, { handleClientApiException }) {
        console.log("loadSetting")
        commit('setLoadingSetting', true)
        await livewallpaperApi
            .getUserSetting()
            .then(async (res) => {
                commit('setSetting', res.data)
            })
            .catch(handleClientApiException)
            .finally(() => {
                commit('setLoadingSetting', false)
            })
    },
    async saveSetting({ commit, dispatch }, { setting, handleClientApiException }) {
        console.log("saveSetting")
        commit('setLoadingSetting', true)
        try {
            let r = await livewallpaperApi.setUserSetting(setting);
            return r;
        } catch (error) {
            handleClientApiException(error)
        }
        commit('setLoadingSetting', false)
    },
    async refresh({ commit, dispatch }, { handleClientApiException }) {
        console.log("refresh")
        commit('setLoading', true)

        try {
            let res = await livewallpaperApi.getWallpapers()
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
    async loadWallpaperOption({ commit }, { wallpaper }) {
        console.log("loadWallpaperOption")
        let dir = wallpaper.runningData.dir;
        let res = await livewallpaperApi.getWallpaperOption(dir)
        console.log(res);
        commit('setWallpaperOption', { wallpaper, option: res.data })
    },
    async setWallpaperOption({ commit }, { wallpaper, option }) {
        console.log("setWallpaperOption")
        let dir = wallpaper.runningData.dir;
        let res = await livewallpaperApi.updateWallpaperOption(dir, option)
        console.log(res);
        commit('setWallpaperOption', { wallpaper, option: res.data })
    },
    async updateRunningWallpaper({ commit }) {
        console.log("updateRunningWallpaper")
        try {
            let runningWallpapers = await livewallpaperApi.getRunningWallpapers()
            //去重
            commit('setRunningWallpaper', { runningWallpapers })
        } catch (error) {
            //2.2版本以下不支持
            console.log(error);
        }
    },
}