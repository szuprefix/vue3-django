// Migrated from the original dashboard's views/course/course/config.js.
export default {
  form: {
    items: [
      'name',
      'code',
      'is_active',
      'category',
      { name: 'description', widget: 'textarea', span: 12 },
      { name: 'outline', widget: 'textarea', span: 12 },
    ],
  },
  list: {
    items: ['name', 'category', 'description', 'create_time'],
    rowActions: [{ name: 'get_outline_url', title: '试题分纲', permission: 'outline_question' }],
  },
  batch: { items: ['name', 'code', 'category'] },
  relations: ['school.classcourse', 'exam.paper', 'exam.exam', 'media.video', 'course.pass'],
}
