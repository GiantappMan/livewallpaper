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
    async closeWallpaper({ commit, dispatch }, { handleClientApiException }) {
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
        //更新当前播放的壁纸信息
        await dispatch('updateRunningWallpaper');
    },
    async showWallpaper({ commit, dispatch }, { wallpaper, screen, handleClientApiException, toast }) {
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

        //更新当前播放的壁纸信息
        await dispatch('updateRunningWallpaper');
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
    async getClientVersion(context, args) {
        const { handleClientApiException } = args || {};
        console.log("getClientVersion")
        await livewallpaperApi
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
    async setWallpaperOption({ commit, dispatch }, { wallpaper, option }) {
        console.log("setWallpaperOption")
        let dir = wallpaper.runningData.dir;
        let res = await livewallpaperApi.updateWallpaperOption(dir, option)
        console.log(res);
        if (res.ok === true)
            commit('setWallpaperOption', { wallpaper, option })
        dispatch('updateCurrentAudioWP');
    },
    async updateRunningWallpaper({ commit, state, dispatch }) {
        console.log("updateRunningWallpaper")
        try {
            let runningWallpapers = await livewallpaperApi.getRunningWallpapers()
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