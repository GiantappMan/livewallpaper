<template>
  <b-field>
    <b-field class="file is-primary" :class="{ 'has-name': !!innerFile }">
      <b-upload
        drag-drop
        v-model="innerFile"
        :disabled="!!innerFile"
        class="file-label"
        accept="image/*,video/*"
      >
        <span class="file-cta">
          <b-icon class="file-icon" pack="fas" icon="upload"></b-icon>
          <span class="file-label">{{
            $t('dashboard.client.editor.uploadTips')
          }}</span>
        </span>
      </b-upload>
    </b-field>
    <div class="columns" v-if="innerFile">
      <div class="column is-11">
        <b-progress type="is-info" :value="innerProgress" show-value>
          {{ innerFile.name }}
        </b-progress>
      </div>
      <div class="column">
        <button
          class="delete is-small"
          type="button"
          @click="stopUpload"
        ></button>
      </div>
    </div>
  </b-field>
</template>
<script>
export default {
  data() {
    return {
      innerFile: this.file,
      innerProgress: 0,
      fileUploadedPath: undefined,
      tokenSource: undefined,
      fileType: null,
    }
  },
  props: [
    'file',
    'url',
    'deleteTitle',
    'deleteMessage',
    'deleteConfirmText',
    'deleteCancelText',
    'uploadDir',
  ],
  watch: {
    file: function (newFile, oldFile) {
      if (newFile && !this.innerFile) {
        this.innerFile = {
          name: newFile,
          fake: true,
        }
        this.innerProgress = 100
      }
    },
    innerFile: function (newFile, oldFile) {
      if (newFile && newFile.fake) {
        // 外部传入的模拟数据
        return
      }
      if (newFile && oldFile) {
        let compareFields = ['lastModified', 'name', 'size', 'type ']
        let sameCount = 0
        for (const item of compareFields) {
          if (newFile[item] != oldFile[item]) {
            break
          }
          sameCount++
        }
        if (sameCount == compareFields.length) {
          return
        }
      }
      if (newFile) {
        this.upload(newFile)
      }
    },
  },
  methods: {
    _uploadProgressCallback(progressEvent) {
      this.innerProgress = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      )
      console.log(this.innerProgress, progressEvent.loaded, progressEvent.total)
    },
    upload(e) {
      this.innerProgress = 0
      this.fileType = e.type
      console.log('fileType', this.fileType)
      var result = new Promise((resolve, reject) => {
        var config = {
          onUploadProgress: this._uploadProgressCallback,
          resolve,
          reject,
        }
        this.tokenSource = this.$local.api.uploadFile(
          this.$axios,
          e,
          this.uploadDir,
          config
        )
      })

      result
        .then((e) => {
          this.$emit('uploaded', e)
        })
        .catch((error) => this.$local.handleClientApiException(this, error))
        .finally(() => {
          this.tokenSource = null
        })
    },
    stopUpload() {
      this.$buefy.dialog.confirm({
        title: this.deleteTitle,
        message: this.deleteMessage,
        confirmText: this.deleteConfirmText,
        cancelText: this.deleteCancelText,
        type: 'is-danger',
        hasIcon: true,
        onConfirm: async () => {
          if (this.tokenSource) {
            this.tokenSource.cancel('Operation canceled by the user.')
          }
          this.innerProgress = 0
          this.$emit('cancelled')
          this.innerFile = null
        },
        onCancel: () => {},
      })
    },
    cleanFile() {
      this.innerFile = null
    },
  },
}
</script>
