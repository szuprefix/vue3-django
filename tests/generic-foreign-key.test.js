import { it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import ForeignKey from '../src/components/generic/ForeignKey.vue'
import Widget from '../src/components/table/Widget.vue'
import { DjangoKey } from '../src/composables/context.js'
import { loadContentTypes } from '../src/core/content-types.js'

function fixture() {
  const get = vi
    .fn()
    .mockResolvedValue({ data: { results: [{ id: 4, app_label: 'school', model: 'teacher' }] } })
  const registry = {
    http: { get },
    configs: { 'school.teacher': { verbose_name: '老师' } },
    get: () => ({ getListUrl: () => 'contenttypes/contenttype/' }),
  }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/school/teacher/:id/',
        name: 'school-teacher-edit',
        component: { template: '<div />' },
      },
    ],
  })
  return {
    registry,
    router,
    get,
    global: { plugins: [router], provide: { [DjangoKey]: { registry } } },
  }
}

it('通用外键映射模型，支持原版 context 和自定义字段，点击打开模型路由', async () => {
  const setup = fixture()
  await setup.router.push('/')
  const wrapper = mount(ForeignKey, {
    props: {
      value: '属主',
      field: { name: 'owner', contentTypeIdField: 'owner_type', objectIdField: 'owner_id' },
      context: { owner_type: 4, owner_id: 0 },
    },
    global: setup.global,
  })
  await flushPromises()
  expect(wrapper.text()).toBe('老师:0')
  expect(wrapper.find('a').attributes('href')).toBe('/school/teacher/0/')
  await wrapper.find('a').trigger('click')
  await flushPromises()
  expect(setup.router.currentRoute.value.params.id).toBe('0')
  await wrapper.setProps({ context: { owner_type: 999, owner: '未知属主', owner_id: 1 } })
  expect(wrapper.find('a').exists()).toBe(false)
  expect(wrapper.text()).toBe('未知属主')
  expect(setup.get).toHaveBeenCalledTimes(1)
  wrapper.unmount()
})

it('表格字符串 widget 支持 context.row，未配置路由与未注册模型安全回退', async () => {
  const setup = fixture()
  const wrapper = mount(Widget, {
    props: {
      value: { content_type: 4, object_id: 8 },
      field: { name: 'object_id', widget: 'GenericForeignKey' },
    },
    global: setup.global,
  })
  await flushPromises()
  expect(wrapper.text()).toBe('老师:8')
  expect(wrapper.find('a').exists()).toBe(true)
  setup.router.removeRoute('school-teacher-edit')
  await wrapper.setProps({ value: { content_type: 4, object_id: 9 } })
  expect(wrapper.find('a').exists()).toBe(false)
  wrapper.unmount()
  const plain = mount(ForeignKey, {
    props: { value: { content_type: 4, object_id: 8 }, field: { name: 'object_id' } },
    global: { provide: { [DjangoKey]: { registry: setup.registry } } },
  })
  await flushPromises()
  expect(plain.text()).toBe('老师:8')
  expect(plain.find('a').exists()).toBe(false)
  plain.unmount()
})

it('映射按 registry 缓存并合并分页，失败后可以重新加载', async () => {
  const setup = fixture()
  setup.get.mockRejectedValueOnce(new Error('offline'))
  await expect(loadContentTypes(setup.registry)).rejects.toThrow('offline')
  setup.get.mockResolvedValueOnce({
    data: {
      results: [{ id: 4, app_label: 'school', model: 'teacher' }],
      next: 'contenttypes/contenttype/all/?page=2',
    },
  })
  setup.get.mockResolvedValueOnce({
    data: { results: [{ id: 5, app_label: 'course', model: 'course' }] },
  })
  const [a, b] = await Promise.all([
    loadContentTypes(setup.registry),
    loadContentTypes(setup.registry),
  ])
  expect(a).toEqual({ 4: 'school.teacher', 5: 'course.course' })
  expect(a).toBe(b)
  expect(setup.get).toHaveBeenCalledTimes(3)
})
