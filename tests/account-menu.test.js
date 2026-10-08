import { expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ElDropdown, ElDropdownItem, ElMessageBox } from 'element-plus'
import Layout from '../src/components/layout/Layout.vue'

async function setup(passwordRoute = false) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => null } },
      ...(passwordRoute
        ? [{ path: '/auth/change_password/', component: { render: () => null } }]
        : []),
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
  })
  await router.push('/')
  const wrapper = mount(Layout, {
    props: { user: { name: '深大继教院', username: 'admin' } },
    global: { plugins: [router], stubs: { SideBar: true, ViewTabs: true, Drawer: true } },
  })
  return { wrapper, router }
}

it('帐号区仅显示名称与下拉入口，未注册密码页面时禁用菜单项', async () => {
  const { wrapper } = await setup()
  expect(wrapper.find('.account-name').text()).toBe('深大继教院')
  expect(wrapper.find('.account-trigger').attributes('aria-label')).toContain('帐号菜单')
  expect(wrapper.findAll('button').some((button) => button.text() === '退出登录')).toBe(false)
  const password = wrapper
    .findAllComponents(ElDropdownItem)
    .find((item) => item.props('command') === 'password')
  expect(password.props('disabled')).toBe(true)
  wrapper.unmount()
})

it('退出确认后才发送事件，取消不退出，修改密码使用宿主路由', async () => {
  const confirm = vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue('cancel')
  const { wrapper, router } = await setup(true)
  const dropdown = wrapper.findComponent(ElDropdown)
  dropdown.vm.$emit('command', 'logout')
  await flushPromises()
  expect(wrapper.emitted('logout')).toBeUndefined()
  confirm.mockResolvedValue('confirm')
  dropdown.vm.$emit('command', 'logout')
  await flushPromises()
  expect(wrapper.emitted('logout')).toHaveLength(1)
  dropdown.vm.$emit('command', 'password')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/auth/change_password/')
  wrapper.unmount()
  confirm.mockRestore()
})
