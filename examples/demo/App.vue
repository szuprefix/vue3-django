<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElMessage } from 'element-plus'
import { ModelTable, ModelForm, ModelRelations } from '../../src/index.js'
import { useDjango } from '../../src/composables/context.js'
const props = defineProps({
  appModel: String,
  mode: { type: String, default: 'list' },
  id: [String, Number],
})
const router = useRouter(),
  route = useRoute(),
  { revisions } = useDjango()
const realApi = import.meta.env.VITE_REAL_API === 'true'
const appModel = computed(() => props.appModel)
const mobile = ref(false),
  table = ref()
const object = ref({})
const listPath = computed(() => `/${props.appModel.replace('.', '/')}/`)
function edit(row) {
  router.push({
    name: `${props.appModel.replace('.', '-')}-${row ? 'edit' : 'add'}`,
    params: row ? { id: row.id } : {},
  })
}
async function saved({ data }) {
  revisions[props.appModel] = (revisions[props.appModel] || 0) + 1
  ElMessage.success('保存成功')
  if (props.mode === 'create')
    await router.replace({
      name: `${props.appModel.replace('.', '-')}-edit`,
      params: { id: data.id },
    })
}
watch(
  () => revisions[props.appModel],
  () => table.value?.refresh(),
)
</script>
<template>
  <main class="demo-model-page">
    <!--    <header>-->
    <!--      <div>-->
    <!--        <span class="brand">vue3-django</span>-->
    <!--        <p>继承 Django Admin 的自动化思想，让业务配置驱动界面。</p>-->
    <!--      </div>-->
    <!--      <ElButton @click="mobile = !mobile">{{ mobile ? '切换桌面端' : '切换移动端' }}</ElButton>-->
    <!--    </header>-->
    <!--    <aside v-if="realApi">真实 API 测试 · Django http://127.0.0.1:8000 · {{ appModel }}</aside>-->
    <!--    <aside v-else>第一轮迭代 · 本地演示数据 · 刷新后重置 · 尚未连接实际后端</aside>-->
    <article :class="{ mobile }">
      <ModelTable
        v-if="mode === 'list'"
        ref="table"
        :app-model="appModel"
        :mobile="mobile"
        @created="saved"
        @edit="edit"
      />
      <template v-else>
        <h2>{{ route.meta.title }}{{ mode === 'edit' ? ` #${id}` : '' }}</h2>
        <ElButton @click="router.push(listPath)">返回列表</ElButton>
        <ModelForm
          :app-model="appModel"
          :id="mode === 'edit' ? id : undefined"
          :mobile="mobile"
          @update:model-value="object = $event"
          @form-posted="saved"
        />
        <ModelRelations
          v-if="mode === 'edit' && object.id != null"
          :parent="{ appModel, data: { ...object, id } }"
          @parent-updated="object = $event"
          :mobile="mobile"
          @edit="
            router.push({
              name: `${$event.appModel.replace('.', '-')}-edit`,
              params: { id: $event.row.id },
            })
          "
        />
      </template>
    </article>
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
article {
  background: white;
  padding: 0;
}
article.mobile {
  max-width: 430px;
  margin: auto;
  padding: 8px;
  background: #f7f8fa;
}
h2 {
  margin: 0 0 8px;
  font-size: 16px;
}
article > .el-button {
  margin-bottom: 12px;
}
@media (max-width: 600px) {
  .demo-model-page {
    padding: 0 0 8px;
  }
}
</style>
