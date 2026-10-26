<template>
    <div v-loading="loading" :element-loading-text="loading">
        <el-upload :action="actionUrl" :on-preview="handlePreview" :on-success="onUploadSuccess"
                   :show-file-list="false" :with-credentials="true" :auto-upload="false"
                   :on-change="submitUpload">
            <el-button size="small" type="primary">点击上传</el-button>
            <div slot="tip" class="el-upload__tip">只能上传excel文件，且不超过5MB.<br/>
                模板:<a href="files/学生信息模板.xlsx" download="学生信息模板.xlsx">学生信息模板.xlsx</a>
            </div>
        </el-upload>

        <el-tabs tab-position="right" style="height: 100%">
            <el-tab-pane :label="`${queueList.length}`">
                <span slot="label"><i class="fa fa-list"></i> 待导队列<el-badge type="primary" :value="queueList.length"
                                                                            v-if="queueList.length>0"/></span>

                <div v-if="queueList.length>0">
                    <div class="flex-right">
                        <el-button plain>总数:{{queueList.length}}</el-button>
                        <el-button plain type="danger">异常:{{errors.length}}</el-button>
                        <el-button type="primary" size="small" @click="sumbitImport">开始导入</el-button>
                    </div>

                    <data-table v-model="queueList" :fields="columns" :cellWidget="TableCell"></data-table>
                </div>
            </el-tab-pane>
            <el-tab-pane :label="`${successList.length}`">
                <span slot="label"><i class="fa fa-check"></i> 成功记录<el-badge type="success" :value="successList.length"
                                                                             v-if="successList.length>0"/></span>

                <data-table v-model="successList" :fields="resultTableItems"></data-table>
            </el-tab-pane>
            <el-tab-pane :label="`${failedList.length}`">
                <span slot="label"><i class="fa fa-close"></i> 失败记录<el-badge :value="failedList.length"
                                                                             v-if="failedList.length>0"/></span>

                <div class="flex-right">
                    <el-button type="primary" size="small" @click="retryImport">再试一次</el-button>
                </div>
                <data-table v-model="failedList" :fields="columns"></data-table>
            </el-tab-pane>
        </el-tabs>

    </div>
</template>
<script>
    import grid from '../../../utils/grid'
    import TableCell from '../../../components/import/TableCell.vue'
    import queueLimit from 'vue-django/src/utils/async_queue'
    import server_response from 'vue-django/src/mixins/server_response'
    import DataTable from 'vue-django/src/components/table/DataTable.vue'
    import {keyBy, mapValues, pickBy} from 'lodash'
    const NUM_KEY = "学号"
    export default{
        mixins: [server_response],
        data () {
            return {
                table: [],
                queue: {},
                successCollection: {},
                failedCollection: {},
                columns: [],
                errors: [],
                status: {},
                NUM_KEY,
                TableCell,
                actionUrl: '/school/student/pre_import/',
                resultTableItems: [
                    {name: 'name', label: '姓名'},
                    {name: 'number', label: '学号'},
                    {name: 'grade_name', label: '年级'},
                    {name: 'clazz_name', label: '班级'}
                ]
            }
        },
        components: {TableCell, DataTable},
        mounted () {
            this.genDefaultGradeAndSession()
        },
        methods: {
            handlePreview(file) {
                console.log(file)
            },
            onUploadSuccess(res, file) {
                this.table = file.response.data
                this.columns = file.response.fields
            },
            genDefaultGradeAndSession() {
                this.$http.post('/school/session/gen_default/').catch(this.onServerResponseError)
                this.$http.post('/school/grade/gen_default/').catch(this.onServerResponseError)
            },
            submitUpload (file, fileList){
                this.loading = '上传中'
                let formData = new FormData()
                formData.append('file', file.raw)
                let config = {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }

                this.$http.post(this.actionUrl, formData, config).then(({data}) => {
                    this.loading = false
                    let table = data.data
                    this.status = {}
                    this.queue = Object.assign({}, this.queue, keyBy(table, (a) => a[NUM_KEY]))
                    this.status = mapValues(table, (a) => '')
                    this.columns = data.fields
                }).catch(this.onServerResponseError)
            },
            checkWorkerStatus(){
                let ns = this.queueList.map((a) => a[NUM_KEY]).join(',')
                return this.$http.get(`/saas/worker/?number__in=${ns}&page_size=20000`).then(({data}) => {
                    data.results.forEach((a) => {
                        this.map[a.number]._id = a.id
                    })
                })
            },
            updateStatus(a, s){
                let d = {}
                d[a[NUM_KEY]] = s
                this.status = Object.assign({}, this.status, d)
            },
            filterProfile(p){
                return pickBy(p, (v, k) => !k.startsWith('_'))
            },
            postImport(d){
                return this.$http.post('/school/student/post_import/', this.filterProfile(d)).then(({data, code}) => {
                    let type = code === 201 ? '创建' : '更新'
                    this.updateStatus(d, `${type}成功.`)
                    let a = {}
                    a[d[NUM_KEY]] = data
                    this.successCollection = Object.assign({}, this.successCollection, a)
                }).catch((error) => {
                    console.log(error)
                    if (error.code == 400) {
                        this.updateStatus(d, `导入出错: ${error.msg}`)
                    }
                    let a = {}
                    a[d[NUM_KEY]] = d
                    this.failedCollection = Object.assign({}, this.failedCollection, a)
//                    this.onServerResponseError(error)
                }).then(() => {
                    delete this.queue[d[NUM_KEY]]
                    this.queue = Object.assign({}, this.queue)
                })
            },
            sumbitImport () {
                if (this.queueList.length > 0) {
                    queueLimit(this.queueList, 1, this.postImport).then(() => {
                        this.$message('导入结束')
                        this.$store.state.bus.$emit('model-posted', {appModel: 'school.student'})
                    })
                }
            },
            retryImport(){
                this.queue = Object.assign({}, this.queue, this.failedCollection)
                this.failedCollection = Object.assign({})
                this.sumbitImport()
            }
        },
        computed: {
            queueList () {
                return Object.values(this.queue)
            },
            successList(){
                return Object.values(this.successCollection)
            },
            failedList(){
                return Object.values(this.failedCollection)
            }
        }
    }
</script>
