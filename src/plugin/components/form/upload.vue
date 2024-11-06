<template>
  <div class="admin-form-upload">
    <template v-if="useResourceUploader">
      <ResourceUploader
        :drag="drag"
        :clipboard="clipboard"
        :disabled="disabled || uploadLimit < 1"
        :limit="uploadLimit"
        :cropper="cropper"
        :accept="accept"
        :size="size"
        :type="type"
        v-bind="$attrs"
        @success="handleSuccess"
        v-model="disalogVisible"
      />

      <el-button
        type="primary"
        icon="el-icon-plus"
        :disabled="disabled || uploadLimit < 1"
        @click="disalogVisible = true"
      >{{ uploadButtonTextI18n }}</el-button>
    </template>

    <Uploader
      v-else
      :drag="drag"
      :clipboard="clipboard"
      :disabled="disabled || uploadLimit < 1"
      :limit="uploadLimit"
      :cropper="cropper"
      :accept="accept"
      :size="size"
      v-bind="$attrs"
      :uploadButtonTextI18n="uploadButtonTextI18n"
      @success="handleSuccess"
      ref="uploader"
    />

    <draggable
      :value="fileResources"
      class="resource-content"
      @end="handleDragChange"
      v-if="fileResources.length"
    >
      <template v-for="(item, index) in fileResources">
        <div class="item-resource" :key="index">
          <el-button v-if="!disabled && item.url" size="mini" circle class="btn-close" icon="el-icon-delete" @click.stop="handleDelete(index)"></el-button>
          <ResourceRender :value="item" :type="type" />
        </div>
      </template>
    </draggable>
    <div v-if="fileResources.length > 1" class="drag-tip">{{ $t('bean.dragSort') }}</div>
  </div>
</template>

<script>
import { Vue, Component, Model, Prop, Emit, Watch } from 'vue-property-decorator';
import _ from 'lodash';
import draggable from 'vuedraggable';
import { arrayMove } from '../../utils';
import ResourceUploader from '../upload/resource-uploader';
import ResourceRender from '../resource-render';
import Uploader from '../upload/index';

const FILE_MAP_SESSION_KEY_NAME = 'upload_file_map';

@Component({
  components: {
    Uploader,
    ResourceUploader,
    draggable,
    ResourceRender
  }
})
export default class AdminFormUpload extends Vue {
  @Model('change', { type: [Array, String, Number, Object] }) value;
  @Prop(Boolean) disabled;
  @Prop({ type: Number, default: 1 }) limit;
  @Prop({ type: Object }) cropper;
  @Prop({ type: String, default: 'image/*' }) accept;
  @Prop({ type: Number, default: 3 }) size; // 单位M
  @Prop({ type: String, default: 'signed_id' }) trackedBy;
  @Prop({ type: String }) uploadButtonText;
  @Prop({ type: [Array, String], default: 'image' }) type; // 资源类型
  @Prop(Boolean) disableResourceUploader;
  @Prop(Boolean) drag;
  @Prop(Boolean) clipboard;

  disalogVisible = false;

  transformValue = ({ value, trackedBy, callback }) => {
    if (_.isArray(value)) {
      if (_.isPlainObject(value[0])) {
        value.forEach(item => {
          const key = item[trackedBy];
          sessionStorage.setItem(`${FILE_MAP_SESSION_KEY_NAME}_${key}`, JSON.stringify(item));
        });
        callback(value.map(item => item[trackedBy]));
      }
    } else {
      if (_.isPlainObject(value)) {
        const key = value[trackedBy];
        sessionStorage.setItem(`${FILE_MAP_SESSION_KEY_NAME}_${key}`, JSON.stringify(value));
        callback(key);
      }
    }
  };

  get useResourceUploader() {
    if (this.disableResourceUploader) {
      return false;
    }
    const requestURL = _.get(this, '$vadminConfig.upload.resourceBlobURL');
    const onFetchResourceBlob = _.get(this, '$vadminConfig.upload.onFetchResourceBlob');
    return !!(requestURL || onFetchResourceBlob);
  }

  get uploadButtonTextI18n() {
    return this.uploadButtonText || this.$t('bean.actionUpload');
  }

  get uploadLimit() {
    if (this.limit > 1) {
      return this.limit - (this.value || []).length;
    }
    return 1;
  }

  get fileResources() {
    const value = this.value ? _.flatten([this.value]) : [];
    return value.map(item => {
      if (/^(http|\/)/.test(item)) {
        return {
          url: item,
          content_type: this.accept.includes('image') ? 'image' : (this.accept.includes('video') ? 'video' : '')
        }
      }
      if (_.isString(item) || _.isNumber(item)) {
        return JSON.parse(sessionStorage.getItem(`${FILE_MAP_SESSION_KEY_NAME}_${item}`));
      }
      return item;
    });
  }

  triggerUpload() {
    if (this.useResourceUploader) {
      this.disalogVisible = true;
    } else {
      this.$refs.uploader.triggerUpload();
    }
  }

  @Watch('value', { immediate: true })
  onValueChange(value) {
    if (value) {
      this.transformValue({
        trackedBy: this.trackedBy,
        value,
        callback: this.handleSyncValue
      });
    }
  }

  @Emit('change')
  handleSyncValue(data) {
    return data;
  }

  handleSuccess(data) {
    const dataList = _.flatten([data]);
    dataList.forEach(item => {
      const key = item[this.trackedBy];
      sessionStorage.setItem(`${FILE_MAP_SESSION_KEY_NAME}_${key}`, JSON.stringify(item));
    });
    const ids = dataList.map(item => item[this.trackedBy]);
    this.handleSyncValue(this.limit > 1 ? (this.value || []).concat(...ids) : ids[0]);
  }

  @Emit('change')
  handleDelete(index) {
    if (_.isArray(this.value)) {
      return this.value.filter((v, i) => i !== index);
    }
    return null;
  }

  handleDragChange({ oldIndex, newIndex }) {
    if (oldIndex !== newIndex) {
      this.$emit('change', arrayMove(this.value, oldIndex, newIndex));
    }
  }

}
</script>
