<template>
  <el-dialog
    custom-class="dialog-admin-multiple-upload"
    width="70%"
    :visible="value"
    :title="$t('bean.actionUpload')"
    append-to-body
    :fullscreen="screenService.isMobile"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    @close="$emit('change', false)"
    @closed="$emit('closed')"
  >
    <div class="admin-multiple-upload">
      <DropBox
        v-if="drag"
        :accept="accept"
        :disabled="loading || (tableData.length >= limit)"
        :size="size"
        :limit="limit - tableData.length"
        @error="handleDropboxError"
        @change="handleDropboxChange"
      />

      <AdminForm
        v-if="formColumns.length"
        v-model="uploadForm"
        :columns="formColumns"
        inline
        :disabled="loading"
      >
        <template #action>
        </template>
      </AdminForm>

      <input
        type="file"
        multiple
        class="input-file"
        :ref="FILE_INPUT_REF_NAME"
        :accept="accept"
        @change="handleFileChange"
      />

      <input
        type="file"
        multiple
        webkitdirectory
        directory
        class="input-file"
        :ref="DIRECTORY_INPUT_REF_NAME"
        @change="handleDirectoryChange"
      >

      <el-row class="btn-group">
        <el-button v-if="!drag" type="primary" icon="el-icon-plus" :disabled="loading || (tableData.length >= limit)" @click="handleUploadBtnClick">{{ $t('bean.actionChooseFile') }}</el-button>
        <el-button v-if="directory" type="primary" icon="el-icon-plus" :disabled="loading || (tableData.length >= limit)" @click="handleUploadDirectoryBtnClick">{{ $t('bean.actionChooseDirectory') }}</el-button>
        <el-button type="warning" @click="handleUploadAll" :loading="loading" :disabled="loading || (!needUploadData.length)">{{ $t('bean.actionUploadAll') }}</el-button>
        <el-button type="danger" @click="handleDeleteAll" :disabled="loading || (!tableData.length)">{{ $t('bean.actionRemoveAll') }}</el-button>
      </el-row>

      <el-alert show-icon type="warning" :title="uploadHint" :closable="false"></el-alert>
      <el-alert show-icon type="info" v-if="clipboard" :title="$t('bean.upload.pasteTip')" :closable="false" />

      <br>

      <div class="box-table">
        <AdminTable
          :value="tableData"
          :columns="columns"
          :actions="actions"
          :action-column-props="{ width: 200 }"
        />
      </div>
    </div>
    <template #footer>
      <el-button @click="handleCloseDialog" :disabled="loading">{{ $t('bean.actionClose') }}</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="loading" :disabled="loading">{{ $t('bean.actionConfirm') }}</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { Vue, Component, Prop, Model, Emit } from 'vue-property-decorator';
import AdminTable from '../table';
import FormSelect from '../form/select';
import AdminForm from '../form';
import { checkFileSize, uploadFile } from '../../utils';
import _ from 'lodash';
import ImageCropperAction from './image-cropper-action';
import { screenService } from '../../services';
import DropBox from '../dropbox.vue';
import { handlePasteFiles } from '../../utils';

@Component({
  components: {
    AdminTable,
    FormSelect,
    AdminForm,
    DropBox,
  }
})
export default class MultipleUploadDialog extends Vue {
  @Model('change', { type: Boolean }) value;
  @Prop({ type: Number, default: 1 }) limit;
  @Prop({ type: Object }) cropper;
  @Prop({ type: String, default: 'image/*' }) accept;
  @Prop({ type: Number, default: 3 }) size; // 单位M
  @Prop(String) hint; // 提示
  @Prop(Boolean) directory;
  @Prop(Boolean) drag;
  @Prop(Boolean) clipboard;

  FILE_INPUT_REF_NAME = 'fileInput';
  DIRECTORY_INPUT_REF_NAME = 'fileDirectory';

  uploadForm = {};
  tableData = [];
  loading = false;

  screenService = screenService;

  get tagColumns() {
    const requestURL = _.get(this, '$vadminConfig.upload.resourceBlobTagURL');
    const requestFunction = _.get(this, '$vadminConfig.upload.onFetchResourceBlobTag');
    if (requestURL || requestFunction) {
      return {
        prop: 'tags',
        label: this.$t('bean.tag'),
        renderCell: {
          component: 'select',
          hint: this.$t('bean.chooseBlobTagTip'),
          props: {
            clearable: true,
            multiple: true,
            filterable: true,
            'default-first-option': true,
            allowCreate: true,
            xRemoteSearch: async (name) => {
              const params = { name_cont: name };
              const fetchResource = requestFunction || (() => this.$request.get(requestURL, { params }));
              const result = await fetchResource(params);
              const data = _.isArray(result) ? result : _.get(result, 'data', []);
              return data.map(item => ({
                label: item.name,
                value: item.name
              }));
            }
          }
        }
      }
    }
    return null;
  }

  get formColumns() {
    const columns = _.get(this, '$vadminConfig.upload.resourceUploader.formColumns') || [];
    const filterColumns = [...columns];
    if (this.tagColumns) {
      filterColumns.unshift(this.tagColumns);
    }
    return filterColumns;
  }

  get columns() {
    return [
      {
        prop: 'file.name',
        label: this.$t('bean.fileName'),
        renderCell(h, { props: { value, scope: { row } } }) {
          return (
            <a href={window.URL.createObjectURL(row.file)} target="_blank">
              <span>{value}{ row.cropped ? <el-tag style="margin-left: 10px" type="danger">{ this.$t('bean.imageResized') }</el-tag> : '' }</span>
            </a>
          )
        }
      },
      {
        prop: 'file.size',
        width: 120,
        label: this.$t('bean.fileSize'),
        renderCell(h, { props: { value } }) {
          return <span>{(value / 1024 / 1024).toFixed(3) + 'M'}</span>;
        }
      },
      {
        prop: 'file.type',
        width: 120,
        label: this.$t('bean.fileType'),
      },
      {
        prop: 'result.url',
        width: 120,
        label: this.$t('bean.uploadSuccess'),
        renderCell: (h, { props: { value, scope: { row } } }) => {
          if (_.get(row, 'uploading')) {
            if (_.get(row, 'checksumPending')) {
              return <span>{this.$t('bean.checksumPending')}</span>;
            }
            if (_.has(row, 'progress')) {
              return <el-progress size="mini" text-inside stroke-width={20} percentage={row.progress || 0}></el-progress>
            }
          }
          const map = {
            true: { type: 'success', name: this.$t('bean.yes') },
            false: { type: 'danger', name: this.$t('bean.no') }
          }
          const bool = Boolean(value);
          return <el-tag type={map[bool].type}>{map[bool].name}</el-tag>
        }
      }
    ];
  }

  get cropperHint() {
    if (this.cropper) {
      return `${this.$t('bean.imageResizer')}: ${this.cropper.width}x${this.cropper.height}`;
    }
    return '';
  }

  get uploadHint() {
    return this.hint ||
      `${this.$t('bean.fileFormat')}：${this.accept}，${this.$t('bean.maximumFileSize', { size: this.size })}M，${this.$t('bean.maximumUploadFileCount', { count: this.limit })}，${this.cropperHint}`
  }

  get needUploadData() {
    return this.tableData.filter(item => !item.result);
  }

  get resourceTagURL() {
    return _.get(this, '$vadminConfig.upload.resourceBlobTagURL');
  }

  get showCropperButton() {
    return _.get(this.cropper, 'width') && this.accept.includes('image');
  }

  handleCropSuccess(file, $index) {
    const name = _.get(this.tableData[$index], 'file.name');
    if (name) {
      file.name = name;
    }
    this.$set(this.tableData, $index, {
      file,
      cropped: true
    });
  }

  actions({ $index, row }) {
    return [
      h => <ImageCropperAction h={h} file={row.file} disabled={row.uploading || row.cropped} cropper={this.cropper} onSuccess={(e) => this.handleCropSuccess(e, $index)} />,
      (h) => <el-button h={h} disabled={row.uploading} type="danger" onClick={() => this.tableData.splice($index, 1)}>{ this.$t('bean.actionRemove') }</el-button>
    ].filter(Boolean);
  }

  async fetchTags(name_cont) {
    const { data } = await this.$request.get(this.resourceTagURL, { params: { name_cont } })
    return _.map(data, ({ name }) => ({ value: name, label: name }))
  }

  handleFileChange(e) {
    const files = [...e.target.files];
    // 相同文件change事件不会触发
    e.target.value = '';
    this.putValidFilesToTable(files);
  }

  handleDirectoryChange(e) {
    const files = [...e.target.files]
      .filter(item => !item.name.startsWith('.'))
      .filter(item => {
        if (this.accept === '*') {
          return true;
        }
        return !!item.type.match(this.accept);
      });
    e.target.value = '';
    this.putValidFilesToTable(files);
  }

  putValidFilesToTable(files) {
    if (files.length + this.tableData.length > this.limit) {
      this.$message.error(this.$t('bean.maximumUploadFileCount', { count: this.limit }));
      return;
    }
    const validFiles = files.filter(file => checkFileSize(file, this.size));
    if (validFiles.length !== files.length) {
      this.$message.info(this.$t('bean.filteredUploadFileTip'));
    }
    this.tableData.push(...validFiles.map(file => ({ file })));
  }

  handleUploadBtnClick() {
    this.$refs[this.FILE_INPUT_REF_NAME].click();
  }

  handleUploadDirectoryBtnClick() {
    this.$refs[this.DIRECTORY_INPUT_REF_NAME].click();
  }

  mounted() {
    if (this.clipboard) {
      this.$el.addEventListener('paste', this.handleUploadFromClipboard);
    }
  }

  beforeDestroy() {
    this.$el.removeEventListener('paste', this.handleUploadFromClipboard);
  }

  handleUploadFromClipboard = async (e) => {
    const files = await handlePasteFiles(e, this.accept, this.size);
    this.putValidFilesToTable(files);
  }

  async handleUpload(row, index) {
    this.$set(this.tableData[index], 'uploading', true);
    try {
      const result = await uploadFile(row.file, { ...this.$attrs, ...this.uploadForm }, {
        onProgress: pct => this.$set(this.tableData[index], 'progress', pct),
        onChecksumStart: () => this.$set(this.tableData[index], 'checksumPending', true),
        onChecksumEnd: () => this.$set(this.tableData[index], 'checksumPending', false)
      });
      this.$set(this.tableData[index], 'result', result);
      return result;
    } finally {
      this.$set(this.tableData[index], 'uploading', false);
    }
  }

  async handleUploadAll() {
    if (this.needUploadData.length) {
      this.loading = true;
      try {
        await Promise.all(
          this.needUploadData.map(this.handleUpload)
        );
      } finally {
        this.loading = false;
      }
    }
  }

  handleDeleteAll() {
    this.tableData = [];
  }

  @Emit('change')
  handleCloseDialog() {
    return false;
  }

  @Emit('success')
  async handleSubmit() {
    await this.handleUploadAll();
    this.handleCloseDialog();
    return this.tableData.map(item => item.result)
  }

  handleDropboxError(errMsg) {
    this.$message.info(errMsg);
  }

  handleDropboxChange(files) {
    this.tableData.push(...files.map(file => ({ file })));
  }
}
</script>
