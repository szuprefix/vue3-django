import AutoComplete from '../../../../../src/components/model/widgets/AutoComplete.vue'
import ContentEditor from './components/ContentEditor.vue'
import { Paper } from '../../../utils/paper.js'
import GenericForeignKey from '../../../../../src/components/generic/ForeignKey.vue'

export default {
  relations: ['comment.comment', 'exam.performance'],
  form: {
    items: [
      { name: 'title', span: 24 },
      'is_active',
      // 'is_break_through',
      {
        name: 'tags',
        widget: AutoComplete,
        url: '/exam/paper/stat/?measures=tags',
        prepare: (data) => {
          return data.tags
        },
      },
      'order_number',
      {
        name: 'owner_id',
        label: '属主',
        widget: GenericForeignKey,
        objectIdField: 'owner_id',
        contentTypeIdField: 'owner_type',
      },
      {
        name: 'content',
        widget: ContentEditor,
        span: 24,
        required: true,
        rules: [{ validator: Paper.validateRule }],
      },
    ],
  },
  list: {
    items: [
      'title',
      'questions_count',
      'is_active',
      {
        name: 'owner_type',
        label: '属主',
        widget: GenericForeignKey,
        objectIdField: 'owner_id',
        contentTypeIdField: 'owner_type',
      },
      'tags',
      'create_time',
    ],
    batchActions: [
      { name: 'batch_active', label: '激活', notice: '激活后试卷重新展示.' },
      {
        name: 'batch_unactive',
        api: 'batch_active',
        context: { is_active: false },
        label: '禁用',
        notice: '禁用后试卷不再展示.',
      },
    ],
  },
}
