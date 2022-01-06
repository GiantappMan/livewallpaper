<template>
  <BaseProgressModal
    ref="innerModal"
    v-bind:show.sync="show"
    :progress="progress"
    :completed="completed"
    :successed="successed"
    :defaultUrl="`${serverHost}ffmpeg.7z`"
    v-on:start="startCallback"
    v-on:stop="stopCallback"
  >
    <template v-slot:header> {{ $t('common.installFFmpeg') }} </template>
    <template v-slot:help>
      <a
        href="https://github.com/giant-app/LiveWallpaper"
        target="_blank"
        class="button"
      >
        <b-icon pack="fa" icon="question-circle"></b-icon>
      </a>
    </template>
    <template v-slot:text>
      <template v-if="type === 'download'">
        {{
          $t('local.downloading', {
            progress: progress,
          })
        }}
      </template>
      <template v-else-if="type === 'decompress'"
        >{{
          $t('local.unzipping', {
            progress: progress,
          })
        }}
      </template>
      <template v-else-if="completed && successed"
        >{{ $t('local.downloadComplete') }}
      </template>
      <template v-else>{{ $t('local.waitStart') }}</template>
    </template>
  </BaseProgressModal>
</template>
<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState, mapGetters, mapActions, mapMutations } =
  createNamespacedHelpers('local')
export default {
  computed: {
    ...mapGetters(['serverHost']),
  },
  data() {
    return {
      show: false,
      progress: 0,
      completed: false,
      successed: false,
      type: undefined,
    }
  },
  methods: {
    async showModal() {
      this.show = true
      if (this.$refs.innerModal.isBusy) {
        return
      }

      this.$refs.innerModal.start()
    },
    startCallback(url, resolve) {
      let result = false
      this.$local.getApiInstance()
        .setupFFmpeg(
          url,
          function (e) {
            this.progress = e.percent
            this.completed = e.typeStr === 'completed'
            this.type = e.typeStr
            if (this.completed) {
              this.successed = e.successed
            }
          }.bind(this)
        )
        .then((r) => {
          console.log(r)
          result = r
        })
        .catch((error) => this.$local.handleClientApiException(this, error))
        .finally(() => {
          resolve(result)
        })
    },
    stopCallback(resolve) {
      this.$local.getApiInstance()
        .stopSetupFFmpeg()
        .catch((error) => this.$local.handleClientApiException(this, error))
        .finally(resolve)
    },
  },
}
</script>
