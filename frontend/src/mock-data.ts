export type NavItem = {
  key: string
  label: string
  hint: string
  badge: string
}

export const navItems: NavItem[] = [
  {
    key: 'today',
    label: '今日任务',
    hint: '安排今天最多 5 项关键任务',
    badge: 'Today',
  },
  {
    key: 'long',
    label: '长期任务',
    hint: '沉淀长期目标与阶段推进节奏',
    badge: 'Long',
  },
  {
    key: 'ai',
    label: 'AI 规划',
    hint: '一句话生成可执行行动清单',
    badge: 'AI',
  },
  {
    key: 'profile',
    label: '我的',
    hint: '维护资料、AI 配置与个人统计',
    badge: 'Profile',
  },
  {
    key: 'admin',
    label: '管理员',
    hint: '查看用户与任务统计概览',
    badge: 'Admin',
  },
]

export const todayFocusCards = [
  {
    title: '完成接口封装',
    meta: '优先级 High · 来源 AI',
    done: false,
  },
  {
    title: '梳理今日任务主列表布局',
    meta: '优先级 Medium · 来源 Manual',
    done: true,
  },
  {
    title: '补充移动端断点体验',
    meta: '优先级 Low · 来源 Manual',
    done: false,
  },
]

export const inboxList = [
  'AI 规划结果确认弹层',
  '今日任务新建表单校验',
  '长期任务详情抽屉',
]

export const timelineItems = [
  {
    time: '08:30',
    title: '收敛今日目标',
    detail: '从 AI 建议中确认最值得今天推进的 3 项内容。',
  },
  {
    time: '11:00',
    title: '补齐列表交互',
    detail: '完成状态切换、优先级样式与空态展示。',
  },
  {
    time: '16:30',
    title: '准备接口接入',
    detail: '把 today-tasks 的查询与创建流程接到后端接口。',
  },
]

export const authHighlights = [
  '邮箱密码登录与注册',
  '保留原项目的冷色玻璃视觉',
  '后续可直接接 JWT 登录态',
]
