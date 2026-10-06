export const apiApps = {
  course: {
    verbose_name: '课程管理',
    models: {
      category: { verbose_name: '课程类别' },
      course: { verbose_name: '课程' },
      pass: { verbose_name: '课程通过记录', hidden: true },
    },
  },
  school: {
    verbose_name: '学校管理',
    models: {
      grade: { verbose_name: '年级' },
      college: { verbose_name: '学院' },
      classcourse: { verbose_name: '班级课程', hidden: true },
    },
  },
  exam: {
    verbose_name: '考试',
    models: {
      paper: { verbose_name: '试卷', hidden: true },
      exam: { verbose_name: '考试', hidden: true },
    },
  },
  media: {
    verbose_name: '媒体',
    models: { video: { verbose_name: '视频', hidden: true } },
  },
}

export const mockApps = {
  demo: {
    verbose_name: '项目管理',
    models: {
      project: { verbose_name: '项目' },
      task: { verbose_name: '任务' },
    },
  },
  crm: {
    verbose_name: '客户管理',
    models: {
      customer: { verbose_name: '客户' },
      contact: { verbose_name: '联系人' },
    },
  },
}
