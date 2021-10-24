<template>
  <div>
    <Header :stick="false" />
    <div class="container is-fullhd template-horizontal">
      <aside class="sidebar">
        <DashboardMenu :groups="groups" />
      </aside>
      <Nuxt class="content-main" />
    </div>
    <Footer />
  </div>
</template>

<script>
export default {
  data() {
    return {
      groups: [
        {
          label: 'dashboard.menus.content',
          menus: [
            {
              icon: 'list-alt',
              label: 'dashboard.menus.wallpapers',
              href: 'dashboard/wallpapers',
            },
            {
              icon: 'upload',
              label: 'dashboard.menus.upload',
              href: 'dashboard/wallpapers/editor',
            },
          ],
        },
        {
          label: 'dashboard.menus.account',
          menus: [
            {
              icon: 'user',
              label: 'dashboard.menus.profile',
              href: 'dashboard/account/profile',
            },
            {
              icon: 'key',
              label: 'dashboard.menus.setpwd',
              href: 'dashboard/account/setpwd',
            },
          ],
        },
        {
          label: 'dashboard.menus.client',
          menus: [
            {
              icon: 'cog',
              label: 'dashboard.menus.localSettings',
              to: '/setting',
            },
            {
              icon: 'file-image',
              label: 'dashboard.menus.createWallpaper',
              to: '/editor',
            },
            {
              icon: 'layer-group',
              label: 'dashboard.menus.createGroup',
              to: '/group',
            },
            {
              icon: 'exclamation-circle',
              label: 'common.about',
              to: '/about',
            },
          ],
        },
      ],
    }
  },
}
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 16rem;
  padding: 3rem 1rem;
  background: #f5f5f5;
}
.template-horizontal {
  position: relative;
  display: flex;
  flex-direction: row;
  flex: 1;
  margin: 0px;
}
.content-main {
  position: relative;
  background: #fff;
  overflow: hidden;
  width: 100%;
  padding: 3rem;
  padding-bottom: 5rem;
}
</style>
