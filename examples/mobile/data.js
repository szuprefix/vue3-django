// Independent mobile demonstration data; never connects to the dashboard backend.
const tasks = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: `任务 ${index + 1}`,
  done: false,
}))

export async function queryTasks({ page = 1, page_size = 5 } = {}) {
  return {
    count: tasks.length,
    results: tasks.slice((page - 1) * page_size, page * page_size).map((task) => ({ ...task })),
  }
}

export async function createTask(value) {
  const name = value.name.trim()
  if (!name) throw new Error('请输入任务名称')
  const task = { id: tasks.length + 1, name, done: Boolean(value.done) }
  tasks.unshift(task)
  return { ...task }
}
