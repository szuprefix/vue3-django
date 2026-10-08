<script setup>
import { computed, toRaw } from 'vue'
import DOMPurify from 'dompurify'
import { ElImage, ElAvatar, ElTag } from 'element-plus'
import ForeignKey from '../widgets/ForeignKey.vue'
import VideoCover from '../media/VideoCover.vue'
import FormField from '../form/Field.vue'
import {
  fieldValue,
  safeUrl,
  tableDate,
  tableRelativeDate,
  tableDisplay,
} from '../../core/table.js'

const props = defineProps({
  value: { type: Object, required: true },
  field: { type: Object, required: true },
  context: { type: Object, default: () => ({}) },
  mobile: Boolean,
})
const emit = defineEmits(['change'])
const raw = computed(() => fieldValue(props.value, props.field.name))
const display = computed(() => tableDisplay(props.field, props.value))
const widget = computed(() => {
  const configured = toRaw(props.field.cellWidget ?? props.field.widget)
  return typeof configured === 'string' &&
    configured.replace(/[-_ ]/g, '').toLowerCase() === 'videocover'
    ? VideoCover
    : configured
})
const kind = computed(() => (typeof widget.value === 'string' ? widget.value.toLowerCase() : ''))
const context = computed(() => ({ row: props.value, ...props.context }))
const html = computed(() =>
  DOMPurify.sanitize(
    String(
      typeof widget.value === 'function'
        ? widget.value(props.value, props.field)
        : (display.value ?? ''),
    ),
  ),
)
const dateOnly = computed(
  () => kind.value === 'date' || (!widget.value && props.field.type === 'date'),
)
const date = computed(() => tableDate(raw.value, kind.value === 'timestamp', dateOnly.value))
const dateLabel = computed(() =>
  dateOnly.value ? date.value : tableRelativeDate(raw.value, kind.value === 'timestamp'),
)
const images = computed(() =>
  (Array.isArray(raw.value) ? raw.value : [raw.value])
    .map((value) =>
      safeUrl(`${props.field.proxy ?? ''}${props.field.imageRoot ?? ''}${value ?? ''}`),
    )
    .filter(Boolean),
)
const jsonItems = computed(() =>
  (props.field.items ?? Object.keys(raw.value ?? {})).map((item) =>
    typeof item === 'string' ? { name: item } : item,
  ),
)
</script>

<template>
  <FormField
    v-if="field.useFormWidget"
    :field="{ ...field, read_only: false }"
    :model-value="raw"
    :mobile="mobile"
    @update:model-value="emit('change', $event)"
  />
  <component
    :is="widget"
    v-else-if="widget && typeof widget === 'object'"
    :value="value"
    :model-value="value"
    :field="field"
    :context="context"
    @update:model-value="emit('change', $event)"
  />
  <span
    v-else-if="typeof widget === 'function' || kind === 'html'"
    v-html="html"
  />
  <ForeignKey
    v-else-if="
      kind === 'foreignkey' || (!widget && !field.formatter && (field.model || field.relateModel))
    "
    :value="value"
    :field="field"
    :context="context"
  />
  <span v-else-if="raw == null || raw === ''">{{ display }}</span>
  <span
    v-else-if="kind === 'trueflag' || (!widget && !field.formatter && field.type === 'boolean')"
    :class="['vd-table-boolean', { 'is-true': raw }]"
    :aria-label="raw ? '是' : '否'"
    :title="raw ? '是' : '否'"
  >
    {{ raw ? '✓' : '—' }}
  </span>
  <span
    v-else-if="
      ['date2now', 'timestamp', 'date', 'datetime'].includes(kind) ||
      (!widget && !field.formatter && ['date', 'datetime'].includes(field.type))
    "
    :title="date"
  >
    {{ dateLabel }}
  </span>
  <ElAvatar
    v-else-if="kind === 'avatar'"
    :src="images[0]"
    :size="field.size ?? 40"
  />
  <div
    v-else-if="['picture', 'image', 'picturegallery'].includes(kind)"
    class="vd-table-images"
  >
    <ElImage
      v-for="url in images"
      :key="url"
      :src="url"
      :preview-src-list="images"
      preview-teleported
      fit="contain"
      :style="{ width: `${field.width ?? 64}px`, height: `${field.height ?? 48}px` }"
    >
      <template #error>图片无法加载</template>
    </ElImage>
  </div>
  <video
    v-else-if="kind === 'video'"
    :src="safeUrl(raw)"
    controls
    preload="none"
    class="vd-table-video"
  />
  <a
    v-else-if="
      ['url', 'link', 'mobile', 'email'].includes(kind) ||
      (!widget && ['url', 'email'].includes(field.type))
    "
    :href="
      safeUrl(
        kind === 'mobile'
          ? `tel:${raw}`
          : kind === 'email' || field.type === 'email'
            ? `mailto:${raw}`
            : raw,
      )
    "
    target="_blank"
    rel="noopener noreferrer"
  >
    {{ display }}
  </a>
  <dl
    v-else-if="kind === 'jsondisplay' && typeof raw === 'object'"
    class="vd-table-json"
  >
    <template
      v-for="item in jsonItems"
      :key="item.name"
    >
      <dt>{{ item.label ?? item.name }}</dt>
      <dd>
        <Widget
          :value="raw"
          :field="item"
          :context="context"
          :mobile="mobile"
        />
      </dd>
    </template>
  </dl>
  <ElTag
    v-else-if="kind === 'colortext'"
    :style="{ backgroundColor: field.getColor?.(context) ?? field.color }"
  >
    {{ display }}
  </ElTag>
  <span
    v-else
    class="vd-table-text"
    :title="kind === 'tooltipcell' ? String(display) : undefined"
  >
    {{ display }}
  </span>
</template>

<style scoped>
.vd-table-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.vd-table-boolean.is-true {
  color: var(--el-color-success, green);
  font-weight: bold;
}
.vd-table-images {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.vd-table-video {
  width: 180px;
  max-width: 100%;
}
.vd-table-json {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  margin: 0;
}
.vd-table-json dd {
  margin: 0;
}
</style>
