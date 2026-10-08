// Keep backend OPTIONS as the field source; no assumptions about optional fields.
export default {
  list: { items: ['title','is_active', 'tags', 'create_time'] },
  form: { items: 'all' },
  search: {},
  relations: [],
}
