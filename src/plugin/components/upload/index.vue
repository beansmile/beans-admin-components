<template>
  <div class="admin-upload">
    <input
      type="file"
      class="input-file"
      :ref="FILE_INPUT_REF_NAME"
      :multiple="fileInputIsMultiple"
      :accept="accept"
      @change="handleFileChange"
    />
    <DropBox
      v-if="drag && limit === 1"
      :accept="accept"
      :disabled="loading"
      :size="size"
      @error="handleDropboxError"
      @change="handleDropboxChange"
    >
      <div v-if="loading">
        <small>
          <template v-if="checksumPending">
            {{ $t('bean.checksumPending') }}
          </template>
          <template v-else>
            ({{ uploadProgressPct }}%)
          </template>
        </small>
      </div>
    </DropBox>
    <template v-else>
      <el-button
        type="primary"
        icon="el-icon-upload"
        @click="handleUploadBtnClick"
        :disabled="disabled"
        :loading="loading"
      >
        {{ uploadButtonTextI18n }}
        <template v-if="loading">
          <template v-if="checksumPending">
            {{ $t('bean.checksumPending') }}
          </template>
          <template v-else>
            ({{ uploadProgressPct }}%)
          </template>
        </template>
      </el-button>
      <div class="paste-area" v-if="limit === 1 && clipboard">
        <input
          :disabled="disabled || loading"
          :placeholder="$t('bean.upload.inputPasteTip')"
          class="paste-input"
          readonly
          @paste.stop="handleUploadFromClipboard"
        />
      </div>
    </template>
    <MultipleUpload
      v-if="renderMultipleUploadDialog && limit > 1"
      :drag="drag"
      :clipboard="clipboard"
      v-model="showMultipleUploadDialog"
      v-bind="{ limit, cropper, accept, size, ...$attrs }"
      @success="$emit('success', $event)"
      @closed="handleMultipleUploadDialogClosed"
    />
    <ImageCropper
      v-model="showCroppper"
      v-bind="cropper"
      v-if="cropperImageURL"
      :loading="loading"
      :img="cropperImageURL"
      @success="handleUploadCroppedImage"
    />
  </div>
</template>

<script>
import { Vue, Component, Prop, Emit } from 'vue-property-decorator';
import MultipleUpload from './multiple-upload';
import ImageCropper from './image-cropper';
import { uploadFile, isImageFile, imageFileNeedCrop, checkFileSize, getImageInfo } from '../../utils';
import DropBox from '../dropbox.vue';
import { handlePasteFiles } from '../../utils';

@Component({
  components: {
    MultipleUpload,
    ImageCropper,
    DropBox,
  }
})
export default class AdminUpload extends Vue {
  @Prop(Boolean) disabled;
  @Prop({ type: Number, default: 1 }) limit;
  @Prop({ type: Object }) cropper;
  @Prop({ type: String, default: 'image/*' }) accept;
  @Prop({ type: Number, default: 3 }) size; // 单位M
  @Prop({ type: String }) uploadButtonText;
  @Prop(Boolean) drag;
  @Prop(Boolean) clipboard;

  FILE_INPUT_REF_NAME = 'fileInput';

  renderMultipleUploadDialog = true;
  showMultipleUploadDialog = false;
  showCroppper = false;
  cropperImageURL = '';
  loading = false;
  uploadProgressPct = 0; // 上传进度(百分比)
  checksumPending = false; // 文件计算checksum中

  get uploadButtonTextI18n() {
    return this.uploadButtonText || this.$t('bean.actionUpload');
  }

  get fileInputIsMultiple() {
    return this.limit > 1;
  }

  triggerUpload() {
    if (this.fileInputIsMultiple) {
      this.showMultipleUploadDialog = true;
      return;
    }
    this.$refs[this.FILE_INPUT_REF_NAME].click();
  }

  handleUploadBtnClick() {
    this.triggerUpload();
  }

  async handleUploadFromClipboard (e) {
    if (this.disabled || this.loading) {
      return;
    }
    const files = await handlePasteFiles(e, this.accept, this.size);
    if (files.length) {
      this.handleUpload(files[0]);
    }
  }

  async handleMultipleUploadDialogClosed() {
    this.renderMultipleUploadDialog = false;
    await this.$nextTick();
    this.renderMultipleUploadDialog = true;
  }

  handleUploadCroppedImage(blob) {
    if (this.filename) {
      blob.name = this.filename;
    }
    return this.handleUpload(blob);
  }

  @Emit('success')
  async handleUpload(blob, tags) {
    this.loading = true;
    try {
      const [uploadRes, imageInfo] = await Promise.all([
        uploadFile(blob, { ...this.$attrs, tags }, {
          onProgress: pct => this.uploadProgressPct = pct,
          onChecksumStart: () => this.checksumPending = true,
          onChecksumEnd: () => this.checksumPending = false
        }),
        isImageFile(blob) ? getImageInfo(blob) : {}
      ]);
      return {
        ...imageInfo,
        ...uploadRes,
      };
    } finally {
      this.loading = false;
    }
  }

  async handleFileChange(e) {
    const file = e.target.files[0];
    this.filename = file.name;
    // 相同文件change事件不会触发
    e.target.value = '';
    if (isImageFile(file) && this.cropper) {
      const needCrop = await imageFileNeedCrop(file, this.cropper);
      if (needCrop) {
        this.cropperImageURL = URL.createObjectURL(file);
        this.showCroppper = true;
        return;
      }
    }
    const sizeValid = await checkFileSize(file, this.size);
    if (!sizeValid) {
      this.$message.error(this.$t('bean.maximumFileSize', { size: `${this.size}M` }));
      return;
    }
    this.handleUpload(file);
  }

  handleDropboxError(errMsg) {
    this.$message.error(errMsg);
  }

  handleDropboxChange(files) {
    this.handleUpload(files[0]);
  }
}
</script>
