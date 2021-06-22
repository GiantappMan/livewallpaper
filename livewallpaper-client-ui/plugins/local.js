import OpenClientTips from '../components/wallpaper/common/OpenClientTips'
import { livewallpaperApi } from "../utils/livewallpaperInstance"

export default ({ app }, inject) => {
    const common = {
        downloadUrl: "",
        appStoreUrl: "https://www.microsoft.com/store/apps/9N1S487WCGWR",
        api: livewallpaperApi,
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
            let url = `https://livewallpaper.giantapp.cn${culture === 'zh' ? '' : '/' + culture}/${path}`;
            return url
        }
    };
    inject('local', common)
}