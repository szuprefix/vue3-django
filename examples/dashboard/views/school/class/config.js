/**
 * Created by denishuang on 2019/9/4.
 */
// import AutoComplete from 'vue-django/src/components/model/widgets/AutoComplete.vue'
export default {
    form: {
        items: [
            'name',
            'short_name',
            'entrance_session',
            'grade',
            'major',
            'college',
            'stage',
            {
                name: 'tags',
                // widget: AutoComplete,
                url: '/school/class/stat/?measures=tags',
                prepare: (data) => {
                    return data.tags
                }
            },
            'primary_teacher'
        ]
    },
    list: {
        items: ['name', 'grade', 'entrance_session', 'major', 'college', 'tags']
    },
    batch: {
        items: ['name', 'grade', 'entrance_session'],
        pk: 'name'
    },
    relations: ['school.classcourse', {name: 'school.student', parentRelationQueryName: 'class__id'}]

}
