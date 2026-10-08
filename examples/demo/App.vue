<script setup>
import { ElMessage } from 'element-plus'
import { ModelListView, ModelEditView } from '../../src/index.js'
import { useDjango } from '../../src/composables/context.js'

defineProps({
  appModel: String,
  mode: { type: String, default: 'list' },
  id: [String, Number],
})
const { revisions } = useDjango()
function created(appModel) {
  revisions[appModel] = (revisions[appModel] ?? 0) + 1
  ElMessage.success('保存成功')
}
</script>

<template>
  <main class="demo-model-page">
    <ModelListView
      v-if="mode === 'list'"
      :app-model="appModel"
      @created="created(appModel)"
      @error="ElMessage.error($event.message)"
    />
    <ModelEditView
      v-else
      :app-model="appModel"
      :mode="mode"
      :id="id"
      @form-posted="ElMessage.success('保存成功')"
      @error="ElMessage.error($event.message)"
    />
  </main>
</template>

<style>
body {
  margin: 0;
  background: white;
  color: #253447;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}
</style>

<style scoped>
.demo-model-page {
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 0 4px 12px;
}
@media (max-width: 600px) {
  .demo-model-page {
    padding: 0 0 8px;
  }
}
</style>
