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
            $t('dashboard.menus.createGroup')
          }}</a>
        </li>
      </ul>
    </nav>
    <hr class="is-medium" /> -->
    <section>
      <b-field :label="$t('dashboard.client.editor.title')">
        <b-input
          v-model="title"
          :placeholder="$t('dashboard.client.editor.titlePlaceholder')"
        >
        </b-input>
      </b-field>

      <b-field :label="$t('dashboard.client.editor.groupItems')">
        <draggable
          class="list-group"
          v-model="groupItemWallpaperModels"
          @start="drag = true"
          v-bind="dragOptions"
          @end="drag = false"
        >
          <transition-group type="transition" class="columns is-multiline">
            <div
              class="list-group-item column is-one-quarter"
              @mouseenter="hoverWp = item"
              @mouseleave="hoverWp = false"
              v-for="(item, index) in groupItemWallpaperModels"
              :key="`${index}`"
            >
              <div class="card-image">
                <figure class="image is-4by3">
                  <img
                    class="wp-cover"
                    v-bind:src="`${serverHost}assets/image/?localpath=${item.runningData.dir}//${item.info.preview}`"
                    v-bind:alt="item.info.title"
                  />
                </figure>
                <transition name="fade">
                  <nav class="card-bottom level" v-if="hoverWp === item">
                    <div class="level-left">
                      <b-tooltip
                        :label="$t('common.settings')"
                        class="level-item"
                        position="is-right"
                      >
                        <!-- <div v-on:click="onConfigWPClick(item)">
                          <b-icon type="is-white" icon="cog" pack="fas">
                          </b-icon>
                        </div> -->
                      </b-tooltip>
                    </div>
                    <div class="level-right">
                      <b-tooltip
                        :label="$t('common.delete')"
                        class="level-item"
                        position="is-left"
                      >
                        <div v-on:click="onDeleteWPClick(item)">
                          <b-icon type="is-white" icon="trash-alt" pack="fas">
                          </b-icon>
                        </div>
                      </b-tooltip>
                    </div>
                  </nav>
                </transition>
              </div>
              <div class="card-content columns">
                <div class="column is-12">
                  {{ item.info.title }}
                </div>
              </div>
            </div>
          </transition-group>
        </draggable>
      </b-field>
      <div class="my-3">
        <button class="button is-info" @click="addItem">
          {{ $t('common.add') }}
        </button>
      </div>
      <hr />
      <b-field>
        <section class="b-tooltips">
          <button
            class="button is-primary"
            :disabled="!canSave"
            v-on:click="onSaveClick"
          >
            {{ $t('common.save') }}
          </button>
        </section>
      </b-field>
    </section>
    <client-only>
      <b-loading :closable="false" v-model="isLoading"></b-loading>
    </client-only>
    <WallpaperSelectorModal
      v-bind:show.sync="showSelector"
      ref="wallpaperSelectorModal"
      @selected="onWallpaperSelected"
    />
  </div>
</template>

<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState, mapGetters, mapActions, mapMutations } =
  createNamespacedHelpers('local')
import draggable from 'vuedraggable'
export default {
  components: {
    draggable,
  },
  props: {
    wallpapersRouterName: {
      type: String,
      default: 'index',
    },
  },
  data() {
    return {
      hoverWp: undefined,
      drag: false,
      showSelector: false,
      isLoading: false,

      wallpaperDir: undefined,
      title: undefined,
      groupItemWallpaperModels: [],
    }
  },
  computed: {
    dragOptions() {
      return {
        animation: 200,
        group: 'description',
        disabled: false,
        ghostClass: 'ghost',
      }
    },
    isEditing: function () {
      let tmp = this.sourceData
      if (tmp) {
        let r =
          this.title != tmp.title ||
          JSON.stringify(this.groupItemWallpaperModels) !=
            JSON.stringify(tmp.groupItemWallpaperModels)
        return r
      } else {
        let r = this.title
        return r
      }
    },
    canSave: function () {
      let r = this.title
      return r
    },
    ...mapGetters(['serverHost']),
  },
  mounted() {},
  fetch() {
    this.initPage(this.$route.params.id)
  },
  fetchOnServer: false,
  methods: {
    ...mapActions(['getWallpaper']),
    hideLoading() {
      this.isLoading = false
    },
    onWallpaperSelected(items) {
      let tmp = JSON.parse(JSON.stringify(items))
      this.groupItemWallpaperModels.push(...tmp)
    },
    beforeRouteLeave(to, from, next) {
      if (this.isEditing) {
        if (!window.confirm(this.$t('dashboard.client.editor.leaveTips'))) {
          return
        }
      }
      next()
    },
    addItem() {
      this.showSelector = true
      this.$refs.wallpaperSelectorModal.loadData()
    },
    onDeleteWPClick(wallpaper) {
      this.groupItemWallpaperModels.splice(
        this.groupItemWallpaperModels.indexOf(wallpaper),
        1
      )
    },
    async initPage(path) {
      try {
        let wallpaper = null
        this.isLoading = true

        if (path) {
          wallpaper = await this.getWallpaper({ path })
          if (!wallpaper) {
            alert("Wallpaper doesn't exist")
          }
        }

        this.setUIData(wallpaper)

        if (wallpaper) {
          //编辑壁纸
          this.wallpaperDir = wallpaper.runningData.dir
          this.sourceData = {
            title: this.title,
            groupItemWallpaperModels: JSON.parse(
              JSON.stringify(this.groupItemWallpaperModels)
            ),
          }
        } else {
          //新建壁纸
          let res = await this.$local.getApiInstance().getDraftDir()
          console.log('draftDir', res.data)
          this.wallpaperDir = res.data
        }
      } catch (error) {
        this.$local.handleClientApiException(this, error)
      } finally {
        this.hideLoading()
      }
    },
    setUIData(wallpaper) {
      let projectInfo = wallpaper ? wallpaper.info : {}
      this.title = projectInfo.title ?? null
      this.groupItemWallpaperModels = wallpaper
        ? wallpaper.info.groupItemWallpaperModels || []
        : []
    },
    onSaveClick() {
      this.isLoading = true
      var info = {
        title: this.title,
        type: 'group',
        groupItems: this.groupItemWallpaperModels.map((m) => m.info),
      }
      this.$local.getApiInstance()
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
  },
}
</script>
<style scoped>
.main {
  padding: 2rem 3rem;
  min-height: 600px;
}

.list-group {
  min-height: 40px;
}
.list-group-item {
  cursor: move;
}

/* .fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
} */

.card-bottom {
  position: absolute;
  left: 0;
  bottom: 0;
  right: 0;
  background: rgba(66, 66, 66, 0.671);
  margin-bottom: 0px;
  padding: 1rem 1.5rem;
}

/* .setting-container {
  padding: 1.5rem;
  width: 100%;

  position: relative;
  display: flex;
  flex-direction: column;
  border: 2px solid whitesmoke;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  border-bottom-left-radius: 4px;
  color: rgba(0, 0, 0, 0.7);
  background: #fff;
} */
</style>
