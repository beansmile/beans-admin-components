<template>
  <Ability :can="can">
    <div class="admin-import-block">
      <el-button icon="el-icon-upload" type="primary" :loading="importing" @click="handleButtonClick">{{ buttonText }}</el-button>

      <slot name="download">
        <el-popover v-if="excelTemplateDownloadLink" trigger="hover">
          <a download :href="encodeURI(excelTemplateDownloadLink)">
            {{ tooltipText || '下载模板' }}
          </a>
          <i class="el-icon-info btn-tip-trigger" slot="reference" @click.stop></i>
        </el-popover>
      </slot>

      <input ref="fileInput" type="file" :accept="fileAccept" :disabled="importing" @change="handleFileChange" />
    </div>
  </Ability>
</template>

<script>
  import { Vue, Component, Prop } from 'vue-property-decorator';
  import _ from 'lodash';
  import { Message } from 'element-ui';
  import { uploadFile } from '../utils/upload';
  import Ability from './ability';

  @Component({
    components: {
      Ability
    }
  })
  export default class ExportButton extends Vue {
    @Prop({ type: String }) buttonText;
    @Prop(String) excelTemplateDownloadLink;
    @Prop(String) tooltipText;
    @Prop(Function) fileChangeHandler;
    @Prop(String) url; // 导入接口路径
    @Prop({ type: String, default: '.xlsx' }) fileAccept;
    @Prop(String) loadingToast;
    @Prop(Function) customUpload;
    @Prop({ type: Boolean, default: false }) useGlobalUpload; // 使用全局的upload
    @Prop({ type: Object }) globalUploadProps;
    @Prop({ type: [String, Array] }) can;
    @Prop(Function) afterSuccessHandler;

    importing = false;

    download(blob, fileName) {
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display: none';
      a.href = window.URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      document.body.removeChild(a);
    }

    async upload(file) {
      const form = new FormData();
      form.append('file_message', file);
      const requestConfig = {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
        return_res: true,
        // 1小时超时
        timeout: 1 * 60 * 60 * 1000
      }
      const result = await this.$request.post(this.url, form, requestConfig);
      if (result.headers['x-error-message']) {
        throw new Error(decodeURIComponent(result.headers['x-error-message']));
      }
      if (+result.headers['x-error-count'] > 0) {
        this.download(new Blob([result.data]), `${this.$t('bean.error_massage')}.xlsx`);
        throw new Error(this.$t('bean.importFail'));
      }
    }

    handleButtonClick() {
      this.$refs.fileInput.click();
    }

    async handleFileChange(e) {
      if (_.isFunction(this.fileChangeHandler)) {
        this.fileChangeHandler(e);
        return;
      }
      const file = e.target.files[0];
      this.importing = true;
      let toastInstance = null;
      if (this.loadingToast) {
        toastInstance = Message.info({
          message: this.loadingToast,
          duration: 0,
          showClose: true
        });
      }
      try {
        if (_.isFunction(this.customUpload)) {
          await this.customUpload(file);
        } else if (this.useGlobalUpload) {
          await uploadFile(file, this.globalUploadProps);
        } else {
          await this.upload(file);
        }
        if (_.isFunction(this.afterSuccessHandler)) {
          this.afterSuccessHandler();
        } else {
          this.$message.success(this.$t('bean.importSuccess'));
        }
      } catch (e) {
        const msg = e.message || this.$t('bean.importFail');
        this.$message.error(msg);
      } finally {
        this.importing = false;
        if (toastInstance) {
          toastInstance.close();
        }
      }
      e.target.value = '';
    }
  }
</script>
