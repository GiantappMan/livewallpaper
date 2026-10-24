<template>
  <div class="download-manager">
    <b-tooltip :label="$t('local.downloadManager')" position="is-left">
      <b-button
        type="is-primary is-light"
        icon-pack="fas"
        icon-left="download"
        v-on:click="openManager"
      >
        {{ $t('local.downloadManager') }}
        <span v-if="activeCount > 0" class="badge">{{ activeCount }}</span>
      </b-button>
    </b-tooltip>
  </div>
</template>
<script>
import { createNamespacedHelpers } from 'vuex'
import DownloadManagerPanel from './DownloadManagerPanel.vue'
const { mapState } = createNamespacedHelpers('local')

export default {
  created() {
    //非响应式即可，避免放在data里被Vue2跳过代理（_开头属性不会被代理到实例）
    this.modalInstance = null
    //刷新后从localStorage恢复的已完成记录不再重复弹提示
    this.toastedUrls = this.downloads
      .filter((d) => d.completed)
      .map((d) => d.url)
  },
  computed: {
    ...mapState(['downloads']),
    activeCount() {
      return this.downloads.filter((d) => !d.completed).length
    },
  },
  watch: {
    downloads: {
      deep: true,
      handler(list) {
        for (const item of list) {
          if (!item.completed || this.toastedUrls.includes(item.url)) continue
          this.toastedUrls.push(item.url)
          if (item.succeeded) {
            this.$buefy.toast.open({
              message: this.$t('local.downloadComplete'),
              type: 'is-success',
              queue: true,
            })
          } else if (!item.cancelled) {
            //失败时带上服务端原因（如下载目录无法创建）
            this.$buefy.toast.open({
              message: item.error
                ? `${this.$t('local.downloadFailed')}: ${item.error}`
                : this.$t('local.downloadFailed'),
              type: 'is-danger',
              queue: true,
              duration: 6000,
            })
          }
        }
      },
    },
  },
  methods: {
    openManager() {
      //编程式打开：Modal会挂到body上，声明式写法原地渲染会困在navbar的
      //层叠上下文里（遮罩盖不住页面工具栏，关闭按钮fixed定位到视口角落）
      if (this.modalInstance) return
      this.modalInstance = this.$buefy.modal.open({
        parent: this,
        component: DownloadManagerPanel,
        trapFocus: true,
        scroll: 'keep',
        //去掉默认fixed在视口右上角的X，关闭按钮由卡片头部提供
        canCancel: ['escape', 'outside'],
      })
      this.modalInstance.$once('hook:destroyed', () => {
        this.modalInstance = null
      })
    },
  },
}
</script>
<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  margin-left: 0.375rem;
  border-radius: 1rem;
  background: #ff3d5e;
  color: #fff;
  font-size: 0.75rem;
  line-height: 1;
}
</style>
