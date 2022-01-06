<template>
  <main>
    <b-navbar class="mt-3 mb-3 pr-5 pl-6">
      <template #start>
        <!-- <b-navbar-item
          v-for="item in categoryOptions"
          :key="item"
          tag="nuxt-link"
          :active="item === category"
          :to="getPageUrl({ category: item, pageNum: 1 })"
        >
          {{ $t(`common.${item}`) }}
        </b-navbar-item> -->
      </template>

      <template #end>
        <b-navbar-dropdown
          :label="$t(`common.${filterWpType}`)"
          hoverable
          v-model="filterWpType"
        >
          <b-navbar-item
            value="all"
            :active="filterWpType === 'all'"
            v-on:click="setFilterWpType('all')"
          >
            {{ $t('common.all') }}
          </b-navbar-item>
          <b-navbar-item
            v-on:click="setFilterWpType('group')"
            :active="filterWpType === 'group'"
          >
            {{ $t('common.group') }}
          </b-navbar-item>
          <b-navbar-item
            v-on:click="setFilterWpType('wallpaper')"
            :active="filterWpType === 'wallpaper'"
          >
            {{ $t('common.wallpaper') }}
          </b-navbar-item>
        </b-navbar-dropdown>
        <!-- <b-navbar-dropdown
          :label="wpType === 'all' ? $t('common.type') : $t(`common.${wpType}`)"
          hoverable
          v-model="wpType"
        >
          <b-navbar-item
            :active="wpType === 'all'"
            tag="nuxt-link"
            :to="getPageUrl({ wpType: 'all' })"
          >
            {{ $t('common.all') }}
          </b-navbar-item>
          <b-navbar-item
            :active="wpType === 'video'"
            tag="nuxt-link"
            :to="getPageUrl({ wpType: 'video' })"
          >
            {{ $t('common.video') }}
          </b-navbar-item>
          <b-navbar-item
            :active="wpType === 'image'"
            tag="nuxt-link"
            :to="getPageUrl({ wpType: 'image' })"
          >
            {{ $t('common.image') }}
          </b-navbar-item>
        </b-navbar-dropdown> -->
      </template>
    </b-navbar>

    <div class="main container is-fluid">
      <div class="columns is-multiline">
        <div
          class="column is-one-quarter"
          v-for="(item, index) in filteredWallpapers"
          :key="index"
          @mouseenter="hoverWp = item"
          @mouseleave="hoverWp = false"
        >
          <div class="card">
            <div
              v-bind:class="{
                'card-image': true,
                'card-image-group': item.info.type === 'group',
              }"
            >
              <figure
                v-if="item.info.type != 'group'"
                class="image is-4by3"
                v-on:click="onWPClick(item)"
              >
                <img
                  @error="replaceByDefault"
                  class="wp-cover"
                  v-bind:src="`${serverHost}assets/image/?localpath=${item.runningData.dir}//${item.info.preview}`"
                  v-bind:alt="item.info.title"
                />
              </figure>
              <figure
                v-else-if="item.info.type === 'group'"
                v-on:click="onWPClick(item)"
              >
                <div
                  class="columns is-gapless is-multiline is-mobile"
                  v-if="item.info.groupItems"
                >
                  <div
                    class="column is-half"
                    v-for="(
                      groupItem, index
                    ) in item.info.groupItemWallpaperModels.slice(0, 4)"
                    :key="index"
                  >
                    <figure class="image is-4by3">
                      <img
                        v-bind:src="`${serverHost}assets/image/?localpath=${groupItem.runningData.dir}//${groupItem.info.preview}`"
                        v-bind:alt="item.info.title"
                      />
                    </figure>
                  </div>
                </div>
              </figure>
              <transition
                name="fade"
                v-if="
                  setting.wallpaper.screenOptions &&
                  setting.wallpaper.screenOptions.length > 1
                "
              >
                <nav
                  class="card-top level"
                  v-if="hoverWp === item"
                  v-on:click="onWPClick(item)"
                >
                  <div class="level-left">
                    <b-tooltip
                      v-for="screenItem in setting.wallpaper.screenOptions"
                      :key="screenItem.screen"
                      :label="screenItem.remark || screenItem.screen"
                      class="level-item"
                      position="is-bottom"
                    >
                      <div
                        v-on:click.stop="
                          showWallpaper({
                            wallpaper: item,
                            handleClientApiException: handleClientApiException,
                            screen: screenItem.screen,
                          })
                        "
                      >
                        <b-icon type="is-white" icon="desktop" pack="fas">
                        </b-icon>
                      </div>
                    </b-tooltip>
                  </div>
                </nav>
              </transition>
              <transition name="fade">
                <nav class="card-bottom level" v-if="hoverWp === item">
                  <div class="level-left">
                    <b-tooltip
                      :label="$t('common.settings')"
                      class="level-item"
                      position="is-right"
                    >
                      <div v-on:click="onConfigWPClick(item)">
                        <b-icon type="is-white" icon="cog" pack="fas"> </b-icon>
                      </div>
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
                    <b-tooltip
                      :label="$t('common.edit')"
                      position="is-left"
                      class="level-item"
                    >
                      <div v-on:click="onEditWPClick(item)">
                        <b-icon pack="fas" icon="edit" type="is-white">
                        </b-icon>
                      </div>
                    </b-tooltip>
                    <b-tooltip
                      :label="$t('local.openFileDir')"
                      position="is-left"
                      class="level-item"
                    >
                      <div v-on:click="onOpenWPDirClick(item)">
                        <b-icon pack="fas" icon="folder-open" type="is-white">
                        </b-icon>
                      </div>
                    </b-tooltip>
                  </div>
                </nav>
              </transition>
              <b-loading
                v-model="item.isBusy"
                :is-full-page="false"
              ></b-loading>
            </div>
            <div class="card-content columns">
              <div class="column is-12 wptitle">
                {{ item.info.title }}
              </div>
            </div>
          </div>
        </div>
        <b-modal v-model="showOptionModal">
          <div class="setting-container" v-if="currentOptionWP">
            <section>
              <h2 class="title is-4">
                <template v-if="currentOptionWP.info.type === 'group'">
                  {{ $t('common.wallpaperGroup') }}
                </template>
                <template v-else-if="currentOptionWP.info.type === 'video'">
                  {{ $t('common.videoWP') }}
                </template>
                <template v-else-if="currentOptionWP.info.type === 'image'">
                  {{ $t('common.imageWP') }}
                </template>
              </h2>
              <div class="setting-container" v-if="currentOption">
                <template v-if="currentOptionWP.info.type === 'group'">
                  <b-field
                    :label="$t('dashboard.client.editor.switchingInterval')"
                  >
                    <b-timepicker
                      rounded
                      placeholder="HH:mm"
                      locale="de-DE"
                      v-model="switchingInterval"
                      :min-time="switchingIntervalMinTime"
                      icon="clock"
                      editable
                      :enable-seconds="false"
                      hour-format="24"
                    >
                    </b-timepicker>
                  </b-field>
                </template>
                <template v-else-if="currentOptionWP.info.type === 'video'">
                  <b-field
                    :label="
                      currentOption.hardwareDecoding
                        ? $t('common.wallpaperOptions.enableHwdec')
                        : $t('common.wallpaperOptions.disableHwdec')
                    "
                  >
                    <b-switch
                      v-if="currentOption"
                      :left-label="true"
                      v-model="currentOption.hardwareDecoding"
                    ></b-switch>
                  </b-field>
                  <b-field :label="$t('dashboard.client.setting.panScan')">
                    <b-switch
                      v-if="currentOption"
                      :left-label="true"
                      v-model="currentOption.isPanScan"
                    ></b-switch>
                  </b-field>
                  <b-field style="width: 251px" :label="$t('common.volume')">
                    <b-slider v-model="currentOption.volume"></b-slider>
                  </b-field>
                </template>
              </div>
              <b-loading
                v-model="isOptionBusy"
                :is-full-page="false"
              ></b-loading>
              <hr class="is-medium" />
            </section>
            <b-field>
              <p class="control">
                <button
                  v-on:click="onOptionSaveClick"
                  class="button is-primary"
                >
                  {{ $t('common.save') }}
                </button>
              </p>
            </b-field>
          </div>
        </b-modal>
      </div>
      <client-only>
        <Empty v-if="isWallpaperEmpty" pack="fas" icon="folder-open">
          {{ $t('local.noWallpapers') }}
        </Empty>
        <b-loading :closable="false" v-model="isBusy"></b-loading>
      </client-only>
    </div>
    <b-navbar
      id="bottomBar"
      class="is-spaced has-shadow"
      :fixed-bottom="stickBottomBar"
    >
      <template slot="brand">
        <b-navbar-item tag="div">
          <b-button
            tag="nuxt-link"
            :to="localePath(settingUrl || '/setting')"
            icon-pack="fas"
            icon-left="cog"
            type="is-primary is-light"
            >{{ $t('common.settings') }}
          </b-button>
          <b-dropdown
            v-model="setting.wallpaper.audioScreen"
            aria-role="list"
            position="is-top-right"
            style="margin-left: 0.5rem"
            @input="audioSelected"
            :disabled="!settingLoaded"
          >
            <template #trigger>
              <b-button
                type="is-primary is-light"
                icon-pack="fas"
                :icon-left="
                  setting.wallpaper.audioScreen == 'disabled'
                    ? 'volume-mute'
                    : 'volume-up'
                "
              />
            </template>
            <b-dropdown-item value="disabled" aria-role="listitem">
              <div class="media">
                <div class="media-content">
                  <h3>{{ $t('common.disable') }}</h3>
                </div>
              </div>
            </b-dropdown-item>

            <b-dropdown-item
              aria-role="listitem"
              v-for="item in setting.wallpaper.screenOptions"
              :key="item.screen"
              :value="item.screen"
            >
              <div class="media">
                <div class="media-content">
                  <h3>{{ item.remark || item.screen }}</h3>
                  <small> </small>
                </div>
              </div>
            </b-dropdown-item>
          </b-dropdown>
          <b-slider
            :title="currentAudioWP.info.title"
            v-if="
              currentAudioWP &&
              currentAudioWP.option &&
              setting.wallpaper.audioScreen != 'disabled'
            "
            style="width: 100px"
            class="ml-4 mr-3"
            v-on:change="currentAudioWPVolumeChanged"
            v-bind:value="currentAudioWP.option.volume"
          ></b-slider>
          <b-button
            style="margin-left: 0.5rem"
            v-if="isPlaying"
            icon-pack="fas"
            icon-left="ban"
            type="is-primary is-light"
            v-on:click="onStopPClick"
            >{{ $t('common.stop') }}
          </b-button>
        </b-navbar-item>
      </template>
      <template slot="end">
        <b-navbar-item tag="div">
          <div class="buttons">
            <b-button
              type="is-primary is-light"
              icon-pack="fas"
              icon-left="sync-alt"
              v-on:click="refresh({ handleClientApiException })"
              :loading="isBusy"
              >{{ $t('common.refresh') }}</b-button
            >
            <b-button
              tag="nuxt-link"
              :to="localePath({ name: editorRouterName })"
              icon-pack="fas"
              icon-left="file-image"
              type="is-primary is-light"
            >
              {{ $t('dashboard.menus.createWallpaper') }}
            </b-button>
            <b-button
              tag="nuxt-link"
              :to="localePath({ name: groupEditorRouterName })"
              icon-pack="fas"
              icon-left="layer-group"
              type="is-primary is-light"
            >
              {{ $t('dashboard.menus.createGroup') }}
            </b-button>
          </div>
        </b-navbar-item>
      </template>
    </b-navbar>
    <div id="bottomDiv"></div>
  </main>
</template>

<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState, mapGetters, mapActions, mapMutations } =
  createNamespacedHelpers('local')
export default {
  head() {
    return {
      title: this.$t('local.title'),
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: this.$t('local.meta.description'),
        },
        {
          hid: 'keywords',
          name: 'keywords',
          content: this.$t('common.meta.keywords'),
        },
        {
          hid: 'author',
          name: 'author',
          content: this.$t('common.studioName'),
        },
      ],
    }
  },
  props: {
    settingUrl: '',
    editorRouterName: {
      type: String,
      default: 'editor-id',
    },
    groupEditorRouterName: {
      type: String,
      default: 'group-id',
    },
  },
  data() {
    return {
      hoverWp: undefined,
      showSetupPlayerModal: false,
      showOptionModal: false,
      //当前编辑的参数
      currentOption: undefined,
      //当前编辑参数的壁纸
      currentOptionWP: undefined,
      //分组切换最小时间
      switchingIntervalMinTime: undefined,
      //分组切换间隔
      switchingInterval: undefined,
      isOptionBusy: false,
      stickBottomBar: true,
      setting: JSON.parse(JSON.stringify(this.$store.state.local.setting)),
      categoryOptions: ['all', 'wallpaper', 'group'],
      filterWpType: 'all',
      firstLoading: false,
    }
  },
  computed: {
    isBusy() {
      return this.isLoading || this.isLoadingSetting || this.firstLoading
    },
    isWallpaperEmpty() {
      const r =
        !this.isLoading &&
        !this.isLoadingSetting &&
        (!this.wallpapers || this.wallpapers.length == 0)
      return r
    },
    settingLoaded() {
      let r =
        this.setting &&
        this.setting.wallpaper.screenOptions &&
        this.setting.wallpaper.screenOptions.length > 0

      return r
    },
    filteredWallpapers() {
      switch (this.filterWpType) {
        case 'group':
          return this.wallpapers.filter((m) => m.info.type === 'group')
        case 'wallpaper':
          return this.wallpapers.filter((m) => m.info.type != 'group')
      }
      return this.wallpapers
    },
    ...mapState([
      'wallpapers',
      'isLoading',
      'isLoadingSetting',
      'isPlaying',
      'runningWallpapers',
      'currentAudioWP',
    ]),
    ...mapGetters(['serverHost']),
  },
  mounted: function () {
    const switchingIntervalMinTime = new Date()
    switchingIntervalMinTime.setHours(0)
    switchingIntervalMinTime.setMinutes(1)
    this.switchingIntervalMinTime = switchingIntervalMinTime
    window.addEventListener('scroll', this.handleScroll)
  },
  destroyed: function () {
    window.removeEventListener('scroll', this.handleScroll)
  },
  async fetch() {
    this.firstLoading = true
    try {
      if (!this.settingLoaded) {
        await this.loadSetting({
          handleClientApiException: () => {},
        })
        this.setting = JSON.parse(
          JSON.stringify(this.$store.state.local.setting)
        )
      }

      if (!this.$store.state.local.setting) return

      if (process.client) {
        this.filterWpType = localStorage.getItem('filterWpType') || 'all'
      }

      await this.refresh({
        handleClientApiException: this.handleClientApiException,
      })
    } catch (error) {
    } finally {
      this.firstLoading = false
    }
  },
  // call fetch only on client-side
  fetchOnServer: false,
  methods: {
    ...mapActions([
      'refresh',
      'setWallpaperOption',
      'loadWallpaperOption',
      'loadSetting',
      'saveSetting',
      'showWallpaper',
      'closeWallpaper',
      'deleteWallpaper',
      'exploreWallpaper',
      'updateCurrentAudioWP',
    ]),
    replaceByDefault(e) {
      e.target.src = `${this.serverHost}default-fallback-image.webp`
    },
    setFilterWpType(type) {
      this.filterWpType = type
      localStorage.setItem('filterWpType', type)
    },
    async currentAudioWPVolumeChanged(e) {
      let wallpaper = this.currentAudioWP
      if (!wallpaper) return
      let option = JSON.parse(JSON.stringify(wallpaper.option))
      option.volume = e
      await this.setWallpaperOption({
        wallpaper,
        option,
        handleClientApiException: this.handleClientApiException,
      })
    },
    handleClientApiException(error) {
      this.$local.handleClientApiException(this, error)
    },
    async audioSelected(e) {
      console.log(e)
      let r = await this.saveSetting({
        setting: this.setting,
        handleClientApiException: this.handleClientApiException,
      })
      this.updateCurrentAudioWP()
      //创建新副本
      this.setting = JSON.parse(JSON.stringify(this.setting))
    },
    handleScroll(event) {
      let bottomBarHeight = this.$el.querySelector('#bottomBar').clientHeight
      var bottomDiv = this.$el.querySelector('#bottomDiv')
      let bottomDivRect = bottomDiv.getBoundingClientRect()
      let tmpTop =
        bottomDivRect.top + (this.stickBottomBar ? bottomBarHeight : 0)
      this.stickBottomBar =
        tmpTop >=
          (window.innerHeight || document.documentElement.clientHeight) ||
        bottomDivRect.bottom <= 0
    },
    onWPClick(wallpaper) {
      this.onShowWallpaper(wallpaper)
    },
    onShowWallpaper(wallpaper, screen) {
      this.showWallpaper({
        wallpaper,
        screen,
        handleClientApiException: this.handleClientApiException,
        toast: this.$buefy.toast,
      })
    },
    async onEditWPClick(wallpaper) {
      let url = this.localePath({
        name:
          wallpaper.info.type === 'group'
            ? this.groupEditorRouterName
            : this.editorRouterName,
        params: {
          id: wallpaper.info.localID,
        },
      })
      console.log('edit', url)
      this.$router.push(url)
    },
    async onOpenWPDirClick(wallpaper) {
      await this.exploreWallpaper({
        wallpaper,
        handleClientApiException: this.handleClientApiException,
      })
    },
    async onDeleteWPClick(wallpaper) {
      this.$buefy.dialog.confirm({
        title: this.$t('local.deletingWallpaper'),
        message: this.$t('local.deletingWallpaperConfirmMessage', {
          delete: this.$t('common.delete').toLowerCase(),
          name: wallpaper.info.title,
        }),
        confirmText: this.$t('common.delete'),
        cancelText: this.$t('common.cancel'),
        type: 'is-danger',
        hasIcon: true,
        onConfirm: async () => {
          await this.deleteWallpaper({
            wallpaper,
            handleClientApiException: this.handleClientApiException,
            toast: this.$buefy.toast,
          })
        },
      })
    },
    async onConfigWPClick(wallpaper) {
      this.showOptionModal = true
      this.currentOptionWP = wallpaper
      this.isOptionBusy = true
      try {
        await this.loadWallpaperOption({
          wallpaper,
        })

        //特殊处理，读取切换间隔数据，转换为date对象
        const switchingInterval = new Date()
        switchingInterval.setHours(0)
        switchingInterval.setMinutes(10)

        if (wallpaper && wallpaper.option.switchingInterval) {
          let { hours, minutes } = this.GetTimeSpan(
            wallpaper.option.switchingInterval
          )
          switchingInterval.setHours(hours)
          switchingInterval.setMinutes(minutes)
        }
        this.switchingInterval = switchingInterval
      } catch (error) {
        this.handleClientApiException(error)
      }

      this.currentOption = Object.assign({}, wallpaper.option)
      this.isOptionBusy = false
    },
    GetTimeSpan(timespan) {
      let hours = 0
      let minutes = 0
      if (timespan) {
        let array = timespan.split(':')
        if (array) {
          if (array.length > 0) hours = Number(array[0])
          if (array.length > 1) minutes = Number(array[1])
        }
      }

      return { hours, minutes }
    },
    async onStopPClick() {
      await this.closeWallpaper({
        handleClientApiException: this.handleClientApiException,
      })
    },
    async onOptionSaveClick() {
      this.isOptionBusy = true
      try {
        if (
          !this.switchingInterval &&
          this.currentOptionWP.info.type === 'group'
        ) {
          this.switchingInterval = this.switchingIntervalMinTime
        }
        let switchingIntervalString = `${this.switchingInterval.getHours()}:${this.switchingInterval.getMinutes()}:00`
        this.currentOption.switchingIntervalString = switchingIntervalString
        await this.setWallpaperOption({
          wallpaper: this.currentOptionWP,
          option: this.currentOption,
          handleClientApiException: this.handleClientApiException,
        })
      } catch (error) {
        this.handleClientApiException(error)
      }
      this.isOptionBusy = false
      this.showOptionModal = false
    },
  },
}
</script>
<style scoped>
.wptitle {
  word-break: break-all;
}
.main {
  padding: 2px 3rem 2rem 3rem;
  min-height: 600px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.card-bottom {
  position: absolute;
  left: 0;
  bottom: 0;
  right: 0;
  background: rgba(66, 66, 66, 0.671);
  margin-bottom: 0px;
  padding: 1rem 1.5rem;
}

.card-top {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  /* background: rgba(66, 66, 66, 0.671); */
  margin-bottom: 0px;
  padding: 1rem 1.5rem;
}

.setting-container {
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
}

.card-image-group {
  min-height: 120px;
  border-top-left-radius: 0.25rem;
  border-top-right-radius: 0.25rem;
  overflow: hidden;
}

.card-image-group:first-child img {
  border-top-left-radius: 0rem;
  border-top-right-radius: 0rem;
}
</style>
