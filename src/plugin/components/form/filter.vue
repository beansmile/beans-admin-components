<template>
  <AdminForm
    :value="value"
    :columns="selectedColumns"
    v-bind="{ inline: true, ...$attrs }"
    @submit="handleFilter"
    @change="$emit('change', $event)"
  >
    <template v-slot:action>
      <el-form-item>
        <el-button type="primary" native-type="submit">{{ $t('bean.actionFilter') }}</el-button>
        <el-button @click="$emit('reset')">{{ $t('bean.actionReset') }}</el-button>
        <ColumnSetting
          v-if="showColumnSetting"
          :columns="columns"
          v-model="selectedFilterColumnProps"
        />
      </el-form-item>
    </template>
  </AdminForm>
</template>

<script>
import { Vue, Component, Prop, Emit, Model } from 'vue-property-decorator';
import _ from 'lodash';
import AdminForm from './index';
import ColumnSetting from '../column-setting.vue';

@Component({
  components: {
    AdminForm,
    ColumnSetting,
  }
})
export default class AdminFilter extends Vue {
  @Prop({ type: Array, default: () => [] }) columns;
  @Model('change', { type: Object, default: () => ({}) }) value;
  @Prop(Boolean) showColumnSetting;
  @Prop({ type: String, default: 'filter' }) columnSettingKey;

  selectedFilterColumnProps = [];

  get SELECTED_COLUMN_PROPS_STORAGE_KEY() {
    return `${location.hostname}_${location.pathname}_admin-${this.columnSettingKey}-selected-column-props`;
  }

  get selectedColumns() {
    if (this.showColumnSetting) {
      if (this.selectedFilterColumnProps.length) {
        return _.filter(this.columns, column => {
          return _.includes(this.selectedFilterColumnProps, column.prop);
        })
      }
    }
    return this.columns;
  }

  created() {
    try {
      this.selectedFilterColumnProps = JSON.parse(localStorage.getItem(this.SELECTED_COLUMN_PROPS_STORAGE_KEY)) || [];
    // eslint-disable-next-line no-empty
    } catch (e) {}
  }

  beforeDestroy() {
    localStorage.setItem(this.SELECTED_COLUMN_PROPS_STORAGE_KEY, JSON.stringify(this.selectedFilterColumnProps));
  }

  getPureForm() {
    return JSON.parse(JSON.stringify(this.value));
  }

  @Emit('filter')
  handleFilter(data) {
    return data;
  }
}
</script>
