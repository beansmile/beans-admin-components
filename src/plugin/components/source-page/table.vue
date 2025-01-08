<template>
  <div class="admin-source-page source-page-table">
    <div class="page-content">
      <slot name="before-filter" />

      <template v-if="filterColumns.length">
        <el-drawer
          append-to-body
          :size="null"
          direction="ltr"
          :visible.sync="filterDrawerVisible"
          custom-class="source-page-filter-drawer"
          v-if="renderFilterDrawer"
        >
          <AdminFilter
            :inline="false"
            label-position="top"
            v-bind="filterProps"
            v-model="filterForm"
            :columns="filterColumns"
            :showColumnSetting="showFilterColumnSetting"
            :columnSettingKey="filterColumnSettingKey"
            @filter="handleFilter"
            @reset="handleReset"
          />
        </el-drawer>
        <AdminFilter
          v-else
          v-bind="filterProps"
          v-model="filterForm"
          :columns="filterColumns"
          :showColumnSetting="showFilterColumnSetting"
          :columnSettingKey="filterColumnSettingKey"
          @filter="handleFilter"
          @reset="handleReset"
        />
      </template>

      <template v-if="scopeColumns.length">
        <AdminForm
          v-model="filterForm"
          :columns="scopeColumnsWithoutLable"
          @change="handleScopeChange"
        >
          <template v-slot:action>
          </template>
        </AdminForm>
      </template>

      <slot name="after-filter" :value="value" />

      <slot name="before-table" :value="value" />
      <div class="box-table">
        <slot name="table" :value="value">
          <Table
            v-loading="fetching"
            v-if="renderTable"
            v-bind="tableProps"
            v-on="tableEvents"
            :columns="sourcePageTableColumnsSelected"
            :value="value"
            :actions="actions"
            :action-column-props="actionColumnProps"
            :default-sort="defaultSort"
            :filterForm="filterForm"
            @filter-form-change="handleFilterFormChange"
            @sort-change="handleSortChange"
            @filter="handleTableFilter"
            @reset-filter="handleResetTableFilter"
          />
        </slot>
      </div>
      <slot name="after-table" :value="value" />
    </div>
    <div class="page-footer">
      <slot name="before-pagination" :value="value" />
      <Pagination
        v-bind="paginationProps"
        @submit="handlePagination"
      />
      <slot name="after-pagination" :value="value" />
      <div class="box-btn-setting">
        <ColumnSetting :columns="tableColumnsCanControl" v-model="selectedTableColumnProps" />
      </div>
    </div>
  </div>
</template>

<script>
import { Vue, Component, Prop, PropSync } from 'vue-property-decorator';
import AdminFilter from '../form/filter';
import AdminForm from '../form/index';
import Table from '../table';
import Pagination from '../pagination';
import _ from 'lodash';
import { sleep } from '../../utils';
import ColumnSetting from '../column-setting.vue';
import * as XLSX from 'xlsx';
@Component({
  components: {
    AdminFilter,
    AdminForm,
    Table,
    Pagination,
    ColumnSetting
  }
})
export default class AdminSourcePageTable extends Vue {
  @Prop({ type: Array, default: () => [] }) tableColumns;
  @Prop({ type: Array, default: () => [] }) filterColumns;
  @Prop({ type: Array, default: () => [] }) value;
  @Prop({ type: [Function, Array], default: () => [] }) actions;
  @Prop({ type: Object, default: () => ({}) }) actionColumnProps;
  @Prop({ type: Object, default: () => ({}) }) tableProps;
  @Prop({ type: Object, default: () => ({}) }) filterProps;
  @Prop({ type: Object, default: () => ({}) }) paginationProps;
  @Prop({ type: Object, default: () => ({}) }) tableEvents;
  @Prop(Boolean) renderFilterDrawer;
  @PropSync('showFilterDrawer', Boolean) filterDrawerVisible;
  @Prop({ type: Array, default: () => [] }) scopeColumns;
  @Prop(Boolean) showFilterColumnSetting;
  @Prop(String) filterColumnSettingKey;
  /** Index 页面执行筛选时, 路由栈提交的方式: push 或 replace */
  @Prop({ type: String, default: 'replace' }) indexExecFilterRouterType;
  @Prop(Boolean) fetching;

  filterForm = {};
  defaultSort = {};
  selectedTableColumnProps = [];
  renderTable = true;

  get tableColumnsCanControl() {
    return this.tableColumns.filter(item => {
      return !!(item.label && item.prop) && item.type !== 'selection';
    });
  }

  get SELECTED_COLUMN_PROPS_STORAGE_KEY() {
    return `${location.hostname}_${location.pathname}_admin-source-page-selected-column-props`;
  }

  get sourcePageTableColumnsSelected() {
    if (this.selectedTableColumnProps.length) {
      return _.filter(this.sourcePageTableColumns, (column) => {
        // selection 列一直需要显示
        return !column.prop || !column.label || column.type === 'selection' || _.includes(this.selectedTableColumnProps, column.prop);
      });
    }
    return this.sourcePageTableColumns;
  }

  get sourcePageTableColumns() {
    const defaultSortable = _.get(this, '$vadminConfig.sourcePage.sortable', []);
    return this.tableColumns.map(item => ({
      ...item,
      sortable: item.sortable === false ?
        false :
        (item.sortable || defaultSortable.includes(item.prop) ? 'custom' : false)
    }))
  }

  get scopeColumnsWithoutLable() {
    return this.scopeColumns.map(item => _.omit(item, 'label'));
  }

  async created() {
    if (!['push', 'replace'].includes(this.indexExecFilterRouterType)) {
      throw new TypeError('indexExecFilterRouterType 参数必须为 "push" 或 "replace"')
    }

    // 重新渲染table
    this.reRenderTable = _.debounce(async () => {
      this.renderTable = false;
      await this.$nextTick();
      this.renderTable = true;
    }, 500);

    this.tableToExcel = _.debounce((fileName) => {
      const TableConstructor = Vue.extend(Table);
      // 渲染新table
      let tableInstance = new TableConstructor(
        {
          i18n: this.$i18n,
          router: this.$router,
          propsData: {
            // 只导出有label的，只渲染这部分属性
            columns: _.filter(this.sourcePageTableColumnsSelected, item => item.label)
              .map(item => _.pick(item, ['label', 'prop', 'minWidth', 'width', 'renderCell'])),
            value: this.value
          }
        }
      );
      tableInstance.$mount();
      // 等dom
      setTimeout(() => {
        const book = XLSX.utils.table_to_book(tableInstance.$el);
        XLSX.writeFileXLSX(book, `${fileName || 'table'}.xlsx`);
        tableInstance.$destroy();
        tableInstance = null;
      }, 500);
    }, 1000, { leading: true });

    this.filterForm = JSON.parse(JSON.stringify(this.$route.query));
    const sortParams = _.get(this.filterForm, 'order', {});
    const sortKey = Object.keys(sortParams)[0];
    if (sortKey) {
      this.defaultSort = { prop: sortKey, order: { asc: 'ascending', desc: 'descending' }[sortParams[sortKey]] }
    }
    try {
      this.selectedTableColumnProps = JSON.parse(localStorage.getItem(this.SELECTED_COLUMN_PROPS_STORAGE_KEY)) || [];
    // eslint-disable-next-line no-empty
    } catch (e) {}

    this.dispose = this.$watch('selectedTableColumnProps', () => {
      this.reRenderTable();
      this.handleSaveColumnSetting();
    });
  }

  beforeDestroy() {
    this.dispose && this.dispose();
    return this.handleSaveColumnSetting();
  }

  handleSaveColumnSetting() {
    localStorage.setItem(this.SELECTED_COLUMN_PROPS_STORAGE_KEY, JSON.stringify(this.selectedTableColumnProps));
  }

  handleSortChange(e) {
    const { prop, order } = e;
    // 只支持一列排序
    this.handleFilter({ order: { [prop]: { ascending: 'asc', descending: 'desc' }[order] } });
  }

  handleAutoFilter() {
    this.handleFilter(this.filterForm);
  }

  async handleCloseDrawer() {
    if (this.filterDrawerVisible) {
      this.filterDrawerVisible = false;
      await sleep(300);
    }
  }

  handleFilterFormChange(data) {
    this.filterForm = data;
  }

  trim(obj) {
    const trimFilter = _.get(this, '$vadminConfig.sourcePage.trimFilter');
    if (trimFilter) {
      return _.mapValues(obj, val => {
        if (_.isString(val)) {
          return _.trim(val);
        }
        return val;
      });
    }
    return obj;
  }

  execFilter(params) {
    this.$router[this.indexExecFilterRouterType]({ query: { ...this.$route.query, ...this.trim(params), page: 1 }, hash: this.$route.hash });
  }

  execResetFilter(resets = []) {
    const query = _.omit({ ...this.$route.query, page: 1 }, resets);
    this.$router[this.indexExecFilterRouterType]({ query, hash: this.$route.hash });
  }

  async handleFilter(params) {
    await this.handleCloseDrawer();
    this.execFilter(params);
  }

  async handleReset() {
    await this.handleCloseDrawer();
    // 只重置filterColumn
    this.execResetFilter(this.filterColumns.map(item => item.prop));
  }

  handleTableFilter(params) {
    this.execFilter(params);
  }

  handleResetTableFilter(columns) {
    this.execResetFilter(columns.map(item => item.prop));
  }

  handlePagination({ page, size }) {
    this.$router.replace({ query: { ...this.$route.query, page, per_page: size }, hash: this.$route.hash });
  }

  handleScopeChange(params) {
    this.$router.replace({ query: { ...this.$route.query, ...params, page: 1 }, hash: this.$route.hash });
  }
}
</script>
