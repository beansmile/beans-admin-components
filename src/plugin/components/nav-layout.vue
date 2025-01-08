<template>
  <div class="admin-nav-layout">
    <el-drawer
      :visible.sync="drawerMenuOpen"
      direction="rtl"
      modal-append-to-body
      size="230px"
      custom-class="admin-nav-layout-menu-drawer"
      :with-header="false"
    >
      <div class="menu-drawer-top">
        <slot />
        <slot name="header-content" />
      </div>
      <div class="menu-drawer-menu">
        <NavMenu disableCollapse :menus="menus" v-bind="$attrs" @select="drawerMenuOpen = false" />
      </div>
      <div class="menu-drawer-footer" v-if="showLogout">
        <el-button @click="$emit('logout')">{{ $t('bean.actionLogout') }}</el-button>
      </div>
    </el-drawer>

    <el-container>
      <el-aside class="nav-layout-aside hidden-sm-and-down" width="auto">
        <div class="nav-layout-aside-box-logo" v-if="!collapsed">
          <router-link to="/">
            <img :src="logoUrl" class="logo" v-if="logoUrl" />
            <slot name="logo" />
          </router-link>
        </div>
        <div class="nav-layout-aside-box-menu">
          <NavMenu :menus="menus" v-model="collapsed" v-bind="$attrs" />
        </div>
      </el-aside>
      <el-container>
        <el-header height="40px" class="nav-layout-header-sm hidden-md-and-up">
          <i v-if="showBack" class="el-icon-arrow-left btn-back" @click="$emit('back')"></i>
          <span v-else></span>
          <div class="nav-layout-header-title text-overflow">
            <slot name="header-title" />
          </div>
          <i class="el-icon-more-outline btn-menu" @click="drawerMenuOpen = !drawerMenuOpen"></i>
        </el-header>

        <el-header class="nav-layout-header hidden-sm-and-down">
          <el-button
            v-if="showBack"
            class="nav-layout-header-btn-back"
            type="text"
            icon="el-icon-back"
            @click="$emit('back')"
          >
          {{ $t('bean.actionNavBack') }}
          </el-button>
          <div class="nav-layout-header-title">
            <slot name="header-title" />
          </div>
          <slot />
          <div class="nav-layout-header-content">
            <slot name="header-content" />
          </div>
          <el-button v-if="showLogout" @click="$emit('logout')">{{ $t('bean.actionLogout') }}</el-button>
        </el-header>
        <el-main class="nav-layout-main">
          <router-view :key="routerViewKey" />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script>
  import { Vue, Component, Prop } from 'vue-property-decorator';
  import NavMenu from './nav-menu';
  import qs from 'qs';

  @Component({
    components: {
      NavMenu
    }
  })
  export default class NavLayout extends Vue {
    @Prop({ type: Array, default: () => ([]) }) menus;
    @Prop({ type: Boolean }) showBack;
    @Prop({ type: String }) logoUrl;
    @Prop({ type: Boolean }) initCollapsed;
    @Prop(Boolean) showLogout;

    drawerMenuOpen = false;
    collapsed = false;

    created() {
      this.collapsed = this.initCollapsed;
    }

    get routerViewKey() {
      const { path, query } = this.$route;
      const routerViewFullPathKey = _.get(this, '$vadminConfig.layout.routerViewFullPathKey');
      if (routerViewFullPathKey) {
        return `${path}?${qs.stringify(query)}`;
      }
      return path;
    }
  }
</script>
