// Migrated from dashboard/src/configs/apps.js; registration is owned by demo/main.js.
const ACTION_BATCH = { name: 'batch', icon: 'archive', title: '批量添加', permission: ['add'] }
export const apiApps = {
  exam: {
    verbose_name: '测验',
    icon: 'file',
    models: {
      paper: {
        verbose_name: '试卷',
        icon: 'file',
        title_field: 'title',
        actions: [
          { name: 'regen', title: '重建', permission: 'post' },
          { name: 'performance', verbose_name: '练习明细' },
          { name: 'batch', title: '导入自考人Excel', permission: 'create' },
          {
            name: 'ordering',
            title: '排序',
            permission: 'update',
            do: 'exam/paper/ordering',
            show({ table }) {
              return table.parent
            },
            drawer: { size: '66%' },
          },
          {
            name: 'gen_chapter_papers',
            title: '生成章节卷',
            permission: 'update',
            do: 'exam/paper/chapter_papers',
            show({ table }) {
              return table.parent
            },
            drawer: { size: '66%' },
          },
        ],
      },
      exam: {
        verbose_name: '考试',
        icon: 'file',
        itemActions: [
          {
            name: 'get_grade_url',
            icon: 'paper',
            title: '阅卷',
            label: '阅卷',
            permission: 'get_grade_token',
          },
        ],
      },
      answer: {
        verbose_name: '答卷',
        icon: 'check-square',
        hidden: true,
      },
      performance: {
        verbose_name: '成绩',
        icon: 'star',
        itemActions: [
          {
            name: 'erase',
            label: '重考',
            type: 'danger',
            confirm: true,
            do: ({ model, row }) => {
              return model.doAction('erase', {}, 'delete', row[model.config.idField ?? 'id'])
            },
            permission: 'erase',
          },
        ],
      },
    },
  },
  school: {
    verbose_name: '学校',
    icon: 'university',
    models: {
      student: {
        verbose_name: '学生',
        icon: 'user',
        actions: [{ name: 'import', icon: 'upload', title: '导入', permission: 'post_import' }],
      },
      teacher: {
        verbose_name: '老师',
        icon: 'user-circle',
        actions: [
          ACTION_BATCH,
          {
            name: 'create_from_tags',
            title: '批量创建',
            permission: 'create',
            // do: 'exam/paper/create_from_tags',
            drawer: { size: '66%' },
          },
        ],
      },
      class: {
        verbose_name: '班级',
        icon: 'th',
        actions: [ACTION_BATCH],
      },
      major: {
        verbose_name: '专业',
        icon: 'balance-scale',
        actions: [ACTION_BATCH],
      },
      college: {
        verbose_name: '学院',
        icon: 'flag',
        actions: [ACTION_BATCH],
      },
      grade: {
        verbose_name: '年级',
        icon: 'th-large',
        hidden: true,
      },
      session: {
        verbose_name: '届别',
        icon: 'history',
        // hidden: true
      },
      classcourse: {
        verbose_name: '班级课程',
        icon: 'book',
        actions: [{ name: 'import', verbose_name: '导入', permission: ['add'] }],
        hidden: true,
      },
    },
  },
  course: {
    verbose_name: '课程',
    icon: 'book',
    models: {
      category: {
        verbose_name: '类别',
        icon: 'th-large',
        actions: [ACTION_BATCH],
      },
      course: {
        verbose_name: '课程',
        icon: 'book',
        actions: [ACTION_BATCH],
        itemActions: [
          {
            name: 'get_outline_url',
            icon: 'paper',
            title: '试卷分纲',
            label: '试卷分纲',
            permission: 'outline_question',
          },
        ],
      },
      pass: {
        verbose_name: '考试通过',
        icon: 'th',
      },
      chapter: {
        verbose_name: '章节',
        icon: 'th',
        actions: [ACTION_BATCH],
        hidden: true,
      },
    },
  },
  contenttypes: {
    verbose_name: '内容分类',
    hidden: true,
    models: {
      contenttype: {
        verbose_name: '内容分类',
        hidden: true,
        selectOptionsFields: ['name', 'app_label'],
      },
    },
  },
  common: {
    verbose_name: '通用',
    hidden: true,
    models: {
      event: {
        verbose_name: '事件',
        icon: 'bell',
        hidden: true,
        menu: '其它',
      },
    },
  },
  comment: {
    verbose_name: '评论',
    hidden: true,
    models: {
      comment: {
        verbose_name: '评论',
        icon: 'comment',
        menu: '其它',
      },
      rating: {
        verbose_name: '评分',
        icon: 'star',
        menu: '其它',
      },
    },
  },
  media: {
    verbose_name: '多媒体',
    // hidden: true,
    models: {
      video: {
        verbose_name: '视频',
        icon: 'play',
        actions: [{ name: 'performance', verbose_name: '观看明细' }],
      },
      image: {
        verbose_name: '图片',
        icon: 'image',
        hidden: true,
      },
      lecturer: {
        verbose_name: '讲师',
        icon: 'user',
      },
    },
  },
  survey: {
    verbose_name: '调查问卷',
    hidden: true,
    models: {
      survey: {
        verbose_name: '问卷',
        icon: 'question',
        menu: '其它',
        itemActions: [{ name: 'stat', title: '汇总统计', icon: 'align-left' }],
      },
    },
  },
  person: {
    verbose_name: '私人信息',
    icon: 'user',
    hidden: true,
    models: {
      person: {
        verbose_name: '私人信息',
        icon: 'user',
        hidden: true,
      },
    },
  },
  verify: {
    verbose_name: '审核',
    hidden: true,
    models: {
      verify: {
        icon: 'check',
        menu: '其它',
        verbose_name: '审核',
      },
    },
  },
  message: {
    verbose_name: '通知',
    hidden: true,
    models: {
      task: {
        icon: 'paper-plane',
        menu: '其它',
        verbose_name: '通知',
      },
      message: {
        icon: 'file',
        hidden: true,
        verbose_name: '消息',
      },
    },
  },
  dailylog: {
    verbose_name: '日志',
    hidden: true,
    models: {
      stat: {
        verbose_name: '统计',
        hidden: true,
      },
      record: {
        verbose_name: '明细',
        hidden: true,
      },
      performance: {
        verbose_name: '表现',
        hidden: true,
      },
    },
  },
  points: {
    verbose_name: '积分榜',
    icon: 'star',
    models: {
      point: {
        verbose_name: '积分',
        icon: 'star',
        hidden: true,
      },
      session: {
        verbose_name: '周期',
        icon: 'calendar',
      },
      category: {
        verbose_name: '子榜',
        icon: 'flag',
      },
      project: {
        verbose_name: '计划',
        hidden: true,
      },
    },
  },
  clockin: {
    verbose_name: '打卡',
    icon: 'check',
    models: {
      project: {
        verbose_name: '计划',
        icon: 'home',
      },
      group: {
        verbose_name: '小组',
        icon: 'user',
      },
      session: {
        verbose_name: '周期',
        icon: 'clock-o',
        hidden: true,
      },
      membership: {
        verbose_name: '成员',
        icon: 'user',
      },
    },
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
