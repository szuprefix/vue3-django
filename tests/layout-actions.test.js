import { expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import Actions from '../src/components/layout/Actions.vue'
import Drawer from '../src/components/layout/Drawer.vue'
import { DrawerKey, createDrawerViewLoader } from '../src/composables/drawer.js'

it('Actions 支持 map、权限、动态 context 与仅有 dropdown 的配置', async () => {
  const run = vi.fn().mockResolvedValue(0)
  const wrapper = mount(Actions, {
    props: {
      items: [['run', 'hidden']],
      map: { run: { title: '执行', do: run }, hidden: { permission: 'deny' } },
      context: () => ({ id: 1 }),
      permissionFunction: () => false,
    },
  })
  expect(wrapper.text()).toContain('更多')
  await wrapper.vm.handleCommand({ name: 'run', do: run })
  expect(run).toHaveBeenCalledWith({ id: 1 })
  expect(wrapper.emitted('done')[0][0]).toBe(0)
  expect(wrapper.vm.loadingMap.run).toBe(false)
  wrapper.unmount()
})

it('Actions 防止重复执行、释放失败状态、支持取消与抽屉回调', async () => {
  let resolve
  const run = vi.fn(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const open = vi.fn().mockResolvedValue(undefined)
  const wrapper = mount(Actions, { global: { provide: { [DrawerKey]: { open } } } })
  const pending = wrapper.vm.handleCommand({ name: 'run', do: run })
  await wrapper.vm.handleCommand({ name: 'run', do: run })
  expect(run).toHaveBeenCalledTimes(1)
  resolve('ok')
  await pending
  await wrapper.vm.handleCommand({ name: 'cancel', confirm: () => false, do: run })
  expect(run).toHaveBeenCalledTimes(1)
  await wrapper.vm.handleCommand({ name: 'bad', do: () => Promise.reject(new Error('failed')) })
  expect(wrapper.vm.loadingMap.bad).toBe(false)
  expect(wrapper.emitted('error')[0][0].message).toBe('failed')
  await wrapper.vm.handleCommand({ name: 'edit', do: 'course/edit', drawer: { size: '50%' } })
  expect(open.mock.calls[0][0].component).toBe('course/edit')
  await open.mock.calls[0][0].onDone({ id: 2 })
  expect(wrapper.emitted('done').at(-1)[0]).toEqual({ id: 2 })
  wrapper.unmount()
})

it('Drawer 过滤 $ context，异步加载竞态不覆盖新抽屉，done 只调用当前回调', async () => {
  let resolve
  const loader = vi.fn(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const child = defineComponent({
    props: ['id'],
    template: '<button @click="$emit(\'done\', id)">完成</button>',
  })
  const done = vi.fn()
  const wrapper = mount(Drawer, {
    props: { loadView: loader },
    global: {
      stubs: {
        ElDrawer: { props: ['modelValue'], template: '<div v-if="modelValue"><slot /></div>' },
      },
    },
  })
  const pending = wrapper.vm.open({ component: 'old' })
  await wrapper.vm.open({ component: child, context: { id: 2, $private: true }, onDone: done })
  resolve({ default: child })
  await pending
  await flushPromises()
  expect(wrapper.find('button').attributes('$private')).toBeUndefined()
  await wrapper.find('button').trigger('click')
  expect(done).toHaveBeenCalledWith(2)
  wrapper.unmount()
})

it('抽屉视图加载器限定宿主 glob 路径', async () => {
  const component = {}
  const load = createDrawerViewLoader({
    './views/course/edit.vue': async () => ({ default: component }),
  })
  expect(await load('course/edit')).toBe(component)
  await expect(load('../private')).rejects.toThrow('路径无效')
  await expect(load('missing')).rejects.toThrow('未找到')
})
