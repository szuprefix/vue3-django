<template>
    <div>
        <model-batch-creator :structure="structure"></model-batch-creator>
    </div>
</template>
<script>

    import ModelBatchCreator from 'vue-django/src/components/rest/ModelBatchCreator.vue'
    export default{
        data () {
            return {
                structure: {
                    name: 'school.student',
                    foreignKeys: [
                        {
                            name: 'school.clazz',
                            foreignKeys: [
                                {
                                    name: 'school.session',
                                    plainFields: ['name'],
                                    rel: 'entrance_session'
                                }
                            ],
                            plainFields: ['name']
                        }
                    ],
                    plainFields: ['name', 'number']
                }
            }
        },
        components: {ModelBatchCreator},
        methods: {},
        computed: {}
    }
</script>

