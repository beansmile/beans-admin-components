<template>
  <div style="width: 100%; height: 100%" v-if="componentDataInited">
    <portal to="layout-nav-title">{{ pageTitle }}</portal>
    <slot name="page-top" />
    <TablePage
      v-if="type === 'index'"
      :value="state.data"
      :table-columns="sourcePageIndexColumns"
      :filter-columns="sourcePageFilterColumns"
      :scope-columns="sourcePageScopeColumns"
      :actions="sourcePageAction"
      :pagination-props="state.pagination"
      :table-events="tablePageEvents"
      :table-props="tableProps"
      :action-column-props="actionColumnProps"
      :collapse-filter="collapseFilter"
      :showFilterDrawer.sync="showFilterDrawer"
      :renderFilterDrawer="renderFilterDrawer"
      :showFilterColumnSetting="localShowFilterColumnSetting"
      :filterColumnSettingKey="filterColumnSettingKey"
      :index-exec-filter-router-type="indexExecFilterRouterType"
      ref="tablePage"
      :fetching="fetching"
    >
      <template
        v-for="(slot, slotName) in $scopedSlots"
        #[slotName]="scope"
      >
        <component :key="slotName" :is="{ functional: true, render: () => slot(scope) }" />
      </template>
      <template #after-filter>
        <div class="box-actions">
          <el-button v-if="renderFilterDrawer && sourcePageFilterColumns.length" type="primary" icon="el-icon-s-operation" @click="showFilterDrawer = true">{{ $t('bean.actionFilter') }}</el-button>
          <AdminLink :to="{ name: `${resource}.new` }" v-if="actionButtons.includes('new')">
            <el-button icon="el-icon-plus" type="primary">{{ $t('bean.actionNew') }}</el-button>
          </AdminLink>
          <ColumnRender
            v-for="(batchAction, index) in sourcePageBatchAction"
            :key="index"
            :renderCell="batchAction"
          />
          <ExportButton
            v-bind="exportButtonProps"
            v-if="exportProps"
            :before-export="handleBeforeExport"
          />
          <ImportButton
            v-bind="importProps"
            v-if="importProps"
          />
          <el-button
            v-if="enableTableToExcel"
            @click="handleTableToExcel"
            type="primary"
            icon="el-icon-download"
          >{{ $t('bean.actionTableToExcel') }}</el-button>
          <slot name="action" />
        </div>
      </template>
    </TablePage>
    <slot name="show" v-else-if="type === 'show'" :value="state.data">
      <component :is="CustomShowPage ? CustomShowPage : ShowPage"
        :value="state.data"
        :columns="sourcePageColumns"
        :tabs="tabs"
        :actions="sourcePageAction"
        v-bind="showPageProps"
      />
    </slot>
    <FormPage
      v-else-if="type === 'edit' || type === 'new'"
      :columns="sourcePageFormColumns"
      :loading="formLoading"
      v-model="state.data"
      @submit="handleSubmit"
    >
      <template v-slot:action="{ value }">
        <slot name="form-action" :value="value" />
      </template>
    </FormPage>
  </div>
</template>

<script>
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import TablePage from './table';
import ShowPage from './show';
import FormPage from './form';
import _ from 'lodash';
import { request, contactUrl } from '../../utils';
import AdminLink from '../link';
import ExportButton from '../export-button';
import ImportButton from '../import-button';
import ColumnRender from '../column-render';
import { screenService } from '../../services';

@Component({
  components: {
    TablePage,
    FormPage,
    AdminLink,
    ExportButton,
    ImportButton,
    ColumnRender
  }
})
export default class AdminSourcePage extends Vue {
  @Prop(String) type; // index new edit show
  @Prop([String, Object]) title;
  @Prop({ type: String, default: '' }) namespace;
  @Prop(String) resource;
  @Prop([Array, Function]) columns;
  @Prop([Array, Function]) tabs;
  @Prop([Array, Function]) formColumns;
  @Prop([Array, Function]) filterColumns;
  @Prop([Array, Function]) scopeColumns;
  @Prop({ type: Array, default: () => ['new', 'show'] }) actionButtons;
  @Prop(Object) exportProps;
  @Prop(Object) importProps;
  @Prop([Array, Function]) actions;
  @Prop([Array, Function]) batchActions;
  @Prop({ type: Object, default: () => ({}) }) tableEvents;
  @Prop({ type: Object, default: () => ({}) }) tableProps;
  @Prop(Function) beforeSubmit;
  @Prop(Function) afterSubmit;
  @Prop(Function) onFormSubmit;
  @Prop(Function) onFetchData;
  @Prop(Function) onDelete;
  @Prop(Function) afterDelete;
  @Prop(Function) transformIndexQueryParams;
  @Prop({ type: Object, default: () => ({}) }) form;
  @Prop({ type: Object }) actionColumnProps;
  @Prop(Boolean) collapseFilter;
  @Prop(Boolean) enableTableToExcel;
  @Prop(Object) showPageProps;
  @Prop({ type: Boolean, default: undefined }) showFilterColumnSetting;
  @Prop(String) filterColumnSettingKey;
  @Prop({ type: String, default: 'replace' }) indexExecFilterRouterType;
  /** 传入组件 */
  @Prop(Function) customShowPage;

  showFilterDrawer = false;
  formLoading = false;
  state = {}
  componentDataInited = false;
  ShowPage = ShowPage
  fetching = false;

  @Watch('$route.query')
  onQueryChange() {
    const routerViewFullPathKey = _.get(this, '$vadminConfig.layout.routerViewFullPathKey');
    if (!routerViewFullPathKey) {
      this.fetchData();
    }
  }

  get CustomShowPage() {
    if (!_.isFunction(this.customShowPage)) {
      return undefined;
    }

    return this.customShowPage;
  }

  get localShowFilterColumnSetting() {
    if (_.isUndefined(this.showFilterColumnSetting)) {
      return _.get(this, '$vadminConfig.sourcePage.showFilterColumnSetting');
    }
    return this.showFilterColumnSetting;
  }

  get renderFilterDrawer() {
    return this.collapseFilter || screenService.isMobile || screenService.isTablet;
  }

  get exportButtonProps() {
    return {
      url: `${this.namespace}${this.resource}/export`,
      params: { ...this.$route.query, page: undefined },
      fileName: `${this.pageTitle}.xlsx`,
      buttonText: this.$t('bean.actionExport'),
      ...this.exportProps
    }
  }

  get tablePageEvents() {
    const defaultEvents = {};
    if (this.actionButtons.includes('show')) {
      defaultEvents['row-click'] =  ({ id }) => {
        // 用户准备进行复制文字操作不要发生跳转
        if (window.getSelection) {
          const oSelection = window.getSelection();
          if (oSelection.toString) {
            const selection = oSelection.toString();
            if (selection) {
              return;
            }
          }
        }
        this.$router.push({ name: `${this.resource}.show`, params: { id } })
      };
    }
    if (this.sourcePageBatchAction.length) {
      defaultEvents['selection-change'] = selection => this.$set(this.state, 'selection', selection);
    }
    return {
      ...defaultEvents,
      ...this.tableEvents
    }
  }

  get sourcePageIndexColumns() {
    return (
      this.sourcePageBatchAction.length ? [{ label: '', type: 'selection', width: 55 }] : []
    ).concat(this.sourcePageColumns);
  }

  get sourcePageColumns() {
    const columns = this.getColumns(this.columns);
    const defaultColumns = this
      .getColumns(_.get(this, '$vadminConfig.sourcePage.columns', []))
      .filter(defaultColumn => !columns.find(userColumn => userColumn.prop === defaultColumn.prop));
    return this.transformColumns(columns.concat(defaultColumns));
  }

  get sourcePageFormColumns() {
    const exportParams = {
      data: this.state.data || {},
      change: this.syncForm
    }
    const columns = this.getColumns(this.formColumns, exportParams);
    const defaultColumns = this
      .getColumns(_.get(this, '$vadminConfig.sourcePage.formColumns', []), exportParams)
        .filter(defaultColumn => !columns.find(userColumn => userColumn.prop === defaultColumn.prop));
    return this.transformColumns(columns.concat(defaultColumns));
  }

  get sourcePageFilterColumns() {
    const columns = this.getColumns(this.filterColumns);
    const defaultColumns = this
      .getColumns(_.get(this, '$vadminConfig.sourcePage.filterColumns', []))
      .filter(defaultColumn => !columns.find(userColumn => userColumn.prop === defaultColumn.prop));
    return this.transformColumns(columns.concat(defaultColumns));
  }

  get sourcePageScopeColumns() {
    const columns = this.getColumns(this.scopeColumns);
    return this.transformColumns(columns);
  }

  get exportActionParams() {
    return {
      remove: this.handleDelete,
      reload: this.fetchData,
      ..._.pick(this, ['resource', 'type', 'namespace'])
    }
  }

  get sourcePageAction() {
    if (_.isArray(this.actions)) {
      return this.actions;
    }
    if (_.isFunction(this.actions)) {
      return (...args) => {
        return this.actions(...args, this.exportActionParams);
      }
    }
    return [];
  }

  get sourcePageBatchAction() {
    if (_.isArray(this.batchActions)) {
      return this.batchActions;
    }
    if (_.isFunction(this.batchActions)) {
      return this.batchActions({ selection: this.state.selection || [] }, this.exportActionParams);
    }
    return [];
  }

  get pageTitle() {
    if (_.isPlainObject(this.title)) {
      return this.title[this.type];
    }
    const title = String(this.title);
    if (this.type === 'new') {
      return `${this.$t('bean.actionNew')} - ${title}`;
    }
    if (this.type === 'edit') {
      return `${this.$t('bean.actionEdit')} - ${title}`;
    }
    if (this.type === 'show') {
      return `${title} - ${this.$t('bean.actionDetail')}`
    }
    return title;
  }

  mounted() {
    this.fetchData();
  }

  async fetchData() {
    this.fetching = true;
    try {
      if (_.isFunction(this.onFetchData)) {
        const state = await this.onFetchData({ resource: this.resource, type: this.type, namespace: this.namespace });
        this.state = state;
        return;
      }

      if (this.type === 'index') {
        const params = this.transformIndexQueryParams ? this.transformIndexQueryParams({ ...this.$route.query }) : { ...this.$route.query };
        const { data, pagination } = await request.get(`/${this.namespace}${this.resource}`, { params });
        this.$set(this.state, 'data', data);
        this.$set(this.state, 'pagination', pagination);
        return;
      }

      if (this.type === 'edit' || this.type === 'show') {
        const data = await request.get(`/${this.namespace}${this.resource}/${this.$route.params.id}`);
        this.originData = _.cloneDeep(data);
        this.$set(this.state, 'data', data);
      }

      if (this.type === 'new') {
        this.originData = _.cloneDeep(this.form);
        this.$set(this.state, 'data', this.form);
      }
    } finally {
      this.fetching = false;
      // 有时候会根据数据动态调整column，会导致加载前和加载后table等显示出问题
      // 比如数据没加载完时先渲染了空table，加载完多了一列，table header变高了，table没重新渲染，导致fixed的table列对不齐
      this.componentDataInited = true;
      await this.$nextTick();
      this.$emit('ready', {
        el: this.$el
      });
    }
  }

  transformColumns(columns = []) {
    return columns.map(item => ({
      ...item,
      label: item.label || this.$t(`${this.namespace}${this.resource}.${item.prop}`)
    }));
  }

  getColumns(columns, exportParams = {}) {
    if (_.isArray(columns)) {
      return columns;
    }
    if (_.isFunction(columns)) {
      return columns.call(this, this.$createElement, { type: this.type, resource: this.resource, ...exportParams });
    }
    return [];
  }

  syncForm(data) {
    const newForm = _.mergeWith({}, this.state.data, data, (objValue, srcValue) => {
      if (_.isArray(objValue)) {
        return srcValue;
      }
    });
    this.$set(this.state, 'data', newForm);
  }

  async handleDelete(id) {
    const params = { id, type: this.type, resource: this.resource, namespace: this.namespace };
    if (_.isFunction(this.onDelete)) {
      await this.onDelete(params);
    } else {
      await request.delete(`/${contactUrl([this.namespace, this.resource, id])}`);
    }
    if (_.isFunction(this.afterDelete)) {
      this.afterDelete(params);
    } else {
      this.$message.success(this.$t('bean.deleteSuccess'));
      if (this.type === 'show') {
        this.$router.go(-1);
        return;
      }
      await this.fetchData();
    }
  }

  async handleSubmit(data) {
    try {
      this.formLoading = true;
      const hookParams = { data, originData: this.originData, state: this.state, type: this.type, resource: this.resource, namespace: this.namespace };
      if (_.isFunction(this.onFormSubmit)) {
        await this.onFormSubmit(hookParams);
      } else {
        let body = data;
        if (_.isFunction(this.beforeSubmit)) {
          body = await this.beforeSubmit(hookParams);
        }
        const action = this.type === 'new' ? 'post' : 'put';
        const pathArray = [this.namespace, this.resource];
        this.type !== 'new' && pathArray.push(body.id)
        const submitResult = await request[action]('/' + contactUrl(pathArray), body);
        const message = this.type === 'new' ? this.$t('bean.createSuccess') : this.$t('bean.updateSuccess');
        this.$message.success(message);
        if (_.isFunction(this.afterSubmit)) {
          this.afterSubmit(hookParams, submitResult)
        } else {
          const id = _.get(submitResult, 'id') || _.get(data, 'id');
          if (id) {
            this.$router.push({ name: `${this.resource}.show`, params: { id } });
          }
        }
      }
    } finally {
      this.formLoading = false;
    }
  }

  async handleBeforeExport(body) {
    this.$refs.tablePage.handleAutoFilter();
    await this.$nextTick();
    return {
      ...body,
      params: {
        ...body.params,
        ...this.$route.query,
        page: undefined
      }
    }
  }

  handleTableToExcel() {
    this.$refs.tablePage.tableToExcel(this.pageTitle);
  }
}
</script>
