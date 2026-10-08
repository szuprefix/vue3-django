// Keep backend OPTIONS as the field source; no assumptions about optional fields.

import VideoCover from 'vue3-django/src/components/media/VideoCover.vue'
import {duration, nFormatter} from 'vue3-django/src/utils/filters'

export default {
  list: { items: [
      {name: 'cover_url', label: '封面', widget: VideoCover, lazy:true, width: '200px', height: '200px', fit:true},
      'name',
      {name: 'duration', widget: (value, field) => duration(value[field.name])},
      {name: 'size', widget: (value, field) => nFormatter(value[field.name])},
      'is_active',
      'lecturer',
      'tags',
      'create_time'
    ]
  },
  form: { items: 'all' },
  search: {},
  relations: [],
}
