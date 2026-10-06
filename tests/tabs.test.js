import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { createRouter, createMemoryHistory, useRoute } from 'vue-router'
import ViewTabs from '../src/components/layout/ViewTabs.vue'

describe('旧版 ViewTabs 迁移', () => {
  it('路径去重、保留状态和查询、关闭释放实例，登录不进入 tabs', async () => {
    const Page = defineComponent({
      setup() {
        return { value: ref(''), route: useRoute() }
      },
      template: '<div><input v-model="value"><span>{{ route.fullPath }}</span></div>',
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/a', component: Page, meta: { title: '页面 A' } },
        { path: '/b', component: Page, meta: { title: '页面 B' } },
        { path: '/login', component: Page, meta: { layout: 'main' } },
      ],
    })
    await router.push('/a?q=1')
    const wrapper = mount(ViewTabs, { global: { plugins: [router] } })
    await flushPromises()
    await wrapper.find('input').setValue('保留状态')
    await router.push('/b')
    await flushPromises()
    expect(wrapper.vm.tabs).toHaveLength(2)
    await router.push('/a?q=2')
    await flushPromises()
    expect(wrapper.vm.tabs).toHaveLength(2)
    expect(wrapper.find('input').element.value).toBe('保留状态')
    expect(wrapper.text()).toContain('/a?q=2')
    await wrapper.vm.tabRemove('/a')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/b')
    expect(wrapper.vm.tabs).toHaveLength(1)
    await router.push('/a')
    await flushPromises()
    expect(wrapper.findAll('input').at(-1).element.value).toBe('')
    await router.push('/login')
    await flushPromises()
    expect(wrapper.vm.tabs).toHaveLength(2)
    expect(wrapper.find('.el-tabs').exists()).toBe(false)
    wrapper.unmount()
  })
})
