import { expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, markRaw, reactive } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import List from '../src/views/model/list.vue'
import Edit from '../src/views/model/edit.vue'
import { DjangoKey } from '../src/composables/context.js'

async function setup(component, { config = {}, props = {}, stubs = {} } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/demo/project/:id?', component: { template: '<div />' } }],
  })
  await router.push('/demo/project/7')
  const revisions = reactive({})
  const model = {
    appModel: 'demo.project',
    config: { idField: 'pk' },
    loadViewsConfig: vi.fn().mockResolvedValue(config),
  }
  const wrapper = mount(component, {
    props: { appModel: 'demo.project', ...props },
    global: {
      plugins: [router],
      provide: {
        [DjangoKey]: { registry: { get: () => model, getConfig: () => model.config }, revisions },
      },
      stubs: { ModelTable: true, ModelForm: true, ModelRelations: true, ...stubs },
    },
  })
  await flushPromises()
  return { wrapper, router, revisions }
}

it('列表页传递 list 配置，编辑以自定义主键打开新路径，修订后刷新', async () => {
  const refresh = vi.fn()
  const table = defineComponent({
    name: 'ModelTable',
    props: ['baseQueries', 'appModel'],
    setup(_, { expose }) {
      expose({ refresh })
      return () => null
    },
  })
  const { wrapper, router, revisions } = await setup(List, {
    config: { list: { baseQueries: { active: true }, topActions: [] } },
    stubs: { ModelTable: table },
  })
  const child = wrapper.findComponent(table)
  expect(child.props('baseQueries')).toEqual({ active: true })
  child.vm.$emit('edit', { pk: 9 })
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/demo/project/9/')
  revisions['demo.project'] = 1
  await flushPromises()
  expect(refresh).toHaveBeenCalledOnce()
  wrapper.unmount()
})

it('grid 模式允许宿主提供专用组件', async () => {
  const grid = markRaw(defineComponent({ template: '<div>自定义网格</div>' }))
  const { wrapper } = await setup(List, {
    config: { list: { mode: 'grid' } },
    props: { gridComponent: grid },
  })
  expect(wrapper.text()).toContain('自定义网格')
  wrapper.unmount()
})

it('编辑页在 bottom 显示旧 pannels 与关联，父模型使用真实数据', async () => {
  const form = defineComponent({
    name: 'ModelForm',
    props: ['modelValue', 'id'],
    template: '<div><slot name="bottom" /></div>',
  })
  const panel = defineComponent({
    props: ['parent'],
    template: '<div class="panel">{{ parent.data.name }}</div>',
  })
  const { wrapper } = await setup(Edit, {
    config: { pannels: [{ name: 'extra', label: '扩展', component: panel }], relations: [] },
    props: { id: 7 },
    stubs: { ModelForm: form },
  })
  wrapper.findComponent(form).vm.$emit('update:modelValue', { pk: 7, name: '项目' })
  await flushPromises()
  expect(wrapper.find('.panel').text()).toBe('项目')
  expect(wrapper.findComponent({ name: 'ModelRelations' }).props('parent').id).toBe(7)
  wrapper.unmount()
})

it('新增页不显示关联，保存后按主键替换编辑路径并更新修订', async () => {
  const { wrapper, router, revisions } = await setup(Edit, { props: { mode: 'create' } })
  expect(wrapper.findComponent({ name: 'ModelRelations' }).exists()).toBe(false)
  wrapper
    .findComponent({ name: 'ModelForm' })
    .vm.$emit('form-posted', { data: { pk: 11 }, intent: 'save' })
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/demo/project/11/')
  expect(revisions['demo.project']).toBe(1)
  wrapper.unmount()
})
