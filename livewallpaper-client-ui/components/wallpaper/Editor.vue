<template>
  <div class="container main">
    <!-- <nav class="breadcrumb" aria-label="breadcrumbs">
      <ul>
        <li>
          <b-navbar-item tag="nuxt-link" :to="localePath('/')">
            {{ $t('common.home') }}
          </b-navbar-item>
        </li>
        <li class="is-active">
          <a href="#" aria-current="page">{{
            $t('dashboard.menus.createWallpaper')
          }}</a>
        </li>
      </ul>
    </nav>
    <hr class="is-medium" /> -->
    <section>
      <b-field :label="$t('common.wallpaper')">
        <Uploader
          ref="uploader"
          :file="filePath"
          v-on:cancelled="onUploaderCancelled"
          v-on:uploaded="onuploaded"
          :uploadDir="wallpaperDir"
          :deleteTitle="this.$t('local.deletingWallpaper')"
          :deleteMessage="
            this.$t('local.deletingWallpaperConfirmMessage', {
              delete: $t('common.delete').toLowerCase(),
              name: this.title,
            })
          "
          :deleteConfirmText="$t('common.delete')"
          :deleteCancelText="$t('common.cancel')"
        />
      </b-field>
      <b-field
        :label="$t('common.cover')"
        v-if="fileType && fileType != 'image'"
      >
        <Cover
          :coverPath="coverPath"
          :videoPath="filePath"
          v-on:uploaded="onCoverUploaded"
          v-on:selected="onSelectorSelected"
          :uploadDir="wallpaperDir"
          :showSelector="fileType && fileType === 'video'"
        />
      </b-field>
      <b-field :label="$t('dashboard.client.editor.title')">
        <b-input
          v-model="title"
          :placeholder="$t('dashboard.client.editor.titlePlaceholder')"
        >
        </b-input>
      </b-field>
      <b-field :label="$t('dashboard.client.editor.description')">
        <b-input
          v-model="description"
          :placeholder="$t('dashboard.client.editor.descriptionPlaceholder')"
          maxlength="200"
          type="textarea"
        ></b-input>
      </b-field>
      <b-field :label="$t('dashboard.client.editor.tag')">
        <b-taginput
          v-model="tags"
          autocomplete
          :allow-new="true"
          :maxlength="20"
          :maxtags="10"
          :open-on-focus="false"
          field="user.first_name"
          icon-pack="fas"
          icon="tags"
          :placeholder="$t('dashboard.client.editor.tagPlaceholder')"
        >
        </b-taginput>
      </b-field>
      <hr />
      <b-field>
        <section class="b-tooltips">
          <button
            :disabled="!canSave"
            v-on:click="onSaveLocalClick"
            class="button is-primary"
          >
            {{ $t('common.save') }}
          </button>
        </section>
      </b-field>
    </section>
    <client-only>
      <b-loading :closable="false" v-model="isLoading"></b-loading>
    </client-only>
  </div>
</template>
<script>
export default {
  components: {},
  data() {
    return {
      sourceData: undefined,
      filePath: undefined,
      coverPath: null,
      fileType: undefined,
      title: undefined,
      description: undefined,
      isLoading: false,
      tags: [],
      wallpaperDir: undefined,
    }
  },
  props: {
    wallpapersRouterName: {
      type: String,
      default: 'index',
    },
  },
  computed: {
    isEditing: function () {
      let tmp = this.sourceData
      if (tmp) {
        let r =
          this.filePath != tmp.filePath ||
          this.fileType != tmp.fileType ||
          this.title != tmp.title ||
          this.description != tmp.description ||
          this.coverPath != tmp.coverPath
        return r || this.$refs.uploader.uploading
      } else {
        let r =
          this.filePath ||
          this.fileType ||
          this.title ||
          this.description ||
          this.coverPath
        return r
      }
    },
    canSave: function () {
      let r =
        this.filePath &&
        this.title &&
        (this.fileType === 'image' || this.coverPath)
      return r
    },
  },
  beforeMount() {
    window.addEventListener('beforeunload', this.preventNav)
    this.$once('hook:beforeDestroy', () => {
      window.removeEventListener('beforeunload', this.preventNav)
    })
  },
  watch: {
    coverPath(newValue, oldValue) {
      //有文件有老封面才删，清除数据后不删
      console.log(this.filePath)
      if (oldValue && this.filePath) {
        this.$local.api.deleteFiles([oldValue])
      }
    },
  },
  methods: {
    preventNav(event) {
      if (!this.isEditing) return
      event.preventDefault()
      event.returnValue = ''
    },
    setUIData(wallpaper) {
      let projectInfo = wallpaper ? wallpaper.info : {}
      let runningData = wallpaper ? wallpaper.runningData : null

      this.filePath = null
      this.coverPath = null

      if (runningData) {
        this.filePath = wallpaper.runningData.absolutePath
        this.coverPath = `${wallpaper.runningData.dir}\\${projectInfo.preview}`
      }

      this.fileType = projectInfo.type ?? null
      this.title = projectInfo.title ?? null
      this.description = projectInfo.description ?? null
      this.tags = projectInfo.tags ?? []

      if (this.$refs.uploader) {
        this.$refs.uploader.cleanFile()
      }
    },
    onSaveLocalClick() {
      this.isLoading = true

      if (!this.coverPath && this.fileType === 'image')
        this.coverPath = this.filePath
      var info = {
        title: this.title,
        description: this.description,
        file: this.$local.substrLastIndexOf(this.filePath, '\\'),
        preview: this.$local.substrLastIndexOf(this.coverPath, '\\'),
        type: this.fileType,
        tags: this.tags,
      }
      console.log('savelocal', info)
      this.$local.api
        .updateProjectInfo(this.wallpaperDir, info)
        .then((r) => {
          this.$buefy.dialog.confirm({
            canCancel: ['button'],
            message: this.$t('common.createSuccess'),
            type: 'is-success',
            cancelText: this.$t('common.ok'),
            confirmText: this.$t('common.viewNow'),
            onConfirm: () => {
              this.sourceData = null
              this.setUIData()
              this.$router.push(
                this.localePath({ name: this.wallpapersRouterName })
              )
            },
            onCancel: () => {
              this.sourceData = null
              this.initPage()
            },
          })
        })
        .catch((error) => this.$local.handleClientApiException(this, error))
        .finally(this.hideLoading)
    },
    hideLoading() {
      this.isLoading = false
    },
    onUploaderCancelled() {
      if (!this.filePath) {
        return
      }
      this.isLoading = true
      this.$local.api
        .deleteFiles([this.filePath, this.coverPath])
        .then((r) => {
          this.filePath = null
          this.coverPath = null
          this.fileType = null
          this.$buefy.toast.open({
            message: this.$t('dashboard.client.editor.uploadCancelled'),
            queue: false,
          })
        })
        .catch((error) => this.$local.handleClientApiException(this, error))
        .finally(this.hideLoading)
    },
    async onuploaded(res) {
      this.$buefy.toast.open({
        message: this.$t('common.uploaded'),
        type: 'is-success',
        queue: false,
      })
      this.fileType = this.$local.substrToLastIndex(
        this.$refs.uploader.fileType,
        '/'
      )
      console.log(this.fileType)
      this.filePath = res.data
      if (!this.title)
        this.title = this.$local.substrLastIndexOf(this.filePath, '\\')
      // var path = this.wallpaper.runningData.absolutePath
      // this.$nextTick(() => {
      //   if (this.$refs.coverUploader) {
      //     this.$refs.coverUploader.init(this.filePath)
      //   }
      // })
    },
    onCoverUploaded(res) {
      this.coverPath = res
    },
    onSelectorSelected(path) {
      if (!path) {
        return
      }
      this.isLoading = true
      var dist = `${this.wallpaperDir}\\preview.png`
      this.$local.api
        .moveFile(path, dist, false)
        .then(() => {
          this.coverPath = dist
        })
        .catch((error) => this.$local.handleClientApiException(this, error))
        .finally(this.hideLoading)
    },
    async initPage(path) {
      try {
        let wallpaper = null
        this.isLoading = true

        if (path) {
          let res = await this.$local.api.getWallpaper(path)
          wallpaper = res.data
          if (!wallpaper) {
            alert("Wallpaper doesn't exist")
          }
        }

        this.setUIData(wallpaper)

        if (wallpaper) {
          //编辑壁纸
          this.wallpaperDir = wallpaper.runningData.dir
          this.sourceData = {
            filePath: this.filePath,
            fileType: this.fileType,
            title: this.title,
            description: this.description,
            coverPath: this.coverPath,
          }
        } else {
          //新建壁纸
          let res = await this.$local.api.getDraftDir()
          console.log('draftDir', res.data)
          this.wallpaperDir = res.data
        }
      } catch (error) {
        this.$local.handleClientApiException(this, error)
      } finally {
        this.hideLoading()
      }
    },
    beforeRouteLeave(to, from, next) {
      if (this.isEditing) {
        if (!window.confirm(this.$t('dashboard.client.editor.leaveTips'))) {
          return
        }
      }
      next()
    },
  },
  created() {},
  fetch() {
    this.initPage(this.$route.params.id)
  },
  fetchOnServer: false,
}
</script>

<style scoped>
.main {
  padding: 2rem 3rem;
  min-height: 600px;
}
</style>
>
