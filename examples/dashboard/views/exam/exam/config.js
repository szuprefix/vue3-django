// Keep backend OPTIONS as the field source; no assumptions about optional fields.

import GenericForeignKey from 'vue3-django/src/components/generic/ForeignKey.vue'

export default {
  list: {
    items: [
      'name',
      'begin_time',
      'minutes',
      'end_time',
      'is_active',
      'manual_grade',
      'target_user_tags',
      'target_user_count',
      'actual_user_count',
      {
        name: 'owner_type',
        label: '属主',
        widget: GenericForeignKey,
        objectIdField: 'owner_id',
        contentTypeIdField: 'owner_type'
      },
    ],
    batchActions: [
      {name: 'batch_active', label: '激活', notice: '激活后考试重新展示.'},
      {
        name: 'batch_unactive',
        api: 'batch_active',
        context: {is_active: false},
        label: '禁用',
        notice: '禁用后考试不再展示.'
      }
    ],
    rowActions: [{name: 'get_grade_url', title: '阅卷', permission: 'get_grade_token'}]
  },
  form: {
    items: [
      'name',
      'is_active',
      'begin_time',
      'minutes',
      'end_time',
      {name: 'target_user_tags', span: 24},
      'manual_grade',
      {name: 'target_user_count', widget: 'readonly'},
      {name: 'actual_user_count', widget: 'readonly'},
      {
        name: 'owner_id',
        label: '属主',
        widget: GenericForeignKey,
        objectIdField: 'owner_id',
        contentTypeIdField: 'owner_type'
      },
    ]
  },
  relations: ['exam.paper', {name: 'exam.exam', label: '成绩', icon: 'star', view: 'performance'}]
}
