<template>
  <div
    class="admin-dropbox"
    :class="{ active, disabled }"
    @dragenter.stop.prevent="handleDropEnter"
    @dragover.stop.prevent="handleDropEnter"
    @dragleave.stop.prevent="handleDropLeave"
    @drop.stop.prevent="handleDropFile"
    @click.stop="handleClick"
    v-loading="loading"
  >
    <i class="el-icon-upload" />
    <div class="upload-text">{{ $t('bean.dragAndDropUpload') }}</div>
    <slot />

    <input
      :accept="accept"
      type="file"
      style="position: fixed; left: -200%; width: 0; height: 0;"
      ref="input"
      :multiple="limit > 1"
      @change="handleFileInputChange"
      @click.stop
    />
  </div>
</template>

<script>
import { Vue, Component, Prop } from 'vue-property-decorator';
import { checkFileTypeByAccept } from '../utils';

@Component
export default class DropBox extends Vue {
  @Prop(String) accept;
  @Prop(Boolean) disabled;
  @Prop(Boolean) loading;
  @Prop({ type: Number, default: 0 }) size; // 单位M 0表示不限制
  @Prop({ type: Number, default: 1 }) limit;
  active = false;

  handleDropEnter() {
    this.active = true;
  }

  handleDropLeave() {
    this.active = false;
  }

  validateFile(file, { validateType = true, validateSize = true } = {}) {
    if (validateType) {
      const fileTypeValid = checkFileTypeByAccept(file, this.accept);
      if (!fileTypeValid) {
        return `${file.name} - ${this.$t('bean.fileTypeisInvalid')}`;
      }
    }
    if (validateSize && this.size > 0) {
      if (file.size > this.size * 1024 * 1024) {
        return `${file.name} -  ${this.$t('bean.maximumFileSize', { size: `${this.size}M` })}`;
      }
    }
    return null;
  }

  handleFiles(files, { validateType = true, validateSize = true } = {}) {
    if (files.length) {
      if (files.length > this.limit) {
        this.$emit('error', this.$t('bean.maximumUploadFileCount', { count: this.limit }));
        return;
      }
      if (this.limit === 1) {
        const errMsg = this.validateFile(files[0], { validateType, validateSize });
        if (errMsg) {
          this.$emit('error', errMsg);
          return;
        }
        this.$emit('change', files);
      } else {
        const validFiles = files.filter(item => !this.validateFile(item, { validateType, validateSize }));
        if (validFiles.length !== files.length) {
          this.$emit('error', this.$t('bean.filteredUploadFileTip'));
        }
        if (validFiles.length) {
          this.$emit('change', validFiles);
        }
      }
    }
  }

  handleDropFile(e) {
    this.handleDropLeave();
    this.handleFiles([...e.dataTransfer.files]);
  }

  handleFileInputChange(e) {
    const files = e.target.files;
    this.handleFiles([...files], { validateType: false });
    // 相同文件change事件不会触发
    e.target.value = '';
  }

  handleClick() {
    this.$refs.input.click();
  }
}
</script>
