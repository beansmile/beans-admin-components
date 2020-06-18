// TODO 重构下面的组件，有些数据同步方式不太对

export default [
  {
    title: '图片',
    icon: 'el-icon-picture-outline',
    name: 'custom-image',
    component: require('./image').default
  },
  {
    title: '视频',
    name: 'custom-video',
    icon: 'el-icon-video-camera',
    component: require('./video').default
  },
  {
    title: '轮播图',
    name: 'custom-swiper',
    icon: 'el-icon-c-scale-to-original',
    component: require('./swiper').default
  },
  {
    title: '横向滚动',
    name: 'custom-scroll-x',
    icon: 'el-icon-s-fold',
    component: require('./scroll-x').default
  },
  {
    title: '客服',
    name: 'custom-contact-service',
    icon: 'el-icon-phone-outline',
    component: require('./contact-service').default
  },
  {
    title: '商品列表',
    name: 'custom-product-list',
    icon: 'el-icon-goods',
    component: require('./product-list').default
  },
  {
    title: '占位块',
    name: 'custom-block',
    icon: 'el-icon-files',
    component: require('./block').default
  },
  {
    title: '文本',
    name: 'custom-text',
    icon: 'el-icon-edit-outline',
    component: require('./text').default
  },
  {
    title: '通知栏',
    name: 'custom-notice-bar',
    icon: 'el-icon-warning-outline',
    component: require('./notice-bar').default
  },
];
