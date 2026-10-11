<script setup>
import { computed, ref } from 'vue'
import { ElDialog, ElRadioGroup, ElRadioButton, ElInput, ElButton } from 'element-plus'
import DOMPurify from 'dompurify'
const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'done'])
const mode = ref('word'),
  source = ref(''),
  override = ref(null)
function convert(text, mode) {
  if (mode === 'html') {
    const node = document.createElement('div')
    node.innerHTML = DOMPurify.sanitize(text)
    for (const [tag, name] of [
      ['u', '划'],
      ['sup', '上'],
      ['sub', '下'],
    ])
      node.querySelectorAll(tag).forEach((el) => el.replaceWith(`[${name}:${el.textContent}]`))
    node.querySelectorAll('img').forEach((el) => el.replaceWith(`[图:${el.getAttribute('src')}]`))
    node.querySelectorAll('table').forEach((el) => {
      const rows = [...el.querySelectorAll('tr')].map((row) =>
        [...row.querySelectorAll('td, th')]
          .map(
            (cell) =>
              `${cell.rowSpan > 1 || cell.colSpan > 1 ? `!r${cell.rowSpan}c${cell.colSpan}:` : ''}${cell.textContent.trim()}`,
          )
          .join(' ╎ '),
      )
      el.replaceWith(`\n[表:${rows.join('\n')}:表]\n`)
    })
    node.querySelectorAll('p, div, br, li, h1, h2, h3').forEach((el) => {
      el.prepend('\n')
      el.append('\n')
    })
    text = node.textContent
  }
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n\s*答[:：]/g, '\n答案:')
    .replace(/（([A-Z]+)）\s*\n/g, '\n答案:$1\n')
    .replace(/题解:\s*(\d+)-(\d+)/g, '题解: 第$1章-P$2')
    .replace(/（本大题共\d+小题，/g, '(')
    .replace(/，共\d+分[）}]?/g, ')')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
const result = computed(() => override.value ?? convert(source.value, mode.value))
function read(event) {
  const file = event.target.files?.[0]
  if (file)
    file.text().then((text) => {
      source.value = text
      override.value = null
    })
}
function confirm() {
  emit('done', result.value)
  emit('update:modelValue', false)
}
</script>
<template>
  <ElDialog
    :model-value="props.modelValue"
    title="转换器"
    width="80%"
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <ElRadioGroup
      v-model="mode"
      @change="override = null"
    >
      <ElRadioButton value="word">自考人Word文本</ElRadioButton>
      <ElRadioButton value="html">Word网页</ElRadioButton>
    </ElRadioGroup>
    <p v-if="mode === 'html'">
      上传 Word 另存为网页后的 HTML 文件，或粘贴 HTML 内容。图片资源需使用可访问的 URL。
    </p>
    <input
      v-if="mode === 'html'"
      type="file"
      accept=".html,.htm,text/html"
      aria-label="读取Word网页"
      @change="read"
    />
    <div class="transform-columns">
      <div>
        原始内容：
        <ElInput
          v-model="source"
          type="textarea"
          :rows="18"
          placeholder="请粘贴Word试卷文本或HTML"
          @input="override = null"
        />
      </div>
      <div>
        转换结果：
        <ElInput
          :model-value="result"
          type="textarea"
          :rows="18"
          @update:model-value="override = $event"
        />
      </div>
    </div>
    <template #footer>
      <ElButton @click="emit('update:modelValue', false)">取消</ElButton>
      <ElButton
        type="primary"
        :disabled="!result"
        @click="confirm"
      >
        确定
      </ElButton>
    </template>
  </ElDialog>
</template>
<style scoped>
.transform-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 16px;
}
@media (max-width: 700px) {
  .transform-columns {
    grid-template-columns: 1fr;
  }
}
</style>
