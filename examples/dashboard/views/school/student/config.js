/**
 * Created by denishuang on 2019/9/2.
 */

export default {
    form: {
        items: [{name: 'name'}, {name: 'number'}]
    },
    relations: [
        'school.class',
        'course.course',
        'common.event',
        'course.pass:user=user'
    ],
    list: {
        items: ['name', 'number', 'grade', 'class_names', 'is_bind', 'is_formal', 'is_active', 'create_time'],
        batchActions: [
            {name: 'batch_active', label: '激活', notice: '激活被禁学生将恢复学生使用相关功能的权限.'},
            {
                name: 'batch_unactive',
                api: 'batch_active',
                context: {is_active: false},
                label: '禁用',
                notice: '禁用后学生将无法使用相关功能.'
            },
            {name: 'batch_unbind', label: '解绑', notice: '解绑操作不可逆,解绑后学生登录会被要求重新绑定学号和手机.'},
            {name: 'batch_reset_password', label: '重置密码', notice: '学生密码会重置为学号'}
        ]
    }
}