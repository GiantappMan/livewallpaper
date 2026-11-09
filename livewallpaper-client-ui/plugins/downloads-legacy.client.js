//旧版下载历史存在浏览器localStorage里，按源隔离导致线上站/本地页数据不一致；
//现在历史记账在本地服务端（见store/local.js的loadDownloadHistory）。
//这里只在启动时把旧key lw_download_records 的记录先展示出来，迁移成功后store会删除该key
const LEGACY_KEY = 'lw_download_records'

export default ({ store }) => {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw) store.commit('local/loadDownloadRecords', JSON.parse(raw))
  } catch (e) {
    console.log('load legacy download records', e)
  }
}
