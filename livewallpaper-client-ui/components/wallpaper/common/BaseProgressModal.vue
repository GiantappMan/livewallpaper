<template>
  <b-modal v-model="innerShow">
    <div class="card">
      <header class="card-header">
        <p class="card-header-title">
          <slot name="header"></slot>
        </p>

        <b-switch v-model="enableCustomUrl" :disabled="isBusy">{{
          $t('local.customUrlTip')
        }}</b-switch>
      </header>
      <div class="card-content">
        <div class="content">
          <div class="columns subtitle" v-if="enableCustomUrl">
            <div class="column is-11">
              <b-input
                :disabled="isBusy"
                :placeholder="$t('local.customUrlPlaceholder')"
                v-model="downloadUrl"
                icon-pack="fas"
                icon-right="undo"
                icon-right-clickable
                @icon-right-click="downloadUrl = defaultUrl"
              ></b-input>
            </div>
            <div class="column">
              <slot name="help"></slot>
            </div>
            <div class="column"></div>
          </div>
          <b-progress
            :value="progress"
            show-value
            :type="completed ? 'is-success' : 'is-info'"
          >
            <slot name="text"></slot>
          </b-progress>
        </div>
      </div>
      <footer class="card-footer">
        <div class="card-footer-item"></div>
        <div class="card-footer-item"></div>
        <b-button
          v-if="successed"
          v-on:click="innerShow = false"
          class="card-footer-item"
          type="is-success"
          >{{ $t('common.close') }}</b-button
        >
        <b-button
          class="card-footer-item"
          v-else-if="!isBusy"
          v-on:click="start"
          type="is-info"
        >
          {{ $t('common.start') }}
        </b-button>
        <b-button
          v-else-if="isBusy || downloading"
          v-on:click="stop"
          :loading="stoping"
          :disabled="stoping"
          class="card-footer-item"
          type="is-danger"
          >{{ $t('common.stop') }}
        </b-button>
      </footer>
    </div>
  </b-modal>
</template>
<script>
export default {
  data() {
    return {
      isBusy: false,
      enableCustomUrl: false,
      downloadUrl: this.defaultUrl,
      stoping: false,
      innerShow: this.show,
    }
  },
  props: ['show', 'defaultUrl', 'progress', 'completed', 'successed'],
  watch: {
    innerShow: function (newVal, oldVal) {
      this.$emit('update:show', newVal)
    },
    show: function (newVal, oldVal) {
      this.innerShow = newVal
    },
    defaultUrl: function (newVal, oldVal) {
      console.log(newVal, oldVal)
      if (newVal && !this.downloadUrl) {
        this.downloadUrl = newVal
      }
    },
  },
  computed: {
    downloading: function () {
      if (this.progress > 0 || this.progress < 100) {
        return true
      }
      return false
    },
  },

  methods: {
    async start() {
      if (this.isBusy) {
        return
      }
      this.isBusy = true

      var result = new Promise((resolve) =>
        this.$emit('start', this.downloadUrl, resolve)
      )

      let r = await result
      // if (!r.ok) {
      //   return
      // }
      this.isBusy = false
    },
    async stop() {
      this.stoping = true

      var result = new Promise((resolve) => this.$emit('stop', resolve))

      await result
      this.stoping = false
    },
  },
}
</script>
