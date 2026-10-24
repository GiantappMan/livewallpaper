import OpenClientTips from '../components/wallpaper/common/OpenClientTips'
import { COMMUNITY_URL_ONLINE } from '../utils/common'

export default ({ store, app }, inject) => {
    const common = {
        downloadUrl: "",
        appStoreUrl: "https://www.microsoft.com/store/apps/9N1S487WCGWR",
        getApiInstance() {
            return store.state.local.livewallpaperApi;
        },
        handleClientApiException(page, error) {
            console.log(error)
            page.$buefy.modal.open({
                parent: page,
                component: OpenClientTips,
                trapFocus: true,
            })
        },
        substrLastIndexOf(path, searchValue) {
            if (!path)
                return;
            let fileName = path.substr(path.lastIndexOf(searchValue) + 1);
            return fileName;
        },
        substrToLastIndex(path, searchValue) {
            if (!path)
                return;
            let fileName = path.substr(0, path.lastIndexOf(searchValue));
            return fileName;
        },
        errorDialog(page, message) {
            page.$buefy.dialog.alert({
                title: 'Error',
                message,
                type: 'is-danger',
                hasIcon: true,
                icon: 'times-circle',
                iconPack: 'fa',
                ariaRole: 'alertdialog',
                ariaModal: true
            })
        },
        successToast(page, message) {
            page.$buefy.toast.open({
                message: message,
                type: 'is-success'
            })
        },
        getOnlineUrl(path, culture) {
            //实验室设置的自定义社区地址（仅开发模式存在），空则用线上地址
            let setting = store.state.local.setting;
            let communityUrl =
                setting && setting.lab && setting.lab.communityUrl
                    ? setting.lab.communityUrl
                    : COMMUNITY_URL_ONLINE;
            communityUrl = communityUrl.replace(/\/+$/, '');
            let url = `${communityUrl}${culture === 'zh' ? '' : '/' + culture}/${path}?v=${app.$config.expectedClientVersion}`;
            return url
        }
    };
    inject('local', common)
}