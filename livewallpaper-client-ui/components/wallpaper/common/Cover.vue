<template>
  <b-field>
    <div class="columns" is-vcentered is-centered style="min-height: 135px">
      <div class="column is-one-fifth">
        <CoverUploader
          :cover="innerCoverPath"
          v-on:uploaded="uploadedCallback"
          :uploadDir="uploadDir"
        />
      </div>
      <div class="column">
        <CoverSelector
          ref="selector"
          v-if="showSelector"
          :videoPath="videoPath"
          v-on:selected="selectorSelected"
          v-on:loadCompeted="selectorLoadCompeted"
        />
      </div>
    </div>
  </b-field>
</template>
<script>
export default {
  data() {
    return {
      file: null,
      progress: 0,
      innerCoverPath: this.coverPath,
      tokenSource: undefined,
      coverUrls: [],
      isGettingThumbnails: false,
    }
  },
  props: ['uploadDir', 'showSelector', 'coverPath', 'videoPath'],
  watch: {
    coverPath: function (newFile, oldFile) {
      this.innerCoverPath = newFile
    },
  },
  methods: {
    // init(path) {
    //   if (this.showSelector === true) {
    //     this.$refs.selector.loadConvers(path)
    //   }
    // },
    selectorSelected(path) {
      // this.$refs.uploader.setUploadedPath(path)
      this.innerCoverPath = path
      this.$emit('selected', path)
    },
    selectorLoadCompeted(urls) {
      //已经手动上传了
      // if (this.$refs.uploader.file) {
      //   return
      // }
      if (this.innerCoverPath) {
        return
      }
      // this.$refs.uploader.setUploadedPath(urls[0])
      this.innerCoverPath = urls[0]
      this.$emit('selected', urls[0])
    },
    uploadedCallback(res) {
      this.$emit('uploaded', res)
    },
  },
}
</script>
