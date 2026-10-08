export default {
  list: { items: ['id', 'name', 'code', 'create_time', 'update_time'] },
  form: { items: ['name', 'code'] },
  search: { name: { label: '类别名称' }, code: { label: '拼音缩写' } },
  relations: ['course.course:category=id'],
}
