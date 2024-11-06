<template>
  <el-dialog
    :title="`(${$t('bean.selectCountItem', { count: limit })})`"
    :visible="value"
    width="900px"
    append-to-body
    @open="handleOpen"
    @close="handleClose"
    @closed="handleClosed"
    custom-class="admin-resource-uploader"
  >
    <div v-loading="loading">
      <div class="box-header">
        <Uploader
          v-bind="$attrs"
          :drag="drag"
          :clipboard="clipboard"
          :limit="50"
          @success="handleUploadSuccess"
        />
        <AdminFilter
          v-if="filterColumns.length"
          :columns="filterColumns"
          v-model="filterForm"
          @filter="handleFilter"
          @reset="handleReset"
        />
      </div>
      <div class="box-list">
        <div
          class="item"
          v-for="item in data"
          :key="item.id"
        >
          <div
            class="item-content"
            @click="handleSelect(item)"
            :class="{ active: selectedIds.includes(item.id) }"
          >
            <div class="mask"></div>
            <i class="el-icon-check"></i>
            <el-popconfirm
              :title="$t('bean.confirmDeleteTip')"
              class="btn-delete"
              @confirm="handleDelete(item)"
            >
              <i class="el-icon-circle-close" slot="reference" @click.stop></i>
            </el-popconfirm>
            <ResourceRender
              :video-props="{ controls: false }"
              :value="item"
              :image-props="{ previewSrcList: [] }"
              :show-filename="false"
            />
          </div>
          <p class="text-overflow-2">{{ item.filename }}</p>
        </div>
      </div>
      <div class="box-pagination" v-if="data.length > 0">
        <el-pagination
          background
          v-bind="pagination"
          layout="prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </div>
    <span slot="footer" class="dialog-footer">
      <el-button @click="handleClose">{{ $t('bean.actionClose') }}</el-button>
      <el-button type="primary" @click="handleConfirm" v-if="limit > 1" :disabled="selected.length <= 0">{{ $t('bean.actionConfirm') }}</el-button>
    </span>
  </el-dialog>
</template>

<script>
  import { Vue, Component, Model, Prop } from 'vue-property-decorator';
  import ResourceRender from '../resource-render';
  import Uploader from './index';
  import _ from 'lodash';
  import AdminFilter from '../form/filter';

  @Component({
    components: {
      Uploader,
      ResourceRender,
      AdminFilter
    }
  })
  export default class AdminResourceUploader extends Vue {
    @Model('change', { type: Boolean }) value;
    @Prop({ type: [Array, String], default: 'image' }) type;
    @Prop({ type: Number, default: 1 }) limit;
    @Prop(Boolean) drag;
    @Prop(Boolean) clipboard;

    loading = false;
    data = [];
    selected = [];
    pagination = {
      'current-page': 1
    };
    filterForm = {};

    get tagColumn() {
      const requestURL = _.get(this, '$vadminConfig.upload.resourceBlobTagURL');
      const requestFunction = _.get(this, '$vadminConfig.upload.onFetchResourceBlobTag');
      if (requestURL || requestFunction) {
        return {
          prop: 'tags_name_in',
          label: this.$t('bean.tag'),
          renderCell: {
            component: 'select',
            props: {
              multiple: true,
              filterable: true,
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

    get filterColumns() {
      const columns = _.get(this, '$vadminConfig.upload.resourceUploader.filterColumns') || [];
      const filterColumns = [...columns];
      const fileNameColumn = {
        prop: 'filename_cont',
        label: this.$t('bean.fileName'),
        renderCell: 'input'
      }
      if (this.tagColumn) {
        filterColumns.unshift(this.tagColumn);
      }
      if (!filterColumns.find(item => item.prop === 'filename_cont')) {
        filterColumns.unshift(fileNameColumn);
      }
      return filterColumns;
    }

    get selectedIds() {
      return this.selected.map(item => item.id);
    }

    handleClose() {
      this.$emit('change', false);
    }

    handleClosed() {
      this.selected = [];
      this.filterForm = {};
    }

    handleOpen() {
      this.fetchData();
    }

    handleUploadSuccess() {
      this.fetchData();
    }

    async fetchData() {
      this.loading = true;
      try {
        const requestURL = _.get(this, '$vadminConfig.upload.resourceBlobURL');
        const params = { per_page: 14, page: this.pagination['current-page'], ...this.filterForm }
        if (_.isArray(this.type)) {
          params.main_content_type_in = this.type;
        } else {
          params.content_type_cont = this.type;
        }
        const fetchResource = _.get(this, '$vadminConfig.upload.onFetchResourceBlob') || (() => this.$request.get(requestURL, { params }));
        const { data, pagination } = await fetchResource(params);
        this.data = data;
        this.pagination = pagination;
      } finally {
        this.loading = false;
      }
    }

    handlePageChange(page) {
      this.pagination['current-page'] = page;
      this.fetchData();
    }

    handleSelect(item) {
      if (this.limit === 1) {
        this.$emit('success', item);
        this.handleClose();
      } else {
        const index = this.selected.findIndex(selectItem => item.id === selectItem.id);
        if (index >= 0) {
          this.selected.splice(index, 1);
        } else {
          if (this.limit > this.selected.length) {
            this.selected.push(item);
          }
        }
      }
    }

    handleConfirm() {
      this.$emit('success', JSON.parse(JSON.stringify(this.selected)));
      this.handleClose();
    }

    async handleDelete(item) {
      const uploadConfig = Vue.vadminConfig.upload || {};
      if (uploadConfig.customDelete) {
        await uploadConfig.customDelete(item)
      } else {
        await this.$request.delete(`active_storage/blobs/${item.id}`);
      }
      this.fetchData();
    }

    handleFilter() {
      this.pagination['current-page'] = 1;
      this.fetchData();
    }

    handleReset() {
      this.filterForm = {};
      this.fetchData();
    }
  }
</script>
