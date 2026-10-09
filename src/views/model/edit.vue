<script setup>
import { computed, onBeforeUnmount, ref, shallowRef, useSlots, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElAlert, ElCollapse, ElCollapseItem } from 'element-plus'
import ModelForm from '../../components/model/Form.vue'
import ModelRelations from '../../components/model/Relations.vue'
import { useDjango } from '../../composables/context.js'

defineOptions({ inheritAttrs: false })
const props = defineProps({ appModel: String, id: [Number, String], mode: String })
const emit = defineEmits(['loaded', 'form-posted', 'error'])
const slots = useSlots()
const forwardedSlots = computed(() => Object.keys(slots).filter((name) => name !== 'bottom'))
const route = useRoute()
const router = useRouter()
const { registry, revisions, store } = useDjango()
const appModel = computed(() => props.appModel ?? route.path.split('/').slice(1, 3).join('.'))
const id = computed(() => (props.mode === 'create' ? undefined : (props.id ?? route.params.id)))
const data = ref({})
const views = shallowRef()
const error = ref('')
const form = ref()
const activePanels = ref([0])
const parent = computed(() => ({
  ...registry.get(appModel.value),
  id: data.value[registry.getConfig(appModel.value).idField ?? 'id'] ?? id.value,
  data: data.value,
  viewsConfig: views.value,
}))
const panels = computed(() => views.value?.panels ?? views.value?.pannels ?? [])
const persisted = computed(() => parent.value.id != null)
let generation = 0
watch(
  () => [appModel.value, id.value],
  async () => {
    const current = ++generation
    data.value = {}
    views.value = undefined
    error.value = ''
    activePanels.value = [0]
    try {
      const config = await registry.get(appModel.value).loadViewsConfig()
      if (current === generation) views.value = config
    } catch (cause) {
      if (current === generation) {
        error.value = cause.message
        emit('error', cause)
      }
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => generation++)
async function posted(event) {
  if (store) store.invalidate(appModel.value)
  else if (revisions) revisions[appModel.value] = (revisions[appModel.value] ?? 0) + 1
  emit('form-posted', event)
  const key = registry.getConfig(appModel.value).idField ?? 'id'
  if (event.intent === 'saveAndAnother') {
    const wasCreating = id.value == null
    data.value = {}
    await router.replace(`/${appModel.value.replace('.', '/')}/add/`)
    if (wasCreating) await form.value?.load()
  } else if (id.value == null && event.data[key] != null) {
    await router.replace(
      `/${appModel.value.replace('.', '/')}/${encodeURIComponent(event.data[key])}/`,
    )
  }
}
function editRelation({ appModel: name, row }) {
  const key = registry.getConfig(name).idField ?? 'id'
  return router.push(`/${name.replace('.', '/')}/${encodeURIComponent(row[key])}/`)
}
defineExpose({ submit: () => form.value?.submit(), load: () => form.value?.load(), data })
</script>

<template>
  <ElAlert
    v-if="error"
    :title="error"
    type="error"
    :closable="false"
  />
  <ModelForm
    v-else
    class="vd-model-page"
    ref="form"
    v-model="data"
    v-bind="$attrs"
    :app-model="appModel"
    :id="id"
    @form-posted="posted"
    @loaded="emit('loaded', $event)"
    @error="emit('error', $event)"
  >
    <template
      v-for="name in forwardedSlots"
      #[name]="scope"
    >
      <slot
        :name="name"
        v-bind="scope || {}"
      />
    </template>
    <template #bottom>
      <template v-if="persisted && views">
        <ElCollapse
          v-if="panels.length"
          v-model="activePanels"
        >
          <ElCollapseItem
            v-for="(panel, index) in panels"
            :key="panel.name ?? index"
            :name="index"
            :title="panel.label ?? panel.title"
          >
            <component
              :is="panel.component"
              v-bind="panel"
              :parent="parent"
            />
          </ElCollapseItem>
        </ElCollapse>
        <ModelRelations
          :parent="parent"
          @parent-updated="data = $event"
          @edit="editRelation"
          @error="emit('error', $event)"
        />
      </template>
      <slot
        name="bottom"
        :model="parent"
        :data="data"
      />
    </template>
  </ModelForm>
</template>
