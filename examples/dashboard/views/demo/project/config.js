export default {
  list: {
    items: ['id', 'name', 'status', 'budget', 'enabled'],
    rowActions: [{ name: 'pause', label: '暂停', api: 'pause' }],
  },
  form: { items: ['name', 'status', 'budget', 'enabled'] },
  batch: { items: ['status', 'enabled'] },
  relations: [],
}
