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
        v-if="clientVersion && clientVersion != $config.expectedClientVersion"
        :label="
          $t('common.needUpgradeClient', {
            version: this.clientVersion,
            expectedVersion: $config.expectedClientVersion,
          })
        "
      >
      </b-field>
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
          v-on:click="$local.api.openStoreReview()"
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
const { mapState, mapActions, mapMutations } = createNamespacedHelpers('local')

export default {
  computed: {
    ...mapState(['clientVersion']),
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
    handleClientApiException(error) {
      this.$local.handleClientApiException(this, error)
    },
  },
}
</script>
