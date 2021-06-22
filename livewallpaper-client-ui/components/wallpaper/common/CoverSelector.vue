<template>
  <div class="selector">
    <div class="selector-deg"></div>
    <div class="selector-items" v-if="!isloading">
      <template v-if="coverUrls.length > 0">
        <div
          v-for="(item, index) in coverUrls"
          :key="item"
          class="selector-item"
          v-on:click="clickItem(item, index)"
          v-bind:class="{ 'selector-item-selected': selectedItem === item }"
          v-bind:style="{
            'background-image':
              'url(' +
              `${$local.api.serverHost}assets/image/?localpath=${item}` +
              ')',
          }"
        >
          {{ index }}
          <img
            v-if="selectedItem === item"
            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAwCAYAAAB9sggoAAAAAXNSR0IArs4c6QAAA19JREFUWAnNmM1rE0EUwN9s0tiWBi0oxIIfKNV4kCpi1YMe1Eu95dKD6D8giODVgxXtzYOi1Yseqg1CQL1qD4IeRYQKponSCO2xYoUUmq/d9b1dN9lkN5ud2dkkD5adnZ1977fvvX07Mwx6IZm1IahunQRNPQI6HAbQ8WB7sB0HhgfocdY1rnR+EjRtCjT9PBo/jRAxL9vhgr1a3g9VdgU9cBV0/ZAXSOu9cMDmfx4HVruFXkkhlNJq1M+1XLD0j2Og1mYR6JIf415j5IBlVrZDqXIXDV3DkEW8DPq9FxxsIZsCFZ6gwYRfo37GiYNl9BiUcvfRQ9f9GOIdIwaWLuyDWvk1JvYJXoN+x/ODLSwfxdC9Q6gxv0ZExvF9yi/zZ0HVP4UNRS8S9f02BKVr73H8kO9nAgz0F0ojfOQp2BHAFtejnUNJiW7kVPeg6A28wagkmF9fqInu5kpvMKpTIZYENyCrr32OmRX9jTWw22d3MPr3bZVzCCP1N8Pzcu6hNH/IPYOiF3B6zJi6qF9kzRJ4vGQf6yyw5nxKytTFboi33ewxmnlC9SuvkjDGN+cYTYe7JDeSo7A+PQ6F1EG4kBh2WG14zFg4QAFzq9HnGC6nY2ZiJ9ye2FVX9qtYgQNvV+rX1Gh4jFYzPYAiiPhAA4OuSWw9uMQKWVo9ZZm79+231ayfTTBajHKu++oafDbaQd1ZWoeHuQ2HFhOMVsghihfUzJLTW4TyHwyX7SGJCBShMKANjlLxb6e9BBFuUSiypUBpE/PLe4PDDeri7mGjBlEtoprUKkGgSFcUfZZEMG55fmYM9o4MGM89mEzA6LYIWPkSFIqURhEK96b4JRZprsP2gmlvW5rp67PArT6vM/7EadOMX2ax9jw61TwzcgMizbxQ9Ax+lbiTJyCP8xuGwU6PikCRTgVDiVuLYkKhIcPtRBSK9CmY/MJgpKAdXBAoEww3YqkRRAhuLvcHVE03DmrzJLqbbQYvsmWROuamTGYfJX9RpkJZuij5+w+MwSYlf/+BAaxiKPU1We6Xp0dZpBzLy1MoQxPTIBp5RqHsLzAGT+Hy+HdKftqj6A9h7AMMJm8SjAKDI5/Ra5XekmH4GJtDqCmYZgaLOXeZz35EsHNdhcOSgPZW0TeLlFMUPrv9f7vzJ3SudQKgAAAAAElFTkSuQmCC"
            alt="select_ai_img"
            class="select_ai_img"
          />
        </div>
      </template>
      <b-message v-else-if="noFFMPEG" type="is-warning">
        <div class="columns is-vcentered">
          {{ $t('common.needFFmpeg') }}
          <b-button type="is-text" v-on:click="showSetupModal">
            {{ $t('common.clickToInstall') }}
          </b-button>
          <b-button type="is-text" v-on:click="regenerate">
            {{ $t('common.regenerate') }}
          </b-button>
        </div>
      </b-message>
      <div v-else-if="errorMessage">
        <b-message type="is-danger">
          {{ errorMessage }}
        </b-message>
      </div>
    </div>
    <b-loading v-model="isloading" :is-full-page="false">
      <b-icon pack="fas" icon="sync-alt" size="is-large" custom-class="fa-spin">
      </b-icon
      >{{ $t('common.generatingCover') }}
    </b-loading>

    <SetupFFmpegModal ref="setupModal" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      selectedItem: null,
      isloading: false,
      coverUrls: [],
      noFFMPEG: false,
      errorMessage: undefined,
    }
  },

  props: ['videoPath'],

  watch: {
    videoPath: function (newFile, oldFile) {
      this.loadCovers()
    },
  },

  mounted() {
    this.loadCovers()
  },

  methods: {
    regenerate() {
      this.loadCovers()
    },
    loadCovers() {
      if (this.isloading || !this.videoPath) {
        return
      }
      this.isloading = true
      this.$local.api
        .getThumbnails(this.videoPath)
        .then((r) => {
          if (r.ok) {
            this.coverUrls = r.data
            this.selectedItem = this.coverUrls[0]
            this.$emit('loadCompeted', this.coverUrls)
          } else {
            if (r.errorString === 'NoFFmpeg') {
              this.noFFMPEG = true
            } else {
              this.errorMessage = r.message
            }
          }
        })
        .catch((error) => this.$local.handleClientApiException(this, error))
        .finally(() => {
          this.isloading = false
        })
    },
    clickItem(item, index) {
      this.selectedItem = item
      this.$emit('selected', item)
    },
    showSetupModal() {
      this.$refs.setupModal.showModal()
    },
  },
}
</script>
<style scoped>
.fa-spin {
  animation: fa-spin 2s infinite linear;
}
.selector {
  height: 100%;
  widows: 100%;
  border: 1px solid #ccd0d7;
  border-radius: 4px;
  padding: 11px 10px;
  flex: 1;
  position: relative;
  box-sizing: border-box;
}

.selector-deg {
  position: absolute;
  background-color: #fff;
  width: 15px;
  height: 15px;
  top: 55px;
  left: -8px;
  border-left: 1px solid #ccd0d7;
  border-bottom: 1px solid #ccd0d7;
  transform: rotate(45deg);
  z-index: 10;
}

.selector-items {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  box-sizing: border-box;
}

.selector-item {
  font-size: 0;
  text-rendering: optimizelegibility;
  -webkit-font-smoothing: antialiased;
  margin-top: 12px;
  width: 120px;
  height: 75px;
  border-radius: 4px;
  line-height: 75px;
  text-align: center;
  position: relative;
  overflow: hidden;
  display: flex;
  -webkit-box-align: center;
  align-items: center;
  -webkit-box-pack: center;
  justify-content: center;
  border: 3px solid #dbdbdb;
  box-sizing: border-box;
  background: url('//boss.hdslb.com/vc/m201222ko2n360cvjpd2ekoc4b045jrg_0003.jpg')
    center center / contain no-repeat rgb(219, 219, 219);
}
.selector-item-selected {
  font-size: 0;
  text-rendering: optimizelegibility;
  -webkit-font-smoothing: antialiased;
  margin-top: 12px;
  width: 120px;
  height: 75px;
  border-radius: 4px;
  line-height: 75px;
  text-align: center;
  position: relative;
  overflow: hidden;
  display: flex;
  -webkit-box-align: center;
  align-items: center;
  -webkit-box-pack: center;
  justify-content: center;
  border: 3px solid #04a1d6;
  box-sizing: border-box;
  background: url('//boss.hdslb.com/vc/m201222ko2n360cvjpd2ekoc4b045jrg_0002.jpg')
    center center / contain no-repeat rgb(219, 219, 219);
}

.select_ai_img {
  display: block;
  position: absolute;
  width: 19px;
  height: 24px;
  bottom: 0;
  right: 0;
  cursor: pointer;
  z-index: 20;
}
</style>
