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