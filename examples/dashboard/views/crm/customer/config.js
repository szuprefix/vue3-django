export default {
  list: { items: ['id', 'name', 'status', 'budget', 'enabled'] },
  form: {
    items: ['name', { name: 'status', span: 12 }, { name: 'budget', span: 12 }, 'enabled'],
  },
  search: {},
  relations: [],
}
