//下载历史持久化：用户点“清除记录”前一直保留，刷新/重启页面后仍可见。
//只存已完成的记录；进行中的任务不落盘——刷新后服务端的进度广播会按url重新填充。
const STORAGE_KEY = 'lw_download_records'
const MAX_RECORDS = 50
const SAVE_MUTATIONS = [
  'local/pushDownload',
  'local/updateDownload',
  'local/clearFinishedDownloads',
  'local/loadDownloadRecords',
]

export default ({ store }) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) store.commit('local/loadDownloadRecords', JSON.parse(raw))
  } catch (e) {
    console.log('load download records', e)
  }

  store.subscribe((mutation, state) => {
    if (!SAVE_MUTATIONS.includes(mutation.type)) return
    try {
      const records = state.local.downloads
        .filter((d) => d.completed)
        .slice(-MAX_RECORDS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch (e) {
      console.log('save download records', e)
    }
  })
}
