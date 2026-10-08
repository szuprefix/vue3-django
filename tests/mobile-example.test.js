import { expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../examples/mobile/App.vue'
import { createMobileRouter } from '../examples/mobile/router.js'
import { createTask, queryTasks } from '../examples/mobile/data.js'

it('mobile 示例有独立导航，列表与新增页不使用后台布局', async () => {
  const router = createMobileRouter(createMemoryHistory())
  await router.push('/')
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  expect(wrapper.find('.van-nav-bar').exists()).toBe(true)
  expect(wrapper.find('.van-tabbar').exists()).toBe(true)
  expect(wrapper.text()).toContain('任务 1')
  expect(wrapper.find('.django-layout').exists()).toBe(false)
  await router.push('/new/')
  await flushPromises()
  expect(wrapper.find('.van-form').exists()).toBe(true)
  expect(wrapper.find('.el-form').exists()).toBe(false)
  wrapper.unmount()
})

it('mobile 数据独立支持创建与分页', async () => {
  const before = await queryTasks()
  const created = await createTask({ name: '移动测试任务' })
  const result = await queryTasks({ page: 1, page_size: 1 })
  expect(result.count).toBe(before.count + 1)
  expect(result.results[0]).toEqual(created)
})
