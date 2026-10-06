export const apiApps = {
  course: {
    verbose_name: '课程管理',
    icon: '📚',
    models: {
      category: { verbose_name: '课程类别', icon: '🏷️' },
      course: { verbose_name: '课程', icon: '📖' },
      pass: { verbose_name: '课程通过记录', icon: '✅', hidden: true },
    },
  },
  school: {
    verbose_name: '学校管理',
    icon: '🏫',
    models: {
      grade: { verbose_name: '年级', icon: '🎓' },
      college: { verbose_name: '学院', icon: '🏛️' },
      classcourse: { verbose_name: '班级课程', icon: '🗓️', hidden: true },
    },
  },
  exam: {
    verbose_name: '考试',
    icon: '📝',
    models: {
      paper: { verbose_name: '试卷', icon: '📄', hidden: true },
      exam: { verbose_name: '考试', icon: '📝', hidden: true },
    },
  },
  media: {
    verbose_name: '媒体',
    icon: '🎬',
    models: { video: { verbose_name: '视频', icon: '🎥', hidden: true } },
  },
}

export const mockApps = {
  demo: {
    verbose_name: '项目管理',
    icon: '🗂️',
    models: {
      project: { verbose_name: '项目', icon: '📁' },
      task: { verbose_name: '任务', icon: '☑️' },
    },
  },
  crm: {
    verbose_name: '客户管理',
    icon: '🤝',
    models: {
      customer: { verbose_name: '客户', icon: '🏢' },
      contact: { verbose_name: '联系人', icon: '👤' },
    },
  },
}
