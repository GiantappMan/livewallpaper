<template>
  <div class="container main">
    <client-only>
      <section>
        <h2 class="title is-4">
          <router-link to="#api-view">#</router-link>
          {{ $t('dashboard.client.setting.general') }}
        </h2>
        <div class="setting-container">
          <b-field :label="$t('dashboard.client.setting.startWithSystem')">
            <b-switch
              :left-label="true"
              v-model="setting.general.startWithSystem"
            ></b-switch>
          </b-field>
          <b-field>
            <template #label>
              <b-icon pack="fas" icon="globe"></b-icon>
              {{ $t('common.multiLanguage') }}
            </template>
            <!-- 多语言修改立即保存 -->
            <b-select
              placeholder=""
              v-model="setting.general.currentLan"
              v-on:input="onSaveClick"
            >
              <option
                v-for="locale in availableLocales"
                :key="locale.code"
                :value="locale.code"
              >
                {{ locale.name }}
              </option>
            </b-select>
          </b-field>
          <b-field :label="$t('dashboard.client.setting.wallpaperSaveDir')">
            <b-input
              v-model="setting.wallpaper.wallpaperSaveDir"
              :placeholder="$t('dashboard.client.setting.wallpaperSaveDirTips')"
              icon-pack="fas"
              icon-right="folder-open"
              icon-right-clickable
              @icon-right-click="
                explore({
                  path: setting.wallpaper.wallpaperSaveDir,
                  handleClientApiException,
                })
              "
            ></b-input>
          </b-field>
          <b-field :label="$t('dashboard.client.setting.configDir')">
            <b-input
              readonly
              v-model="setting.general.configDir"
              icon-pack="fas"
              icon-right="folder-open"
              icon-right-clickable
              @icon-right-click="
                explore({
                  path: setting.general.configDir,
                  handleClientApiException,
                })
              "
            ></b-input>
          </b-field>

          <b-field :label="$t('dashboard.client.setting.windowSize')">
            <b-input
              type="number"
              v-model="setting.general.windowHeight"
              :placeholder="$t('dashboard.client.setting.windowSizeHeightTips')"
            ></b-input>
            <b-input
              type="number"
              v-model="setting.general.windowWidth"
              :placeholder="$t('dashboard.client.setting.windowSizeWidthTips')"
            ></b-input>
            <b-button @click="reset">{{ $t('common.reset') }}</b-button>
          </b-field>
        </div>
        <hr class="is-medium" />
      </section>
      <section>
        <h2 class="title is-4">
          <router-link to="#api-view">#</router-link>
          {{ $t('common.wallpaper') }}
        </h2>
        <div class="setting-container">
          <b-field
            :label="$t('dashboard.client.setting.appMaximizedEffectAllScreen')"
          >
            <b-switch
              v-model="setting.wallpaper.appMaximizedEffectAllScreen"
              :left-label="true"
            ></b-switch>
          </b-field>
          <!-- <b-field :label="$t('dashboard.client.setting.forwardMouseEvent')">
            <b-switch
              v-model="setting.wallpaper.forwardMouseEvent"
              :left-label="true"
            ></b-switch>
          </b-field> -->
        </div>
        <hr class="is-medium" />
      </section>

      <draggable
        class="list-group"
        v-model="setting.wallpaper.screenOptions"
        @start="drag = true"
        v-bind="dragOptions"
        @end="drag = false"
      >
        <section
          v-for="item in setting.wallpaper.screenOptions"
          :key="item.screen"
          :value="item.screen"
        >
          <h2 class="title is-4" style="cursor: move">
            <router-link to="#api-view">#</router-link>
            {{
              $t('dashboard.client.setting.screenParameter', {
                screenName: item.screen,
              })
            }}
          </h2>
          <div class="setting-container">
            <b-field :label="$t('dashboard.client.setting.remark')">
              <b-input
                v-model="item.remark"
                :placeholder="$t('dashboard.client.setting.remarkTips')"
              ></b-input>
            </b-field>
            <b-field :label="$t('dashboard.client.setting.whenAppMaximized')">
              <b-select placeholder="" v-model="item.whenAppMaximized">
                <option :value="0">
                  {{ $t('common.pause') }}
                </option>
                <option :value="1">{{ $t('common.stop') }}</option>
                <option :value="2">
                  {{ $t('common.play') }}
                </option>
              </b-select>
            </b-field>
            <!-- <b-field :label="$t('dashboard.client.setting.panScan')">
              <b-switch v-model="item.panScan" :left-label="true"></b-switch>
            </b-field> -->
          </div>
          <hr class="is-medium" />
        </section>
      </draggable>
      <b-loading :closable="false" v-model="isLoadingSetting"></b-loading>
    </client-only>
    <b-field>
      <p class="control">
        <button v-on:click="onSaveClick" class="button is-primary">
          {{ $t('common.save') }}
        </button>
      </p>
    </b-field>
  </div>
</template>

<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState, mapActions, mapMutations } = createNamespacedHelpers('local')
import draggable from 'vuedraggable'

export default {
  layout: 'dashboard',
  components: {
    draggable,
  },
  data() {
    return {
      drag: false,
      //深拷贝，Object.assign只拷贝第一层
      setting: JSON.parse(JSON.stringify(this.$store.state.local.setting)),
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
    availableLocales() {
      return this.$i18n.locales
    },
    currentLocale() {
      let currentLan = this.data.setting.general.currentLan
      if (currentLan) {
        let exist = this.$i18n.locales.find((i) => i.code === currentLan)
        if (exist) return exist
      }
      return this.$i18n.locales.find((i) => i.code === this.$i18n.locale)
    },
    ...mapState(['isLoadingSetting']),
  },
  async fetch() {
    this.loadData()
  },
  // call fetch only on client-side
  fetchOnServer: false,
  methods: {
    ...mapActions(['loadSetting', 'saveSetting', 'explore']),
    reset() {
      this.setting.general.windowWidth = null
      this.setting.general.windowHeight = null
    },
    handleClientApiException(error) {
      this.$local.handleClientApiException(this, error)
    },
    async loadData() {
      await this.loadSetting({
        handleClientApiException: this.handleClientApiException,
      })
      this.setting = JSON.parse(JSON.stringify(this.$store.state.local.setting))
    },
    async onSaveClick() {
      let r = await this.saveSetting({
        setting: this.setting,
        handleClientApiException: this.handleClientApiException,
      })

      if (!r) return

      this.$buefy.toast.open({
        message: r.ok
          ? this.$t('dashboard.client.setting.savedSuccessfully')
          : this.$t('dashboard.client.setting.saveFailed'),
        type: r.ok ? 'is-success' : 'is-warning',
      })

      //重新读取配置
      await this.loadData()
      if (this.setting.general.currentLan) {
        this.$router.push(
          this.switchLocalePath(this.setting.general.currentLan)
        )
      }
    },
  },
}
</script>

<style scoped>
.main {
  padding: 2rem 3rem;
  min-height: 600px;
}
</style>
