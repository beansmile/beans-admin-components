export default {
  componentPrefix: 'admin',
  globalConfigKey: 'adminConfig',
  ckeditor: {
    editorConfig: new Function,
    contentsCss: [],
  },
  upload: {
    directUploadURL: '/blobs/direct_upload',
    resourceBlobURL: '',
    resourceBlobTagURL: ''
  },
  request: {
    baseURL: '/admin_api/v1',
    timeout: 30000
  },
  i18n: {
    localeStorageKey: 'locale',
    locales: {
      zh: '简体中文',
      en: 'English'
    }
  },
  sourcePage: {
    form: {
      multiLocale: false,
      defaultLocaleRequired: false,
      allLocaleRequired: false
    },
    show: {
      multiLocale: false
    }
  }
};
