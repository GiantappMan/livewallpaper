<template>
  <b-modal v-model="innerShow" scroll="keep">
    <header class="modal-card-head">
      <p class="modal-card-title">{{ $t('local.title') }}</p>
    </header>

    <div class="container is-fluid card py-5">
      <div class="main columns is-multiline wp-content">
        <div
          class="column is-one-quarter mt-2"
          v-for="(item, index) in items"
          :key="index"
          @mouseenter="hoverWp = item"
          @mouseleave="hoverWp = false"
        >
          <div
            class="card mb-2 px-1 pt-1"
            v-bind:class="{
              'item-hovering': hoverWp == item,
              'item-selected': item.selected,
            }"
            v-on:click="onWPClick(item)"
          >
            <div class="card-image">
              <figure class="image is-4by3">
                <img
                  class="wp-cover"
                  v-bind:src="`${serverHost}assets/image/?localpath=${item.runningData.dir}//${item.info.preview}`"
                  v-bind:alt="item.info.title"
                />
              </figure>
            </div>
            <div class="card-content columns">
              <div class="column is-12">
                {{ item.info.title }}
              </div>
            </div>
          </div>

          <client-only>
            <Empty v-if="isWallpaperEmpty" pack="fas" icon="folder-open">
              {{ $t('local.noWallpapers') }}
            </Empty>
          </client-only>
        </div>
      </div>

      <client-only>
        <b-loading :closable="false" v-model="isLoading"></b-loading>
      </client-only>

      <footer class="modal-card-foot">
        <b-checkbox @input="onCheckAll">全选</b-checkbox>
        <b-button :label="$t('common.cancel')" @click="innerShow = false" />
        <b-button :label="$t('common.ok')" @click="onOK" type="is-primary" />
      </footer>
    </div>
  </b-modal>
</template>
<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState, mapGetters, mapActions, mapMutations } =
  createNamespacedHelpers('local')

export default {
  data() {
    return {
      hoverWp: undefined,
      innerShow: this.show,
      items: [],
    }
  },
  props: ['show'],
  computed: {
    isWallpaperEmpty() {
      const r =
        !this.isLoading && (!this.wallpapers || this.wallpapers.length == 0)
      return r
    },
    ...mapState(['wallpapers', 'isLoading', 'isPlaying']),
    ...mapGetters(['serverHost']),
  },
  watch: {
    innerShow: function (newVal, oldVal) {
      this.$emit('update:show', newVal)
    },
    show: function (newVal, oldVal) {
      this.innerShow = newVal
    },
  },
  methods: {
    ...mapActions(['refresh']),
    handleClientApiException(error) {
      this.$local.handleClientApiException(this, error)
    },
    onWPClick(wallpaper) {
      wallpaper.selected = !wallpaper.selected
    },
    async loadData() {
      await this.refresh({
        handleClientApiException: this.handleClientApiException,
      })

      if (this.wallpapers) {
        this.items = this.wallpapers
          .filter((m) => m.info.type != 'group')
          .map((m) =>
            Object.assign(
              {
                selected: false,
              },
              //deep clone
              JSON.parse(JSON.stringify(m))
            )
          )
      } else {
        this.items = []
      }
    },
    onCheckAll(e) {
      this.items.forEach((m) => (m.selected = e))
    },
    onOK() {
      this.innerShow = false
      let selectedItems = this.items.filter((m) => m.selected === true)
      console.log(selectedItems)
      this.$emit('selected', selectedItems)
    },
  },
}
</script>
<style scoped>
.item-hovering {
  box-shadow: inset 0 0 0px 2px #ff9970;
}

.item-selected {
  box-shadow: inset 0 0 0px 2px green;
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

.card-bottom {
  position: absolute;
  left: 0;
  bottom: 0;
  right: 0;
  background: rgba(66, 66, 66, 0.671);
  margin-bottom: 0px;
  padding: 1rem 1.5rem;
}

.wp-content {
  max-height: 60vh;
  overflow-y: scroll;
}
</style>
