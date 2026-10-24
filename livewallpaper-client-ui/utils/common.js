//社区线上地址（默认）
export const COMMUNITY_URL_ONLINE = 'https://livewallpaper.giantapp.cn'
//社区本地开发地址（giantapp-wallpaper-server next dev 默认端口）
export const COMMUNITY_URL_LOCAL = 'http://localhost:3000'

export function delay(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    })
}

//是否 version>compareVersion
export function isVersionGreatherThan(version, compareVersion) {
    if (!version)
        version = "0";
    if (!compareVersion)
        compareVersion = "0";
    var versionArr = version.split('.').map(Number);
    var compareVersion = compareVersion.split('.').map(Number);
    for (let i = 0; i < compareVersion.length; i++) {
        if (compareVersion[i] < versionArr[i])
            return true;
    }
    return false;
}