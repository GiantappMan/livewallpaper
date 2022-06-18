<template>
  <div class="container main">
    <section>
      <b-field
        :label="
          $t('common.clientVersion', {
            version: this.clientVersion,
          })
        "
      >
      </b-field>
      <b-field
        v-if="
          clientVersion &&
          isNewerVersion(clientVersion, $config.expectedClientVersion)
        "
        :label="
          $t('common.needUpgradeClient', {
            version: this.clientVersion,
            expectedVersion: $config.expectedClientVersion,
          })
        "
      >
        <a :href="$config.appStoreUrl" target="_blank">
          <span> {{ $t('common.downloadClient') }} </span>
        </a>
      </b-field>
      <client-only>
        <b-field v-if="serverHost">
          <a target="_blank" :href="`${serverHost}?p=${serverPort}`">
            {{ `${serverHost}?p=${serverPort}` }}
          </a>
        </b-field>
      </client-only>
      <b-field>
        <a target="_blank" :href="$config.releaseNotesUrl">
          {{ $t('common.releaseNotes') }}
        </a>
      </b-field>
      <b-field>
        <a target="_blank" :href="$config.donateUrl">
          {{ $t('common.donate') }}
        </a>
      </b-field>
      <b-field>
        <b-button
          v-on:click="$local.getApiInstance().openStoreReview()"
          target="_blank"
          href="#"
        >
          {{ $t('common.thumbUp') }}
        </b-button>
      </b-field>
    </section>
    <b-loading :closable="false" v-model="isLoading"></b-loading>
  </div>
</template>
<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState, mapGetters, mapActions, mapMutations } =
  createNamespacedHelpers('local')

export default {
  computed: {
    ...mapState(['clientVersion', 'serverPort']),
    ...mapGetters(['serverHost']),
  },
  data() {
    return {
      isLoading: false,
    }
  },
  async mounted() {
    //每次都获取版本号，防止中途客户端关闭提示错误
    this.isLoading = true
    await this.$store.dispatch('local/getClientVersion', {
      handleClientApiException: this.handleClientApiException,
    })
    this.isLoading = false
    console.log(this.clientVersion)
  },
  methods: {
    isNewerVersion(oldVer, newVer) {
      const oldParts = oldVer.split('.')
      const newParts = newVer.split('.')
      for (var i = 0; i < newParts.length; i++) {
        const a = ~~newParts[i] // parse int
        const b = ~~oldParts[i] // parse int
        if (a > b) return true
        if (a < b) return false
      }
      return false
    },
    handleClientApiException(error) {
      this.$local.handleClientApiException(this, error)
    },
  },
}
</script>
