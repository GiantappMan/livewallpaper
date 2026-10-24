<template>
  <div class="download-manager">
    <b-tooltip :label="$t('local.downloadManager')" position="is-left">
      <b-button
        type="is-primary is-light"
        icon-pack="fas"
        icon-left="download"
        v-on:click="show = true"
      >
        {{ $t('local.downloadManager') }}
        <span v-if="activeCount > 0" class="badge">{{ activeCount }}</span>
      </b-button>
    </b-tooltip>

    <b-modal v-model="show" scroll="keep">
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
                {{ $t('wallpapers.gotoLocalWallpaper') }}
              </b-button>
            </div>
          </div>
        </section>
      </div>
    </b-modal>
  </div>
</template>
<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState, mapActions } = createNamespacedHelpers('local')

export default {
  created() {
    //非响应式即可，避免放在data里被Vue2跳过代理（_开头属性不会被代理到实例）
    this.toastedUrls = []
  },
  data() {
    return {
      show: false,
    }
  },
  computed: {
    ...mapState(['downloads']),
    activeCount() {
      return this.downloads.filter((d) => !d.completed).length
    },
    finishedCount() {
      return this.downloads.filter((d) => d.completed).length
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
    ...mapActions(['cancelDownload']),
    statusType(item) {
      if (!item.completed) return 'is-info'
      if (item.cancelled) return 'is-warning'
      return item.succeeded ? 'is-success' : 'is-danger'
    },
    async cancel(item) {
      await this.cancelDownload(item.url)
    },
    gotoLocal() {
      this.show = false
      this.$router.push(this.localePath('/'))
    },
    clearFinished() {
      this.$store.commit('local/clearFinishedDownloads')
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
.manager-card {
  width: 560px;
  max-width: 92vw;
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
