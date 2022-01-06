<template>
  <div class="uploader">
    <div class="uploader-show">
      <img
        v-if="uploadedPath"
        v-bind:src="`${$local.getApiInstance().serverHost}assets/image/?localpath=${uploadedPath}`"
        alt="cover-preview-show"
        class="cover-preview-show"
      />
      <div class="tip">
        <span class="tip-upload">
          <b-field class="file is-primary">
            <b-upload
              v-model="file"
              class="file-label"
              accept="image/jpeg, image/jpg, image/png"
            >
              <span class="file-cta">
                <span class="file-label">{{ $t('common.uploadCover') }}</span>
              </span>
            </b-upload>
          </b-field>
        </span>
        <!-- <span class="tip-edit">裁切修改</span> -->
      </div>
    </div>
    <b-loading v-model="isloading" :is-full-page="false"></b-loading>
  </div>
</template>
<script>
export default {
  data() {
    return {
      file: null,
      progress: 0,
      uploadedPath: this.cover,
      isloading: false,
    }
  },
  watch: {
    file: function (newFile, oldFile) {
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
    cover: function (newFile, oldFile) {
      this.uploadedPath = newFile
    },
  },
  props: ['url', 'uploadDir', 'cover'],

  methods: {
    upload(e) {
      this.isloading = true
      this.progress = 0

      var result = new Promise((resolve, reject) => {
        var config = {
          onUploadProgress: this._uploadProgressCallback,
          resolve,
          reject,
        }
        this.tokenSource = this.$local.getApiInstance().uploadFile(
          this.$axios,
          e,
          this.uploadDir,
          config
        )
      })

      result
        .then((res) => {
          this.uploadedPath = res.data
          this.$emit('uploaded', res.data)
        })
        .catch((error) => this.$local.handleClientApiException(this, error))
        .finally(() => {
          this.tokenSource = null
          this.isloading = false
        })
    },
  },
}
</script>
<style scoped>
.uploader {
  border: 1px solid #ccd0d7;
  line-height: 1.15;
  font-size: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  margin-right: 44px;
  position: relative;
}
.uploader-show {
  line-height: 1.15;
  font-size: 0;
  cursor: pointer;
  height: 100%;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.tip {
  cursor: pointer;
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-around;
  font-size: 12px;
  color: #fff;
  text-align: center;
  line-height: 26px;
  width: 100%;
  border-radius: 4px 0 4px 0;
  z-index: 1;
}

.tip-upload {
  font-family: PingFangSC-Regular, Microsoft YaHei, Arial, Helvetica, sans-serif;
  text-rendering: optimizelegibility;
  -webkit-font-smoothing: antialiased;
  cursor: pointer;
  font-size: 12px;
  color: #fff;
  text-align: center;
  line-height: 26px;
  margin: 0;
  padding: 0;
  background: rgba(0, 0, 0, 0.5);
  margin-right: 2px;
}

.tip-edit {
  font-family: PingFangSC-Regular, Microsoft YaHei, Arial, Helvetica, sans-serif;
  text-rendering: optimizelegibility;
  -webkit-font-smoothing: antialiased;
  cursor: pointer;
  font-size: 12px;
  color: #fff;
  text-align: center;
  line-height: 26px;
  margin: 0;
  padding: 0;
  min-width: 50%;
  background: rgba(0, 0, 0, 0.5);
  margin-left: 2px;
}
</style>
