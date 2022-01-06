<template>
  <footer class="footer">
    <div class="container">
      <div class="content">
        <div class="columns">
          <div class="column">
            <p>
              <a
                class="navbar-item"
                href="https://www.giantapp.cn"
                target="_blank"
              >
                {{
                  $t('common.copyright', { studio: $t('common.studioName') })
                }}
              </a>
            </p>
            <b-field>
              <p class="control">
                <a
                  class="button"
                  href="https://github.com/giant-app"
                  target="_blank"
                >
                  <b-icon pack="fab" icon="github" />
                  <span>GitHub</span>
                </a>
              </p>
            </b-field>
            <small class="navbar-item">{{ $t('common.poweredBy') }} </small>
            <small>
              <a class="navbar-item" href="mailto:mscoder@hotmail.com">
                {{ $t('common.disclaimer') }}
              </a>
            </small>
            <p v-if="beian">
              <small>
                <a
                  class="navbar-item"
                  v-if="$i18n.locale == 'zh'"
                  href="https://beian.miit.gov.cn/"
                  target="_blank"
                >
                  ICP证：蜀ICP备19028275号-1
                </a>
              </small>
            </p>
          </div>

          <div class="column">
            <nuxt-link
              :to="localePath('/')"
              class="navbar-item has-text-weight-semibold"
            >
              {{ $t('common.home') }}
            </nuxt-link>

            <b-dropdown position="is-top-left" style="z-index: 30">
              <button
                class="button is-light"
                slot="trigger"
                slot-scope="{ active }"
              >
                <b-icon pack="fas" icon="globe"></b-icon>
                <span> {{ currentLocale.name }}</span>
                <b-icon
                  pack="fas"
                  :icon="!active ? 'caret-up' : 'caret-down'"
                ></b-icon>
              </button>
              <b-dropdown-item has-link aria-role="menuitem">
                <a
                  class="navbar-item"
                  href="https://github.com/giant-app/livewallpaper_i18n"
                  target="_blank"
                >
                  {{ $t('common.lanContribute') }}
                </a>
              </b-dropdown-item>

              <hr class="navbar-divider" />
              <b-dropdown-item
                has-link
                v-for="locale in availableLocales"
                :key="locale.code"
              >
                <nuxt-link :to="switchLocalePath(locale.code)">
                  {{ locale.name }}
                </nuxt-link>
              </b-dropdown-item>
            </b-dropdown>

            <small>
              <a
                target="_blank"
                href="https://giantapp.cn/post/other/contact"
                class="navbar-item"
              >
                {{ $t('common.contact') }}
              </a>
            </small>

            <small>
              <a
                target="_blank"
                href="https://support.qq.com/products/315103"
                class="navbar-item"
              >
                {{ $t('common.feedback') }}
              </a>
            </small>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
<script>
export default {
  props: ['copyright', 'github', 'beian'],
  computed: {
    availableLocales() {
      return this.$i18n.locales.filter((i) => i.code !== this.$i18n.locale)
    },
    currentLocale() {
      return this.$i18n.locales.find((i) => i.code === this.$i18n.locale)
    },
  },
  async mounted() {
    // const workbox = await window.$workbox
    // if (workbox) {
    //   workbox.addEventListener('installed', (event) => {
    //     // If we don't do this we'll be displaying the notification after the initial installation, which isn't perferred.
    //     if (event.isUpdate) {
    //       this.$buefy.toast.open({
    //         message: 'please refresh the page to update',
    //         indefinite: true,
    //         position: 'is-bottom',
    //         type: 'is-link',
    //         queue: false,
    //       })
    //       // whatever logic you want to use to notify the user that they need to refresh the page.
    //     }
    //   })
    // }
  },
}
</script>
<style scoped></style>
