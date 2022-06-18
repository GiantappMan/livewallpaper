<template>
  <div class="card">
    <div class="card-content">
      <p class="title">
        <template v-if="!clientVersion">
          {{ $t('common.noClient') }}
        </template>
        <template
          v-else-if="v1GreatherThanV2(expectedClientVersion, clientVersion)"
        >
          {{
            $t('common.needUpgradeClient', {
              version: clientVersion,
              expectedVersion: expectedClientVersion,
            })
          }}
        </template>
        <template v-else>
          <span v-html="$t('common.feedbackTips')"> </span>
        </template>
      </p>
    </div>
    <footer class="card-footer">
      <p class="card-footer-item">
        <a :href="$config.appStoreUrl" target="_blank" type="is-info is-light">
          <template
            v-if="clientVersion && clientVersion != expectedClientVersion"
          >
            {{ $t('common.upgradeClient') }}
          </template>
          <template v-else> {{ $t('common.downloadClient') }} </template>
        </a>
      </p>
      <p class="card-footer-item">
        <a
          href="livewallpaper://"
          v-on:click="showMessage"
          target="_blank"
          type="is-success is-light"
          >{{ $t('common.openClient') }}</a
        >
      </p>
    </footer>
  </div>
</template>
<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState, mapActions, mapMutations } = createNamespacedHelpers('local')
import { isVersionGreatherThan } from '../../../utils/common'

export default {
  computed: {
    ...mapState(['clientVersion', 'expectedClientVersion']),
  },

  async mounted() {
    //每次都获取版本号，防止中途客户端关闭提示错误
    await this.$store.dispatch('local/getClientVersion')

    console.log(this.clientVersion)
    console.log(this.expectedClientVersion)
  },
  methods: {
    v1GreatherThanV2(v1, v2) {
      let r = isVersionGreatherThan(v1, v2)
      return r
    },
    showMessage() {
      this.$emit('close')
      this.$buefy.snackbar.open({
        message: this.$t('common.afterOpenClientTips'),
        actionText: this.$t('common.refresh'),
        indefinite: true,
        onAction: () => {
          this.$nuxt.refresh()
        },
      })
    },
  },
}
</script>
