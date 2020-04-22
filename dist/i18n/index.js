import Vue from 'vue';
import VueI18n from 'vue-i18n';
import zh_cn from "./zh_cn";
import en from "./en";
Vue.use(VueI18n);
export var i18n = new VueI18n({
  locale: 'zh_cn',
  // 设置地区
  messages: {
    zh_cn: zh_cn,
    en: en
  } // 设置地区信息

});
export { zh_cn, en };