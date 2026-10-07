<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useDjango } from '../../composables/context.js'
import { safeUrl } from '../../core/table.js'

const props = defineProps({
  modelValue: [String, Array],
  field: { type: Object, default: () => ({}) },
  service: Object,
  images: Boolean,
  disabled: Boolean,
})
const emit = defineEmits(['update:modelValue', 'success', 'error', 'uploading'])
const { uploadService } = useDjango()
const jobs = ref([])
const input = ref()
const urls = ref([])
watch(
  () => props.modelValue,
  (value) => {
    urls.value = Array.isArray(value) ? [...value] : value ? [value] : []
  },
  { immediate: true, deep: true },
)
const multiple = computed(
  () => props.field.multiple ?? (Array.isArray(props.modelValue) || props.field.limit > 1),
)
const limit = computed(() => props.field.limit ?? (multiple.value ? 10 : 1))
const disabled = computed(() => props.disabled || props.field.disabled || props.field.read_only)
let alive = true
function update(values) {
  urls.value = values
  emit('update:modelValue', multiple.value ? values : (values[0] ?? null))
}
function busy() {
  emit(
    'uploading',
    jobs.value.some((job) => job.status === 'uploading'),
  )
}
async function run(job) {
  job.controller = new AbortController()
  job.status = 'uploading'
  job.error = ''
  job.progress = 0
  busy()
  try {
    const service = props.service ?? props.field.uploadService ?? uploadService
    if (!service) throw new Error('请配置 uploadService')
    const result = await service.upload(job.file, {
      purpose: props.field.purpose ?? (props.images ? 'image' : 'file'),
      context: props.field.uploadContext ?? {},
      signal: job.controller.signal,
      onProgress: (value) => {
        job.progress = value
      },
    })
    if (!alive || job.controller.signal.aborted) return
    if (!result?.url) throw new Error('上传未返回稳定 URL')
    update([...urls.value, result.url])
    jobs.value = jobs.value.filter((item) => item.id !== job.id)
    emit('success', result)
    release(job)
  } catch (error) {
    if (!alive || job.controller.signal.aborted) return
    job.status = 'error'
    job.error = error.message
    emit('error', error)
  } finally {
    if (alive) busy()
  }
}
function release(job) {
  if (job.preview) URL.revokeObjectURL(job.preview)
}
function removeJob(job) {
  job.controller?.abort()
  jobs.value = jobs.value.filter((item) => item.id !== job.id)
  release(job)
  busy()
}
function choose(event) {
  for (const file of event.target.files) {
    if (urls.value.length + jobs.value.length >= limit.value) {
      emit('error', new Error(`最多上传 ${limit.value} 个文件`))
      break
    }
    if (
      (props.images && !file.type.startsWith('image/')) ||
      (props.field.maxSize && file.size > props.field.maxSize)
    ) {
      emit('error', new Error('文件类型或大小不符合限制'))
      continue
    }
    const job = {
      id: crypto.randomUUID(),
      file,
      preview: props.images ? URL.createObjectURL(file) : '',
      status: 'uploading',
    }
    jobs.value.push(job)
    // Use the reactive job to keep progress and error states visible.
    run(jobs.value.at(-1))
  }
  event.target.value = ''
}
onBeforeUnmount(() => {
  emit('uploading', false)
  alive = false
  for (const job of jobs.value) {
    job.controller?.abort()
    release(job)
  }
})
</script>

<template>
  <div
    class="vd-upload"
    :aria-label="field.label || '上传文件'"
  >
    <div
      v-for="(url, index) in urls"
      :key="`${index}:${url}`"
      class="vd-upload-item"
    >
      <img
        v-if="images"
        :src="safeUrl(url)"
        alt="已上传图片"
      />
      <a
        v-else
        :href="safeUrl(url)"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ url.split('/').at(-1) }}
      </a>
      <button
        v-if="!disabled"
        type="button"
        @click="update(urls.filter((_, i) => i !== index))"
      >
        移除
      </button>
    </div>
    <div
      v-for="job in jobs"
      :key="job.id"
      class="vd-upload-item"
    >
      <img
        v-if="job.preview"
        :src="job.preview"
        alt="上传预览"
      />
      <span>{{ job.file.name }}</span>
      <progress
        v-if="job.status === 'uploading'"
        :value="job.progress"
        max="100"
      />
      <span
        v-else
        role="alert"
      >
        {{ job.error }}
      </span>
      <button
        v-if="job.status === 'error' && !disabled"
        type="button"
        @click="run(job)"
      >
        重试
      </button>
      <button
        v-if="!disabled"
        type="button"
        @click="removeJob(job)"
      >
        取消
      </button>
    </div>
    <button
      v-if="!disabled && urls.length + jobs.length < limit"
      type="button"
      @click="input.click()"
    >
      {{ images ? '选择图片' : '选择文件' }}
    </button>
    <input
      ref="input"
      type="file"
      hidden
      :multiple="multiple"
      :disabled="disabled"
      :accept="field.accept ?? (images ? 'image/*' : undefined)"
      @change="choose"
    />
  </div>
</template>

<style scoped>
.vd-upload {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.vd-upload-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 100%;
}
.vd-upload-item img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}
.vd-upload-item a {
  overflow-wrap: anywhere;
}
.vd-upload button {
  cursor: pointer;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: white;
  padding: 5px 10px;
  color: #409eff;
}
</style>
