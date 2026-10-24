<template>
  <div class="card manager-card">
    <header class="card-header">
      <p class="card-header-title">{{ $t('local.downloadManager') }}</p>
      <b-button
        v-if="finishedCount > 0"
        class="card-header-icon"
        type="is-text"
        size="is-small"
        v-on:click="clearFinished"
      >
        {{ $t('local.clearRecords') }}
      </b-button>
      <button
        class="delete header-close"
        :title="$t('common.close')"
        aria-label="close"
        v-on:click="close"
      ></button>
    </header>
    <section class="card-content">
      <Empty v-if="downloads.length === 0" pack="fas" icon="download">
        {{ $t('local.noDownloads') }}
      </Empty>
      <div
        v-for="item in downloads"
        v-else
        :key="item.url"
        class="download-item"
      >
        <div class="item-head">
          <span class="item-title" :title="item.title">{{
            item.title
          }}</span>
          <span class="item-status">
            <template v-if="!item.completed">
              {{ $t('local.downloading', { progress: item.percent }) }}
            </template>
            <template v-else-if="item.cancelled">
              {{ $t('local.downloadCancelled') }}
            </template>
            <template v-else-if="item.succeeded">
              {{ $t('local.downloadComplete') }}
            </template>
            <template v-else>
              {{ $t('local.downloadFailed') }}
            </template>
          </span>
        </div>
        <b-progress
          :value="item.percent"
          show-value
          :type="statusType(item)"
        >
        </b-progress>
        <p
          v-if="item.completed && !item.succeeded && !item.cancelled && item.error"
          class="item-error"
        >
          {{ item.error }}
        </p>
        <div class="item-actions">
          <b-button
            v-if="!item.completed"
            size="is-small"
            type="is-danger is-light"
            :loading="item.cancelling"
            v-on:click="cancel(item)"
          >
            {{ $t('common.cancel') }}
          </b-button>
          <b-button
            v-else-if="item.succeeded"
            size="is-small"
            type="is-primary is-light"
            v-on:click="gotoLocal"
          >
            {{ $t('wallpapers.info.gotoLocalWallpaper') }}
          </b-button>
        </div>
      </div>
    </section>
  </div>
</template>
<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState } = createNamespacedHelpers('local')

export default {
  computed: {
    ...mapState(['downloads']),
    finishedCount() {
      return this.downloads.filter((d) => d.completed).length
    },
  },
  methods: {
    statusType(item) {
      if (!item.completed) return 'is-info'
      if (item.cancelled) return 'is-warning'
      return item.succeeded ? 'is-success' : 'is-danger'
    },
    async cancel(item) {
      await this.$store.dispatch('local/cancelDownload', item.url)
    },
    gotoLocal() {
      this.close()
      this.$router.push(this.localePath('/'))
    },
    clearFinished() {
      this.$store.commit('local/clearFinishedDownloads')
    },
    //编程式Modal渲染的动态组件$parent即Modal实例
    close() {
      this.$parent.close()
    },
  },
}
</script>
<style scoped>
.manager-card {
  display: flex;
  flex-direction: column;
  /*外层.modal-content由Buefy按默认width撑到960px，卡片需auto外边距才水平居中*/
  margin: 0 auto;
  width: 560px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 40px);
}
.manager-card .card-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
.header-close {
  align-self: center;
  margin: 0 0.5rem;
}
.download-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid hsl(0, 0%, 96%);
}
.download-item:last-child {
  border-bottom: none;
}
.item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}
.item-title {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.item-status {
  flex-shrink: 0;
  font-size: 0.875rem;
  color: hsl(0, 0%, 48%);
}
.item-error {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  word-break: break-all;
  color: #ff3d5e;
}
.item-actions {
  margin-top: 0.375rem;
  text-align: right;
}
</style>
