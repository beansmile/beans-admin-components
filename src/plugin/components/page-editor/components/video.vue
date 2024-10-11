<template>
  <div class="c-video">
    <template v-for="(item, index) in value.data">
      <video
        v-if="item.src"
        :key="index"
        class="video"
        :style="videoStyle"
        :src="item.src"
        :controls="value.config.controls"
        :muted="value.config.muted"
        :autoplay="value.config.autoplay"
        :loop="value.config.loop"
      />
    </template>

    <ControlBox :title="$t('pageEditor.视频')" :visible="showController" @close="$emit('close')">
      <el-form @submit.native.prevent label-position="left" label-width="auto">
        <el-form-item :label="$t('pageEditor.视频')">
          <c-upload-form-item
            :limit="1"
            accept="video/*"
            :size="1000"
            type="video"
            :value="$get(value, 'data[0].src')"
            @change="handleSubmit"
          />
        </el-form-item>
        <el-form-item :label="$t('pageEditor.视频高度')">
          <el-input-number v-model="value.config.height" @change="syncChange" />
        </el-form-item>
        <el-form-item :label="$t('pageEditor.视频左边间距')">
          <el-input-number v-model="value.config.paddingLeft" @change="syncChange" />
        </el-form-item>
        <el-form-item :label="$t('pageEditor.视频右边边间距')">
          <el-input-number v-model="value.config.paddingRight" @change="syncChange" />
        </el-form-item>
        <el-form-item :label="$t('pageEditor.视频的表现形式')">
          <el-select v-model="value.config.objectFit" @change="syncChange">
            <el-option
              v-for="option in objectFitOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('pageEditor.是否显示播放控件')">
          <el-switch v-model="value.config.controls" @change="syncChange" />
        </el-form-item>
        <el-form-item :label="$t('pageEditor.是否自动播放')">
          <el-switch v-model="value.config.autoplay" @change="syncChange" />
        </el-form-item>
        <el-form-item :label="$t('pageEditor.是否循环播放')">
          <el-switch v-model="value.config.loop" @change="syncChange" />
        </el-form-item>
        <el-form-item :label="$t('pageEditor.是否静音播放')">
          <el-switch v-model="value.config.muted" @change="syncChange" />
        </el-form-item>
      </el-form>
    </ControlBox>
  </div>
</template>

<script>
  import { Vue, Component, Model, Prop } from 'vue-property-decorator';
  import ControlBox from '../control-box';

  @Component({
    components: {
      ControlBox
    }
  })
  export default class CVideo extends Vue {
    @Model('change', { type: Object, default: () => ({
      data: [
        {
          src: ''
        }
      ],
      config: {
        height: 230,
        controls: true,
        autoplay: false,
        loop: true,
        muted: false,
        objectFit: 'contain',
        paddingLeft: 0,
        paddingRight: 0,
      }
    }) }) value;
    @Prop(Boolean) showController;

    get objectFitOptions() {
      return [
        {
          label: this.$t('pageEditor.包含'),
          value: 'contain'
        },
        {
          label: this.$t('pageEditor.填充'),
          value: 'fill'
        },
        {
          label: this.$t('pageEditor.覆盖'),
          value: 'cover'
        }
      ]
    }

    get videoStyle() {
      const { height, objectFit, paddingLeft, paddingRight } = this.value.config;
      return {
        height: height + 'px',
        objectFit,
        paddingLeft: paddingLeft + 'px',
        paddingRight: paddingRight + 'px',
      }
    }

    mounted() {
      this.syncChange();
    }

    syncChange() {
      this.$emit('change', this.value);
    }

    handleSubmit(src) {
      this.$set(this.value.data[0], 'src', src);
      this.syncChange();
    }
  }
</script>

<style lang="scss" scoped>
  .video {
    box-sizing: border-box;
    width: 100%;
    vertical-align: top;
  }
</style>
