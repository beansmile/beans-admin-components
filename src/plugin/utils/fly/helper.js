import Vue from 'vue'
import _ from 'lodash'
import { MessageBox, Message } from 'element-ui'
import qs from 'qs'
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { i18n } from '../../i18n'
import { loadingService } from '../../services'
import decoder from '../decoder'

export async function onSend(request) {
  showNProgress(request)
  const { token_storage_key, token_header_key } = Vue.appConfig.login;

  const token = localStorage.getItem(token_storage_key);
  if (token) {
    request.headers[token_header_key] = localStorage.getItem(token_storage_key);
  }

  const { beforeRequest = _.noop } = Vue.appConfig.request || {};
  await beforeRequest(request)

  if (request.method === 'GET' && request.body) {
    const body = _.omitBy(request.body, (v, k) => k.startsWith('_'))
    request.params = qs.stringify(body, { arrayFormat: 'brackets' })
    delete request.body
  }
  return request
}

export function onSucceed(res) {
  hideNProgress(res.request)
  res['isResponse'] = true
  res.meta = {}
  _.forEach(res.headers, (v, k) => {
    v = res.headers[k] = [].concat(v)[0]
    if (/^x-/.test(k)) {
      const key = _.snakeCase(k.replace(/^x-/, ''))
      res.meta[key] = decoder(v)
    }
  })

  if ('total' in res.meta) {
    res.pagination = {
      total: res.meta['total'],
      'current-page': res.meta['page'],
      'page-size': res.meta['per_page'],
    }
  }

  if (res.request.return_res) {
    return res
  } else {
    return res.pagination ? { data: res.data, pagination: res.pagination } : res.data
  }
}

export function onError(err) {
  hideNProgress(err.request)
  const { error_message, message, messages, error, code } = _.get(err, 'response.data', {})
  err.message = error_message || message || messages || error || err.message
  err.api_code = code

  const app = Vue.appRouter.app
  switch (err.status) {
    case 401: {
      localStorage.removeItem('access_token')
      if (app.$route.name !== 'login') {
        app.$router.replace({ name: 'login' })
        Message.info(i18n.t('请登录'))
      }
      break;
    }
    case 403:
      app.$router.replace({ name: '403' })
      break;
    default: {
      MessageBox.alert(err.message, { title: i18n.t('错误') })
    }
  }
  return err
}

function useNProgress(request) {
  let loading = false
  if (['GET', 'DELETE'].includes(request.method) && request.loading !== false) {
    loading = true
  } else {
    loading = request.loading
  }
  return loading
}

function showNProgress(request) {
  if (useNProgress(request)) {
    loadingService.add()
    loadingService.state.count && NProgress.start()
  }
}

function hideNProgress(request) {
  if (useNProgress(request)) {
    loadingService.miuns()
    !loadingService.state.count && NProgress.done()
  }
}
