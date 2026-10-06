<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElMessage } from 'element-plus'
import { ModelTable, ModelForm } from '../../src/index.js'
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
  <main>
    <header>
      <div>
        <span class="brand">vue3-django</span>
        <p>继承 Django Admin 的自动化思想，让业务配置驱动界面。</p>
      </div>
      <ElButton @click="mobile = !mobile">{{ mobile ? '切换桌面端' : '切换移动端' }}</ElButton>
    </header>
    <aside v-if="realApi">真实 API 测试 · Django http://127.0.0.1:8000 · {{ appModel }}</aside>
    <aside v-else>第一轮迭代 · 本地演示数据 · 刷新后重置 · 尚未连接实际后端</aside>
    <article :class="{ mobile }">
      <ModelTable
        v-if="mode === 'list'"
        ref="table"
        :app-model="appModel"
        :mobile="mobile"
        @create="edit()"
        @edit="edit"
      />
      <template v-else
        ><h2>{{ route.meta.title }}{{ mode === 'edit' ? ` #${id}` : '' }}</h2>
        <ElButton @click="router.push(listPath)">返回列表</ElButton
        ><ModelForm
          :app-model="appModel"
          :id="mode === 'edit' ? id : undefined"
          :mobile="mobile"
          @form-posted="saved"
      /></template>
    </article>
    <footer>OPTIONS 元数据 → 模型注册 → 配置覆盖 → 桌面 / 移动组件</footer>
  </main>
</template>
<style>
body {
  margin: 0;
  background: #f4f7fa;
  color: #253447;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}
main {
  max-width: 1120px;
  margin: 40px auto;
  padding: 0 24px;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}
.brand {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -1px;
}
header p,
footer {
  color: #64748b;
  font-size: 14px;
}
aside {
  margin: 24px 0;
  padding: 12px 16px;
  border-left: 3px solid #409eff;
  background: #eaf3ff;
  font-size: 13px;
  color: #426181;
}
article {
  background: white;
  border: 1px solid #e5eaf0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 8px 30px #25344705;
}
article.mobile {
  max-width: 430px;
  margin: auto;
  padding: 16px;
  background: #f7f8fa;
}
footer {
  text-align: center;
  margin: 28px 0;
}
.popup-title {
  font-size: 18px;
  margin: 0 20px 20px;
}
@media (max-width: 600px) {
  main {
    margin: 24px auto;
    padding: 0 12px;
  }
  header {
    align-items: flex-start;
  }
  .brand {
    font-size: 24px;
  }
  article {
    padding: 12px;
  }
}
</style>
