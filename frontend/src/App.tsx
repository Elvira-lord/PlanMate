import { useMemo, useRef, useState } from 'react'
import {
  Bot,
  CalendarClock,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react'
import './App.css'
import { useAuthStore } from '@/auth-store'
import { baseURL } from '@/api'
import {
  adminApi,
  authApi,
  dailyPlansApi,
  longTasksApi,
  profileApi,
  todayTasksApi,
  type AiSuggestionItem,
  type DailyPlanItem,
  type LongTaskItem,
  type ProfileResponse,
  type ProfileStatsResponse,
  type TodayTaskItem,
} from '@/services'
import { authHighlights, navItems } from '@/mock-data'

type AuthMode = 'login' | 'register'
type ViewKey = 'today' | 'long' | 'ai' | 'profile' | 'admin'
type Priority = 'high' | 'medium' | 'low'
type NavViewItem = {
  key: ViewKey
  label: string
  hint: string
  badge: string
}

type AuthForm = {
  username: string
  email: string
  password: string
}

type TodayForm = {
  title: string
  description: string
  priority: Priority
}

type LongForm = {
  title: string
  description: string
  priority: Priority
}

type ProfileForm = {
  username: string
  email: string
}

type AiConfigForm = {
  provider: string
  model: string
  baseUrl: string
  apiKey: string
  aiPrompt: string
}

type SuggestionWithType = AiSuggestionItem & {
  type: 'today' | 'long'
}

type AdminUserItem = {
  id: number
  username: string
  email: string
  role: 'user' | 'admin'
  status: string
  createdAt: string
}

type AdminColumnKey = 'id' | 'username' | 'email' | 'role' | 'status' | 'createdAt'

type AdminColumn = {
  key: AdminColumnKey
  label: string
  align: 'left' | 'center'
}

type AdminColumnWidths = Record<AdminColumnKey, number>

const navIconMap: Record<ViewKey, typeof Target> = {
  today: CalendarClock,
  long: Target,
  ai: Bot,
  profile: UserRound,
  admin: ShieldCheck,
}

const typedNavItems = navItems as NavViewItem[]

const defaultAuthForm: AuthForm = {
  username: '',
  email: '',
  password: '',
}

const defaultTodayForm: TodayForm = {
  title: '',
  description: '',
  priority: 'medium',
}

const defaultLongForm: LongForm = {
  title: '',
  description: '',
  priority: 'medium',
}

const defaultProfileForm: ProfileForm = {
  username: '',
  email: '',
}

const defaultAiConfigForm: AiConfigForm = {
  provider: '',
  model: '',
  baseUrl: '',
  apiKey: '',
  aiPrompt: '',
}

const priorityLabelMap: Record<Priority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
}

const defaultAdminColumnWidths: AdminColumnWidths = {
  id: 60,
  username: 140,
  email: 220,
  role: 90,
  status: 90,
  createdAt: 160,
}

const adminColumns: AdminColumn[] = [
  { key: 'id', label: 'ID', align: 'center' },
  { key: 'username', label: '用户名', align: 'left' },
  { key: 'email', label: '邮箱', align: 'left' },
  { key: 'role', label: '角色', align: 'center' },
  { key: 'status', label: '状态', align: 'center' },
  { key: 'createdAt', label: '创建时间', align: 'center' },
]

const formatDate = (value?: string) => {
  if (!value) {
    return '未设置'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

const formatAdminDate = (value?: string) => {
  if (!value) {
    return '--'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value)).replace(/\//g, '-')
}

const getRequestErrorMessage = (unknownError: unknown) => {
  if (typeof unknownError === 'object' && unknownError !== null && 'message' in unknownError) {
    const errorMessage = (unknownError as { message?: unknown }).message
    if (typeof errorMessage === 'string' && errorMessage.trim()) {
      return errorMessage
    }
  }

  return null
}

function App() {
  const { user, setUser, logout } = useAuthStore()

  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [activeView, setActiveView] = useState<ViewKey>('today')
  const [authForm, setAuthForm] = useState<AuthForm>(defaultAuthForm)
  const [todayForm, setTodayForm] = useState<TodayForm>(defaultTodayForm)
  const [longForm, setLongForm] = useState<LongForm>(defaultLongForm)
  const [profileForm, setProfileForm] = useState<ProfileForm>(defaultProfileForm)
  const [aiConfigForm, setAiConfigForm] = useState<AiConfigForm>(defaultAiConfigForm)
  const [aiPromptInput, setAiPromptInput] = useState('我想把这周最重要的任务安排清楚')
  const [todayTasks, setTodayTasks] = useState<TodayTaskItem[]>([])
  const [longTasks, setLongTasks] = useState<LongTaskItem[]>([])
  const [dailyPlansMap, setDailyPlansMap] = useState<Record<number, DailyPlanItem[]>>({})
  const [selectedLongTaskId, setSelectedLongTaskId] = useState<number | null>(null)
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [profileStats, setProfileStats] = useState<ProfileStatsResponse | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [todaySubmitting, setTodaySubmitting] = useState(false)
  const [longSubmitting, setLongSubmitting] = useState(false)
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [aiSubmitting, setAiSubmitting] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<SuggestionWithType[]>([])
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([])
  const [adminColumnWidths, setAdminColumnWidths] = useState<AdminColumnWidths>(defaultAdminColumnWidths)
  const [loadingPage, setLoadingPage] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // === 今日任务：日期筛选 / 编辑 ===
  const [todayTaskDate, setTodayTaskDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [editingTodayTaskId, setEditingTodayTaskId] = useState<number | null>(null)
  const [editingTodayTaskForm, setEditingTodayTaskForm] = useState<{ title: string; description: string; priority: Priority }>({ title: '', description: '', priority: 'medium' })

  // === 长期任务：编辑 ===
  const [editingLongTaskId, setEditingLongTaskId] = useState<number | null>(null)
  const [editingLongTaskForm, setEditingLongTaskForm] = useState<{ title: string; description: string; priority: Priority }>({ title: '', description: '', priority: 'medium' })

  // === 每日计划：编辑 / AI 生成 ===
  const [editingDailyPlanId, setEditingDailyPlanId] = useState<number | null>(null)
  const [editingDailyPlanForm, setEditingDailyPlanForm] = useState<{ content: string }>({ content: '' })
  const [aiPlanPrompt, setAiPlanPrompt] = useState('')
  const [aiPlanGenerating, setAiPlanGenerating] = useState(false)

  // === 管理员：搜索 / 筛选 / 分页 / 详情 ===
  const [adminKeyword, setAdminKeyword] = useState('')
  const [adminRoleFilter, setAdminRoleFilter] = useState<'' | 'user' | 'admin'>('')
  const [adminPage, setAdminPage] = useState(1)
  const [adminPageSize] = useState(10)
  const [adminTotal, setAdminTotal] = useState(0)
  const [adminDetail, setAdminDetail] = useState<{ detail: any; stats: any } | null>(null)
  const [_adminDetailLoading, setAdminDetailLoading] = useState(false)

  // === 头像上传 ===
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const adminResizeRef = useRef<{ key: AdminColumnKey; startX: number; startWidth: number } | null>(null)

  const isAuthed = Boolean(user?.token)
  const canViewAdmin = user?.role === 'admin'
  const visibleNavItems = canViewAdmin ? typedNavItems : typedNavItems.filter((item) => item.key !== 'admin')

  const completedCount = useMemo(
    () => todayTasks.filter((task) => task.isCompleted).length,
    [todayTasks],
  )
  const pendingCount = todayTasks.length - completedCount
  const completionRate = todayTasks.length ? Math.round((completedCount / todayTasks.length) * 100) : 0
  const activeLongTasks = longTasks.filter((task) => !task.isCompleted)
  const completedLongTasks = longTasks.filter((task) => task.isCompleted)
  const selectedDailyPlans = selectedLongTaskId ? dailyPlansMap[selectedLongTaskId] ?? [] : []

  const clearFeedback = () => {
    setMessage(null)
    setError(null)
  }

  const setSuccessMessage = (value: string) => {
    setMessage(value)
    setError(null)
  }

  const handleRequestError = (unknownError: unknown, fallback: string) => {
    setError(getRequestErrorMessage(unknownError) ?? fallback)
    setMessage(null)
  }

  const handleAdminResizeMouseMove = (event: MouseEvent) => {
    if (!adminResizeRef.current) {
      return
    }

    const { key, startX, startWidth } = adminResizeRef.current
    const nextWidth = Math.max(50, startWidth + event.clientX - startX)
    setAdminColumnWidths((current) => ({
      ...current,
      [key]: nextWidth,
    }))
  }

  const handleAdminResizeMouseUp = () => {
    adminResizeRef.current = null
    window.removeEventListener('mousemove', handleAdminResizeMouseMove)
    window.removeEventListener('mouseup', handleAdminResizeMouseUp)
  }

  const handleAdminColumnResizeStart = (key: AdminColumnKey, event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault()
    adminResizeRef.current = {
      key,
      startX: event.clientX,
      startWidth: adminColumnWidths[key],
    }
    window.addEventListener('mousemove', handleAdminResizeMouseMove)
    window.addEventListener('mouseup', handleAdminResizeMouseUp)
  }

  const loadDailyPlans = async (longTaskId: number) => {
    const response = await dailyPlansApi.list(longTaskId)
    setDailyPlansMap((current) => ({
      ...current,
      [longTaskId]: response.list,
    }))
  }

  const loadTodayTasks = async (taskDate?: string) => {
    const params: { taskDate?: string } = {}
    if (taskDate) params.taskDate = taskDate
    const response = await todayTasksApi.list(params)
    setTodayTasks(response.list)
  }

  const loadLongTasks = async () => {
    const response = await longTasksApi.list()
    const tasks = response.list
    setLongTasks(tasks)

    if (tasks.length) {
      const firstTaskId = tasks[0].id
      setSelectedLongTaskId((current) => current ?? firstTaskId)
      await loadDailyPlans(firstTaskId)
    } else {
      setSelectedLongTaskId(null)
      setDailyPlansMap({})
    }
  }

  const loadProfile = async () => {
    const [profileData, statsData] = await Promise.all([
      profileApi.get(),
      profileApi.stats({ periodType: 'weekly' }),
    ])

    setProfile(profileData)
    setProfileStats(statsData)
    setProfileForm({
      username: profileData.username,
      email: profileData.email,
    })
    setAiConfigForm({
      provider: profileData.aiProvider ?? '',
      model: profileData.aiModel ?? '',
      baseUrl: profileData.aiBaseUrl ?? '',
      apiKey: '',
      aiPrompt: profileData.aiPrompt ?? '',
    })
  }

  const loadAdminUsers = async (params?: { keyword?: string; role?: '' | 'user' | 'admin'; page?: number; pageSize?: number }) => {
    const requestParams: { keyword?: string; role?: 'user' | 'admin'; page?: number; pageSize?: number } = {}
    if (params?.keyword) requestParams.keyword = params.keyword
    if (params?.role) requestParams.role = params.role
    if (params?.page) requestParams.page = params.page
    if (params?.pageSize) requestParams.pageSize = params.pageSize
    const result = await adminApi.users(requestParams)
    setAdminUsers(result.list)
    setAdminTotal(result.total)
  }

  const loadCurrentViewData = async (view: ViewKey) => {
    if (!isAuthed) {
      return
    }

    setLoadingPage(true)
    clearFeedback()

    try {
      if (view === 'today') {
        await loadTodayTasks(todayTaskDate || undefined)
      }

      if (view === 'long') {
        await loadLongTasks()
      }

      if (view === 'profile') {
        await loadProfile()
      }

      if (view === 'admin' && canViewAdmin) {
        await loadAdminUsers()
      }
    } catch (unknownError) {
      handleRequestError(unknownError, '加载数据失败，请稍后再试')
    } finally {
      setLoadingPage(false)
    }
  }

  const handleViewChange = (nextView: ViewKey) => {
    setActiveView(nextView)
    void loadCurrentViewData(nextView)
  }

  const handleAuthSubmit = async () => {
    setAuthLoading(true)
    clearFeedback()

    try {
      const response = authMode === 'login'
        ? await authApi.login({
            email: authForm.email.trim(),
            password: authForm.password,
          })
        : await authApi.register({
            username: authForm.username.trim(),
            email: authForm.email.trim(),
            password: authForm.password,
          })

      setUser({
        id: response.id,
        token: response.token,
        username: response.username,
        role: response.role,
      })

      setAuthForm(defaultAuthForm)
      setSuccessMessage(authMode === 'login' ? '登录成功' : '注册成功')
      setActiveView('today')
      await loadCurrentViewData('today')
    } catch (unknownError) {
      handleRequestError(unknownError, authMode === 'login' ? '登录失败' : '注册失败')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleToggleTodayTask = async (task: TodayTaskItem) => {
    clearFeedback()

    try {
      const nextTask = await todayTasksApi.update(task.id, {
        title: task.title,
        description: task.description ?? undefined,
        priority: task.priority,
        isCompleted: !task.isCompleted,
      })

      setTodayTasks((current) => current.map((item) => (item.id === nextTask.id ? nextTask : item)))
      setSuccessMessage(task.isCompleted ? '任务已重新标记为未完成' : '任务已标记完成')
    } catch (unknownError) {
      handleRequestError(unknownError, '更新任务状态失败')
    }
  }

  const handleToggleLongTask = async (task: LongTaskItem) => {
    clearFeedback()

    try {
      const result = await longTasksApi.checkin(task.id)
      setLongTasks((current) =>
        current.map((item) => (item.id === task.id ? { ...item, isCheckedToday: result.checked } : item)),
      )
      setSuccessMessage(result.checked ? '今日已打卡' : '已取消今日打卡')
    } catch (unknownError) {
      handleRequestError(unknownError, '打卡操作失败')
    }
  }

  const handleCreateTodayTask = async () => {
    if (!todayForm.title.trim()) {
      setError('请先输入今日任务标题')
      setMessage(null)
      return
    }

    setTodaySubmitting(true)
    clearFeedback()

    try {
      const createdTask = await todayTasksApi.create({
        title: todayForm.title.trim(),
        description: todayForm.description.trim(),
        priority: todayForm.priority,
      })

      setTodayTasks((current) => [createdTask, ...current])
      setTodayForm(defaultTodayForm)
      setSuccessMessage('今日任务创建成功')
    } catch (unknownError) {
      handleRequestError(unknownError, '创建今日任务失败')
    } finally {
      setTodaySubmitting(false)
    }
  }

  const handleCreateLongTask = async () => {
    if (!longForm.title.trim()) {
      setError('请先输入长期任务标题')
      setMessage(null)
      return
    }

    setLongSubmitting(true)
    clearFeedback()

    try {
      const createdTask = await longTasksApi.create({
        title: longForm.title.trim(),
        description: longForm.description.trim(),
        priority: longForm.priority,
      })

      setLongTasks((current) => [createdTask, ...current])
      setLongForm(defaultLongForm)
      setSuccessMessage('长期任务创建成功')
    } catch (unknownError) {
      handleRequestError(unknownError, '创建长期任务失败')
    } finally {
      setLongSubmitting(false)
    }
  }

  const handleSelectLongTask = async (taskId: number) => {
    setSelectedLongTaskId(taskId)
    clearFeedback()

    try {
      await loadDailyPlans(taskId)
    } catch (unknownError) {
      handleRequestError(unknownError, '加载每日计划失败')
    }
  }

  const handleGenerateAiSuggestions = async () => {
    if (!aiPromptInput.trim()) {
      setError('请输入要交给 AI 处理的需求')
      setMessage(null)
      return
    }

    setAiGenerating(true)
    clearFeedback()

    try {
      const [todayResult, longResult] = await Promise.all([
        todayTasksApi.generate({
          prompt: aiPromptInput.trim(),
          count: 3,
        }),
        longTasksApi.generate({
          prompt: aiPromptInput.trim(),
          count: 2,
        }),
      ])

      const merged = [
        ...todayResult.list.map((item: AiSuggestionItem) => ({ ...item, type: 'today' as const })),
        ...longResult.list.map((item: AiSuggestionItem) => ({ ...item, type: 'long' as const })),
      ]

      setAiSuggestions(merged)
      setSuccessMessage('AI 建议已生成，可按需加入任务清单')
    } catch (unknownError) {
      handleRequestError(unknownError, '生成 AI 建议失败')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleApplySuggestion = async (item: SuggestionWithType) => {
    clearFeedback()

    try {
      if (item.type === 'today') {
        const created = await todayTasksApi.create({
          title: item.title,
          description: item.description,
          priority: item.priority,
        })

        setTodayTasks((current) => [created, ...current])
      }

      if (item.type === 'long') {
        const created = await longTasksApi.create({
          title: item.title,
          description: item.description,
          priority: item.priority,
        })

        setLongTasks((current) => [created, ...current])
      }

      setAiSuggestions((current) => current.filter((suggestion) => suggestion !== item))
      setSuccessMessage('AI 建议已加入任务列表')
    } catch (unknownError) {
      handleRequestError(unknownError, '加入任务失败')
    }
  }

  const handleSaveProfile = async () => {
    if (!profileForm.username.trim() && !profileForm.email.trim()) {
      setError('请至少填写用户名或邮箱')
      setMessage(null)
      return
    }

    setProfileSubmitting(true)
    clearFeedback()

    try {
      const nextProfile = await profileApi.update({
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
      })

      setProfile((current) => (
        current
          ? {
              ...current,
              username: nextProfile.username,
              email: nextProfile.email,
            }
          : current
      ))
      setProfileForm({
        username: nextProfile.username,
        email: nextProfile.email,
      })
      setUser({
        id: user?.id ?? nextProfile.id,
        token: user?.token ?? '',
        username: nextProfile.username,
        role: user?.role ?? profile?.role ?? 'user',
      })
      setSuccessMessage('个人资料已更新')
    } catch (unknownError) {
      handleRequestError(unknownError, '更新个人资料失败')
    } finally {
      setProfileSubmitting(false)
    }
  }

  const handleSaveAiConfig = async () => {
    setAiSubmitting(true)
    clearFeedback()

    try {
      if (aiConfigForm.aiPrompt.trim()) {
        await profileApi.updateAiPrompt({ aiPrompt: aiConfigForm.aiPrompt.trim() })
      }
      const configPayload: Record<string, string> = {
        provider: aiConfigForm.provider.trim(),
        model: aiConfigForm.model.trim(),
        baseUrl: aiConfigForm.baseUrl.trim(),
      }
      if (aiConfigForm.apiKey.trim()) {
        configPayload.apiKey = aiConfigForm.apiKey.trim()
      }
      const updatedProfile = await profileApi.updateAiConfig(configPayload as { provider?: string; model?: string; baseUrl?: string; apiKey: string })

      setProfile((current) => (
        current
          ? {
              ...current,
              aiPrompt: aiConfigForm.aiPrompt.trim() || null,
              aiProvider: updatedProfile.provider,
              aiModel: updatedProfile.model,
              aiBaseUrl: updatedProfile.baseUrl,
            }
          : current
      ))
      setAiConfigForm((current) => ({
        ...current,
        provider: updatedProfile.provider ?? '',
        model: updatedProfile.model ?? '',
        baseUrl: updatedProfile.baseUrl ?? '',
        apiKey: '',
      }))
      setSuccessMessage('AI 配置已保存')
    } catch (unknownError) {
      handleRequestError(unknownError, '保存 AI 配置失败')
    } finally {
      setAiSubmitting(false)
    }
  }

  // === 今日任务：删除 ===
  const handleDeleteTodayTask = async (id: number) => {
    if (!window.confirm('确定删除这条今日任务吗？')) return
    clearFeedback()
    try {
      await todayTasksApi.remove(id)
      setTodayTasks((current) => current.filter((t) => t.id !== id))
      setSuccessMessage('今日任务已删除')
    } catch (unknownError) {
      handleRequestError(unknownError, '删除今日任务失败')
    }
  }

  // === 今日任务：编辑 ===
  const handleStartEditTodayTask = (task: TodayTaskItem) => {
    setEditingTodayTaskId(task.id)
    setEditingTodayTaskForm({ title: task.title, description: task.description ?? '', priority: task.priority })
  }

  const handleSaveEditTodayTask = async (id: number) => {
    clearFeedback()
    try {
      const updated = await todayTasksApi.update(id, {
        title: editingTodayTaskForm.title.trim(),
        description: editingTodayTaskForm.description.trim() || undefined,
        priority: editingTodayTaskForm.priority,
      })
      setTodayTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)))
      setEditingTodayTaskId(null)
      setSuccessMessage('今日任务已更新')
    } catch (unknownError) {
      handleRequestError(unknownError, '更新今日任务失败')
    }
  }

  // === 长期任务：删除 ===
  const handleDeleteLongTask = async (id: number) => {
    if (!window.confirm('确定删除这条长期任务吗？')) return
    clearFeedback()
    try {
      await longTasksApi.remove(id)
      setLongTasks((current) => current.filter((t) => t.id !== id))
      if (selectedLongTaskId === id) setSelectedLongTaskId(null)
      setSuccessMessage('长期任务已删除')
    } catch (unknownError) {
      handleRequestError(unknownError, '删除长期任务失败')
    }
  }

  // === 长期任务：编辑 ===
  const handleStartEditLongTask = (task: LongTaskItem) => {
    setEditingLongTaskId(task.id)
    setEditingLongTaskForm({ title: task.title, description: task.description ?? '', priority: task.priority })
  }

  const handleSaveEditLongTask = async (id: number) => {
    clearFeedback()
    try {
      const updated = await longTasksApi.update(id, {
        title: editingLongTaskForm.title.trim(),
        description: editingLongTaskForm.description.trim() || undefined,
        priority: editingLongTaskForm.priority,
      })
      setLongTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)))
      setEditingLongTaskId(null)
      setSuccessMessage('长期任务已更新')
    } catch (unknownError) {
      handleRequestError(unknownError, '更新长期任务失败')
    }
  }

  // === 每日计划：删除 ===
  const handleDeleteDailyPlan = async (id: number) => {
    if (!window.confirm('确定删除这条每日计划吗？')) return
    clearFeedback()
    try {
      await dailyPlansApi.remove(id)
      if (selectedLongTaskId) {
        setDailyPlansMap((current) => ({
          ...current,
          [selectedLongTaskId]: (current[selectedLongTaskId] ?? []).filter((p) => p.id !== id),
        }))
      }
      setSuccessMessage('每日计划已删除')
    } catch (unknownError) {
      handleRequestError(unknownError, '删除每日计划失败')
    }
  }

  // === 每日计划：编辑 ===
  const handleStartEditDailyPlan = (plan: DailyPlanItem) => {
    setEditingDailyPlanId(plan.id)
    setEditingDailyPlanForm({ content: plan.content })
  }

  const handleSaveEditDailyPlan = async (id: number) => {
    clearFeedback()
    try {
      const updated = await dailyPlansApi.update(id, { content: editingDailyPlanForm.content.trim() })
      if (selectedLongTaskId) {
        setDailyPlansMap((current) => ({
          ...current,
          [selectedLongTaskId]: (current[selectedLongTaskId] ?? []).map((p) => (p.id === updated.id ? updated : p)),
        }))
      }
      setEditingDailyPlanId(null)
      setSuccessMessage('每日计划已更新')
    } catch (unknownError) {
      handleRequestError(unknownError, '更新每日计划失败')
    }
  }

  // === 每日计划：完成勾选 ===
  const handleToggleDailyPlan = async (plan: DailyPlanItem) => {
    clearFeedback()
    try {
      const updated = await dailyPlansApi.update(plan.id, { isCompleted: !plan.isCompleted })
      if (selectedLongTaskId) {
        setDailyPlansMap((current) => ({
          ...current,
          [selectedLongTaskId]: (current[selectedLongTaskId] ?? []).map((p) => (p.id === updated.id ? updated : p)),
        }))
      }
      setSuccessMessage(plan.isCompleted ? '计划已重新标记为未完成' : '计划已标记完成')
    } catch (unknownError) {
      handleRequestError(unknownError, '更新计划状态失败')
    }
  }

  // === 每日计划：AI 生成 ===
  const handleAiGeneratePlans = async () => {
    if (!selectedLongTaskId) return
    if (!aiPlanPrompt.trim()) {
      setError('请输入 AI 生成提示')
      return
    }
    setAiPlanGenerating(true)
    clearFeedback()
    try {
      await dailyPlansApi.generate(selectedLongTaskId, { prompt: aiPlanPrompt.trim(), count: 3 })
      await loadDailyPlans(selectedLongTaskId)
      setAiPlanPrompt('')
      setSuccessMessage('AI 每日计划已生成')
    } catch (unknownError) {
      handleRequestError(unknownError, 'AI 生成每日计划失败')
    } finally {
      setAiPlanGenerating(false)
    }
  }

  // === 管理员：搜索筛选 ===
  const handleAdminSearch = () => {
    setAdminPage(1)
    void loadAdminUsers({ keyword: adminKeyword, role: adminRoleFilter, page: 1, pageSize: adminPageSize })
  }

  // === 管理员：分页 ===
  const handleAdminPageChange = (newPage: number) => {
    setAdminPage(newPage)
    void loadAdminUsers({ keyword: adminKeyword, role: adminRoleFilter, page: newPage, pageSize: adminPageSize })
  }

  // === 管理员：查看详情 ===
  const handleAdminViewDetail = async (id: number) => {
    setAdminDetailLoading(true)
    clearFeedback()
    try {
      const [detail, stats] = await Promise.all([adminApi.detail(id), adminApi.stats(id)])
      setAdminDetail({ detail, stats })
    } catch (unknownError) {
      handleRequestError(unknownError, '获取用户详情失败')
    } finally {
      setAdminDetailLoading(false)
    }
  }

  // === 管理员：改角色 ===
  const handleAdminUpdateRole = async (id: number, role: 'user' | 'admin') => {
    if (!window.confirm(`确定将该用户角色改为 ${role} 吗？`)) return
    clearFeedback()
    try {
      await adminApi.updateRole(id, { role })
      await loadAdminUsers({ keyword: adminKeyword, role: adminRoleFilter, page: adminPage, pageSize: adminPageSize })
      setSuccessMessage('用户角色已更新')
    } catch (unknownError) {
      handleRequestError(unknownError, '更新用户角色失败')
    }
  }

  // === 管理员：改状态 ===
  const handleAdminUpdateStatus = async (id: number, status: 'active' | 'disabled') => {
    if (!window.confirm(`确定将该用户状态改为 ${status === 'active' ? '启用' : '禁用'} 吗？`)) return
    clearFeedback()
    try {
      await adminApi.updateStatus(id, { status })
      await loadAdminUsers({ keyword: adminKeyword, role: adminRoleFilter, page: adminPage, pageSize: adminPageSize })
      setSuccessMessage('用户状态已更新')
    } catch (unknownError) {
      handleRequestError(unknownError, '更新用户状态失败')
    }
  }

  // === 管理员：删除用户 ===
  const handleAdminDeleteUser = async (id: number) => {
    if (!window.confirm('确定删除该用户吗？此操作不可撤销。')) return
    clearFeedback()
    try {
      await adminApi.remove(id)
      await loadAdminUsers({ keyword: adminKeyword, role: adminRoleFilter, page: adminPage, pageSize: adminPageSize })
      setSuccessMessage('用户已删除')
    } catch (unknownError) {
      handleRequestError(unknownError, '删除用户失败')
    }
  }

  // === 管理员：重置密码 ===
  const handleAdminResetPassword = async (id: number) => {
    const newPassword = window.prompt('请输入新密码（至少6位）')
    if (!newPassword || newPassword.length < 6) {
      if (newPassword !== null) setError('密码至少6位')
      return
    }
    clearFeedback()
    try {
      await adminApi.resetPassword(id, { newPassword })
      setSuccessMessage('用户密码已重置')
    } catch (unknownError) {
      handleRequestError(unknownError, '重置密码失败')
    }
  }

  // === 头像上传 ===
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('头像文件不能超过 2MB')
      return
    }
    setAvatarUploading(true)
    clearFeedback()
    try {
      const result = await profileApi.uploadAvatar(file)
      setProfile((current) => current ? { ...current, avatar: result.avatar } : current)
      setSuccessMessage('头像已更新')
    } catch (unknownError) {
      handleRequestError(unknownError, '上传头像失败')
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const renderFeedback = () => {
    if (error) {
      return <div className="feedback-banner is-error">{error}</div>
    }

    if (message) {
      return <div className="feedback-banner">{message}</div>
    }

    return null
  }

  const renderTodayView = () => {
    return (
      <>
        <header className="hero-banner glass-panel compact-hero">
          <div>
            <p className="eyebrow">今日任务</p>
            <h2>把最重要的事情安排进今天，减少拖延和切换成本。</h2>
            <p>当前页面已经接入真实 today-tasks 接口，支持创建、查询和完成状态切换。</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => void loadTodayTasks()}>
            同步今日任务
          </button>
        </header>

        {renderFeedback()}

        <section className="dashboard-grid">
          <article className="glass-panel metric-panel">
            <span className="eyebrow">完成</span>
            <strong>{completedCount}</strong>
            <p>今天已完成任务数</p>
          </article>
          <article className="glass-panel metric-panel">
            <span className="eyebrow">待办</span>
            <strong>{pendingCount}</strong>
            <p>今天仍待推进任务数</p>
          </article>
          <article className="glass-panel metric-panel">
            <span className="eyebrow">完成率</span>
            <strong>{completionRate}%</strong>
            <p>基于今日任务列表实时计算</p>
          </article>
          <article className="glass-panel metric-panel">
            <span className="eyebrow">上限</span>
            <strong>5</strong>
            <p>每日任务总数控制在 5 条内</p>
          </article>
        </section>

        <section className="feature-layout">
          <article className="glass-panel feature-panel feature-panel-large">
            <div className="section-head">
              <div>
                <p className="eyebrow">录入</p>
                <h3>新建今日任务</h3>
              </div>
              <button className="primary-button compact-button" type="button" onClick={() => void handleCreateTodayTask()} disabled={todaySubmitting}>
                {todaySubmitting ? '创建中...' : '创建任务'}
              </button>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <span>标题</span>
                <input value={todayForm.title} onChange={(event) => setTodayForm((current) => ({ ...current, title: event.target.value }))} type="text" />
              </div>
              <div className="form-field">
                <span>优先级</span>
                <select value={todayForm.priority} onChange={(event) => setTodayForm((current) => ({ ...current, priority: event.target.value as Priority }))}>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
              <div className="form-field form-field-full">
                <span>描述</span>
                <textarea value={todayForm.description} onChange={(event) => setTodayForm((current) => ({ ...current, description: event.target.value }))} placeholder="补充执行细节" />
              </div>
            </div>
          </article>

          <div className="feature-stack">
            <article className="glass-panel feature-panel">
              <p className="eyebrow">状态</p>
              <h3>完成节奏</h3>
              <strong className="feature-metric">{completionRate}%</strong>
              <p className="feature-copy">这里的数值来自今天任务列表的实时状态。</p>
            </article>
            <article className="glass-panel feature-panel">
              <p className="eyebrow">提醒</p>
              <h3>今日重点</h3>
              <p className="feature-copy">优先清掉高优先级任务，再处理低优先级的补充项。</p>
            </article>
          </div>
        </section>

        <section className="glass-panel timeline-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">今日清单</p>
              <h3>今日任务清单</h3>
            </div>
            <div className="filter-row">
              <input type="date" value={todayTaskDate} onChange={(e) => { setTodayTaskDate(e.target.value); void loadTodayTasks(e.target.value || undefined) }} className="date-input" />
              {todayTaskDate && <button className="pill-action" type="button" onClick={() => { setTodayTaskDate(''); void loadTodayTasks() }}>清除筛选</button>}
            </div>
          </div>

          {todayTasks.length ? (
            <div className="timeline-list">
              {todayTasks.map((task) => (
                <div key={task.id} className={`timeline-item-button ${task.isCompleted ? 'is-completed' : 'priority-' + task.priority}`}>
                  <div className="timeline-time" style={{cursor:'default'}}>{task.priority.toUpperCase()}</div>
                  <div className="timeline-content">
                    {editingTodayTaskId === task.id ? (
                      <>
                        <div className="edit-form-inline">
                          <input value={editingTodayTaskForm.title} onChange={(e) => setEditingTodayTaskForm((c) => ({ ...c, title: e.target.value }))} placeholder="标题" />
                          <select value={editingTodayTaskForm.priority} onChange={(e) => setEditingTodayTaskForm((c) => ({ ...c, priority: e.target.value as Priority }))}>
                            <option value="high">高</option><option value="medium">中</option><option value="low">低</option>
                          </select>
                          <textarea value={editingTodayTaskForm.description} onChange={(e) => setEditingTodayTaskForm((c) => ({ ...c, description: e.target.value }))} placeholder="描述" />
                          <div className="edit-actions">
                            <button className="primary-button compact-button" type="button" onClick={() => void handleSaveEditTodayTask(task.id)}>保存</button>
                            <button className="secondary-button compact-button" type="button" onClick={() => setEditingTodayTaskId(null)}>取消</button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="timeline-title-row">
                          <input type="checkbox" className="task-checkbox" checked={task.isCompleted} onChange={(e) => { e.stopPropagation(); void handleToggleTodayTask(task); }} />
                          <strong style={{textDecoration: task.isCompleted ? 'line-through' : 'none', opacity: task.isCompleted ? 0.6 : 1}}>{task.title}</strong>
                          <span className="pill">{priorityLabelMap[task.priority]}</span>
                          <span className="pill">{task.source}</span>
                        </div>
                        <p style={{opacity: task.isCompleted ? 0.5 : 1}}>{task.description || '暂无描述'}</p>
                        <div className="item-actions">
                          <small>{task.isCompleted ? '点击复选框可重新标记为未完成' : '点击复选框可标记为已完成'}</small>
                          <button className="pill-action" type="button" onClick={() => handleStartEditTodayTask(task)}>编辑</button>
                          <button className="pill-action is-danger" type="button" onClick={() => void handleDeleteTodayTask(task.id)}>删除</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-panel">今天还没有任务，先创建一条吧。</div>
          )}
        </section>
      </>
    )
  }

  const renderLongView = () => {
    return (
      <>
        <header className="hero-banner glass-panel compact-hero">
          <div>
            <p className="eyebrow">长期任务</p>
            <h2>把长期目标拆成持续推进的任务和每日计划，减少方向感丢失。</h2>
            <p>当前页面已经接入真实 long-tasks 与 daily-plans 接口。</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => void loadLongTasks()}>
            同步长期任务
          </button>
        </header>

        {renderFeedback()}

        <section className="dashboard-grid">
          <article className="glass-panel metric-panel">
            <span className="eyebrow">进行中</span>
            <strong>{activeLongTasks.length}</strong>
            <p>尚未完成的长期任务</p>
          </article>
          <article className="glass-panel metric-panel">
            <span className="eyebrow">已完成</span>
            <strong>{completedLongTasks.length}</strong>
            <p>已经收尾的目标</p>
          </article>
          <article className="glass-panel metric-panel">
            <span className="eyebrow">总任务</span>
            <strong>{longTasks.length}</strong>
            <p>长期任务总量</p>
          </article>
          <article className="glass-panel metric-panel">
            <span className="eyebrow">今日计划</span>
            <strong>{selectedDailyPlans.length}</strong>
            <p>当前选中长期任务的计划数</p>
          </article>
        </section>

        <section className="feature-layout">
          <article className="glass-panel feature-panel feature-panel-large">
            <div className="section-head">
              <div>
                <p className="eyebrow">录入</p>
                <h3>新增长期任务</h3>
              </div>
              <button className="primary-button compact-button" type="button" onClick={() => void handleCreateLongTask()} disabled={longSubmitting}>
                {longSubmitting ? '创建中...' : '创建长期任务'}
              </button>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <span>标题</span>
                <input value={longForm.title} onChange={(event) => setLongForm((current) => ({ ...current, title: event.target.value }))} type="text" />
              </div>
              <div className="form-field">
                <span>优先级</span>
                <select value={longForm.priority} onChange={(event) => setLongForm((current) => ({ ...current, priority: event.target.value as Priority }))}>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
              <div className="form-field form-field-full">
                <span>描述</span>
                <textarea value={longForm.description} onChange={(event) => setLongForm((current) => ({ ...current, description: event.target.value }))} placeholder="写下阶段目标和推进方式" />
              </div>
            </div>
          </article>

          <div className="feature-stack">
            <article className="glass-panel feature-panel">
              <p className="eyebrow">进行中</p>
              <h3>进行中任务</h3>
              <strong className="feature-metric">{activeLongTasks.length}</strong>
              <p className="feature-copy">持续推进比一次性冲刺更重要。</p>
            </article>
            <article className="glass-panel feature-panel">
              <p className="eyebrow">Done</p>
              <h3>已完成长期任务</h3>
              <strong className="feature-metric">{completedLongTasks.length}</strong>
              <p className="feature-copy">保持节奏，你的长期目标会越来越清晰。</p>
            </article>
          </div>
        </section>

        <section className="feature-layout">
          <section className="glass-panel timeline-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">长期任务</p>
                <h3>目标列表</h3>
              </div>
            </div>

            {longTasks.length ? (
              <div className="timeline-list">
                {longTasks.map((task) => (
                  <div key={task.id} className={`timeline-item-button ${selectedLongTaskId === task.id ? 'is-selected' : ''} ${task.isCheckedToday ? 'is-checked-today' : 'priority-' + task.priority}`.trim()}>
                    <div className="timeline-time" onClick={() => void handleSelectLongTask(task.id)} style={{cursor:'pointer'}}>{task.priority.toUpperCase()}</div>
                    <div className="timeline-content">
                      {editingLongTaskId === task.id ? (
                        <div className="edit-form-inline">
                          <input value={editingLongTaskForm.title} onChange={(e) => setEditingLongTaskForm((c) => ({ ...c, title: e.target.value }))} placeholder="标题" />
                          <select value={editingLongTaskForm.priority} onChange={(e) => setEditingLongTaskForm((c) => ({ ...c, priority: e.target.value as Priority }))}>
                            <option value="high">高</option><option value="medium">中</option><option value="low">低</option>
                          </select>
                          <textarea value={editingLongTaskForm.description} onChange={(e) => setEditingLongTaskForm((c) => ({ ...c, description: e.target.value }))} placeholder="描述" />
                          <div className="edit-actions">
                            <button className="primary-button compact-button" type="button" onClick={() => void handleSaveEditLongTask(task.id)}>保存</button>
                            <button className="secondary-button compact-button" type="button" onClick={() => setEditingLongTaskId(null)}>取消</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="timeline-title-row" onClick={() => void handleSelectLongTask(task.id)} style={{cursor:'pointer'}}>
                            <input type="checkbox" className="task-checkbox" checked={!!task.isCheckedToday} onChange={(e) => { e.stopPropagation(); void handleToggleLongTask(task); }} />
                            <strong style={{textDecoration: task.isCheckedToday ? 'line-through' : 'none', opacity: task.isCheckedToday ? 0.6 : 1}}>{task.title}</strong>
                            <span className="pill">{task.isCheckedToday ? '已打卡' : '待打卡'}</span>
                          </div>
                          <p onClick={() => void handleSelectLongTask(task.id)} style={{cursor:'pointer', opacity: task.isCheckedToday ? 0.5 : 1}}>{task.description || '暂无描述'}</p>
                          <div className="item-actions">
                            <small onClick={() => void handleSelectLongTask(task.id)} style={{cursor:'pointer'}}>创建于 {formatDate(task.createdAt)}</small>
                            <button className="pill-action" type="button" onClick={() => handleStartEditLongTask(task)}>编辑</button>
                            <button className="pill-action is-danger" type="button" onClick={() => void handleDeleteLongTask(task.id)}>删除</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-panel">还没有长期任务，先创建一个目标。</div>
            )}
          </section>

          <section className="glass-panel timeline-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">每日计划</p>
                <h3>拆解节奏</h3>
              </div>
              {selectedLongTaskId && (
                <button className="primary-button compact-button" type="button" onClick={() => void handleAiGeneratePlans()} disabled={aiPlanGenerating}>
                  {aiPlanGenerating ? '生成中...' : 'AI 生成'}
                </button>
              )}
            </div>

            {selectedLongTaskId && (
              <div className="ai-generate-area">
                <textarea value={aiPlanPrompt} onChange={(e) => setAiPlanPrompt(e.target.value)} placeholder="输入提示，AI 将为你生成每日计划..." className="ai-generate-textarea" rows={3} />
              </div>
            )}

            {selectedDailyPlans.length ? (
              <div className="timeline-list">
                {selectedDailyPlans.map((plan) => (
                  <div key={plan.id} className={plan.isCompleted ? 'timeline-item is-done' : 'timeline-item'}>
                    <div className="timeline-time">
                      <input type="checkbox" checked={plan.isCompleted} onChange={() => void handleToggleDailyPlan(plan)} className="plan-checkbox" />
                      <span>{formatDate(plan.planDate)}</span>
                    </div>
                    <div className="timeline-content">
                      {editingDailyPlanId === plan.id ? (
                        <div className="edit-form-inline">
                          <input value={editingDailyPlanForm.content} onChange={(e) => setEditingDailyPlanForm((c) => ({ ...c, content: e.target.value }))} placeholder="计划内容" />
                          <div className="edit-actions">
                            <button className="primary-button compact-button" type="button" onClick={() => void handleSaveEditDailyPlan(plan.id)}>保存</button>
                            <button className="secondary-button compact-button" type="button" onClick={() => setEditingDailyPlanId(null)}>取消</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <strong>{plan.content}</strong>
                          <div className="item-actions">
                            <p>{plan.isCompleted ? '已完成' : '待推进'}</p>
                            <button className="pill-action" type="button" onClick={() => handleStartEditDailyPlan(plan)}>编辑</button>
                            <button className="pill-action is-danger" type="button" onClick={() => void handleDeleteDailyPlan(plan.id)}>删除</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-panel">当前长期任务还没有每日计划。</div>
            )}
          </section>
        </section>
      </>
    )
  }

  const renderAiView = () => {
    return (
      <>
        <header className="hero-banner glass-panel compact-hero">
          <div>
            <p className="eyebrow">AI 规划</p>
            <h2>把一句模糊的目标，拆成今天能做和中长期要推进的事项。</h2>
            <p>这里会并行调用今日任务与长期任务的 AI 建议接口。</p>
          </div>
        </header>

        {renderFeedback()}

        <section className="feature-layout">
          <article className="glass-panel feature-panel feature-panel-large">
            <div className="section-head">
              <div>
                <p className="eyebrow">输入</p>
                <h3>给 AI 一句话需求</h3>
              </div>
            </div>
            <div className="config-grid single-column-grid">
              <div className="config-tile form-tile ai-prompt-tile">
                <span>目标描述</span>
                <textarea value={aiPromptInput} onChange={(event) => setAiPromptInput(event.target.value)} className="prompt-textarea" placeholder="例如：我想在这周内把毕业设计推进到可以验收的程度" />
                <div className="ai-prompt-actions">
                  <button className="secondary-button" type="button" onClick={() => void handleGenerateAiSuggestions()} disabled={aiGenerating}>
                    {aiGenerating ? '生成中...' : '立即生成建议'}
                  </button>
                </div>
              </div>
            </div>
          </article>

          <div className="feature-stack">
            <article className="glass-panel feature-panel">
              <p className="eyebrow">调用</p>
              <h3>建议来源</h3>
              <p className="feature-copy">系统会同时生成适合加入今日任务和长期任务的建议列表。</p>
            </article>
            <article className="glass-panel feature-panel">
              <p className="eyebrow">状态</p>
              <h3>建议条数</h3>
              <strong className="feature-metric">{aiSuggestions.length}</strong>
              <p className="feature-copy">生成后可单条加入任务列表。</p>
            </article>
          </div>
        </section>

        <section className="glass-panel timeline-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">结果</p>
              <h3>AI 建议列表</h3>
            </div>
          </div>

          {aiSuggestions.length ? (
            <div className="timeline-list">
              {aiSuggestions.map((item, index) => (
                <div key={`${item.type}-${item.title}-${index}`} className="admin-row">
                  <div className="admin-row-main">
                    <div className="timeline-title-row">
                      <strong>{item.title}</strong>
                      <span className="pill">{item.type === 'today' ? '今日任务' : '长期任务'}</span>
                      <span className="pill">{priorityLabelMap[item.priority]}</span>
                    </div>
                    <p className="feature-copy">{item.description || '暂无描述'}</p>
                  </div>
                  <button className="primary-button compact-button" type="button" onClick={() => void handleApplySuggestion(item)}>
                    加入列表
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-panel">还没有 AI 建议，先输入目标再生成。</div>
          )}
        </section>
      </>
    )
  }

  const renderProfileView = () => {
    return (
      <>
        <header className="hero-banner glass-panel compact-hero">
          <div>
            <h2>个人设置</h2>
            <p>管理你的资料和 AI 配置</p>
          </div>
        </header>

        {renderFeedback()}

        <section className="feature-layout">
          <article className="glass-panel feature-panel feature-panel-large">
            <div className="profile-hero-card">
              <div className="profile-avatar" onClick={() => avatarInputRef.current?.click()} style={{cursor:'pointer', position:'relative'}}>
                {profile?.avatar ? <img src={profile.avatar.startsWith('http') ? profile.avatar : `${baseURL}${profile.avatar}`} alt="头像" className="avatar-img" /> : (profile?.username?.slice(0, 2).toUpperCase() ?? 'PM')}
                <span className="avatar-upload-hint">更换</span>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{display:'none'}} onChange={(e) => void handleAvatarUpload(e)} />
              <div>
                <strong>{profile?.username ?? user?.username ?? '未登录用户'}</strong>
                <p>{profile?.email ?? '暂无邮箱'} · 角色 {profile?.role ?? user?.role ?? 'user'}</p>
                {avatarUploading && <small>上传中...</small>}
              </div>
            </div>

            <div className="config-grid single-column-grid">
              <div className="config-tile form-tile">
                <span>用户名</span>
                <input value={profileForm.username} onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))} type="text" />
              </div>
              <div className="config-tile form-tile">
                <span>邮箱</span>
                <input value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} type="email" />
              </div>
              <button className="primary-button profile-submit-button" type="button" onClick={() => void handleSaveProfile()} disabled={profileSubmitting}>
                {profileSubmitting ? '保存中...' : '保存资料'}
              </button>
            </div>
          </article>

          <div className="feature-stack">
            <article className="glass-panel feature-panel">
              <p className="eyebrow">统计</p>
              <h3>本周完成</h3>
              <strong className="feature-metric">{profileStats?.weekCompletedTasks ?? '-'}</strong>
              <p className="feature-copy">最近 7 天完成的任务总数。</p>
            </article>
            <article className="glass-panel feature-panel">
              <p className="eyebrow">统计</p>
              <h3>今日完成率</h3>
              <strong className="feature-metric">{profileStats?.todayTasksCompletionRate ?? '-'}%</strong>
              <p className="feature-copy">只统计今日任务维度的完成情况。</p>
            </article>
          </div>
        </section>

        <section className="feature-layout">
          <article className="glass-panel feature-panel feature-panel-large">
            <div className="section-head">
              <div>
                <p className="eyebrow">AI</p>
                <h3>AI 接入配置</h3>
              </div>
              <button className="secondary-button compact-button" type="button" onClick={() => void handleSaveAiConfig()} disabled={aiSubmitting}>
                {aiSubmitting ? '保存中...' : '保存 AI 配置'}
              </button>
            </div>

            <div className="config-grid">
              <div className="config-tile form-tile">
                <span>AI 供应商</span>
                <input value={aiConfigForm.provider} onChange={(event) => setAiConfigForm((current) => ({ ...current, provider: event.target.value }))} type="text" placeholder="例如：openai、anthropic" />
              </div>
              <div className="config-tile form-tile">
                <span>AI 模型</span>
                <input value={aiConfigForm.model} onChange={(event) => setAiConfigForm((current) => ({ ...current, model: event.target.value }))} type="text" placeholder="例如：gpt-4o、claude-3-sonnet" />
              </div>
              <div className="config-tile form-tile">
                <span>接口地址</span>
                <input value={aiConfigForm.baseUrl} onChange={(event) => setAiConfigForm((current) => ({ ...current, baseUrl: event.target.value }))} type="text" placeholder="完整地址，例如：https://api.openai.com/v1" />
              </div>
              <div className="config-tile form-tile">
                <span>密钥</span>
                <input value={aiConfigForm.apiKey} onChange={(event) => setAiConfigForm((current) => ({ ...current, apiKey: event.target.value }))} type="password" placeholder="留空则保持不变" />
              </div>
              <div className="config-tile form-tile form-field-full">
                <span>个人 AI 提示词</span>
                <textarea value={aiConfigForm.aiPrompt} onChange={(event) => setAiConfigForm((current) => ({ ...current, aiPrompt: event.target.value }))} />
              </div>
            </div>
          </article>

          <div className="feature-stack">
            <article className="glass-panel feature-panel">
              <p className="eyebrow">趋势</p>
              <h3>周趋势</h3>
              {(() => {
                const trend = profileStats?.trend ?? [];
                const w = 320, h = 120, px = 20, py = 18;
                const maxVal = Math.max(1, ...trend.map((t) => t.completedCount));
                const xStep = trend.length > 1 ? (w - px * 2) / (trend.length - 1) : 0;
                const polyStr = trend.map((t, i) => `${px + i * xStep},${h - py - 14 - (t.completedCount / maxVal) * (h - py * 2 - 14)}`).join(' ');
                const areaStr = trend.length
                  ? `${px},${h - py - 14} ${polyStr} ${px + (trend.length - 1) * xStep},${h - py - 14}`
                  : '';
                const labelY = h - 4;
                return (
                  <>
                    <table className="trend-table">
                      <thead>
                        <tr>{trend.map((t) => <th key={t.date}>{t.date.slice(5)}</th>)}</tr>
                      </thead>
                      <tbody>
                        <tr>{trend.map((t) => <td key={t.date} className={t.completedCount > 0 ? 'trend-active' : ''}>{t.completedCount}</td>)}</tr>
                      </tbody>
                    </table>
                    <svg className="trend-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
                      <polygon points={areaStr} className="trend-area" />
                      <polyline points={polyStr} className="trend-line" />
                      {trend.map((t, i) => (<circle key={t.date} cx={px + i * xStep} cy={h - py - 14 - (t.completedCount / maxVal) * (h - py * 2 - 14)} r="3" className="trend-dot" />))}
                      {trend.map((t, i) => (<text key={t.date} x={px + i * xStep} y={labelY} textAnchor="middle" className="trend-label">{t.date.slice(5)}</text>))}
                    </svg>
                  </>
                );
              })()}
              {!profileStats?.trend?.length && <p className="feature-copy">暂无趋势数据</p>}
            </article>
            <article className="glass-panel feature-panel">
              <p className="eyebrow">统计</p>
              <h3>任务总量</h3>
              <strong className="feature-metric">{profileStats?.totalTaskCount ?? '-'}</strong>
              <p className="feature-copy">用于观察近期任务承载量。</p>
            </article>
          </div>
        </section>
      </>
    )
  }

  const renderAdminView = () => {
    const adminTotalPages = Math.ceil(adminTotal / adminPageSize)
    return (
      <>
        <section className="admin-header-row">
          <h2 className="admin-page-title">用户管理</h2>
          <button className="secondary-button compact-button" type="button" onClick={() => void loadAdminUsers({ keyword: adminKeyword, role: adminRoleFilter, page: adminPage, pageSize: adminPageSize })}>
            同步用户列表
          </button>
        </section>

        {renderFeedback()}

        <section className="admin-filter-bar">
          <input value={adminKeyword} onChange={(e) => setAdminKeyword(e.target.value)} placeholder="搜索用户名/邮箱" className="admin-search-input" onKeyDown={(e) => { if (e.key === 'Enter') handleAdminSearch() }} />
          <select value={adminRoleFilter} onChange={(e) => { setAdminRoleFilter(e.target.value as '' | 'user' | 'admin'); setAdminPage(1); void loadAdminUsers({ keyword: adminKeyword, role: (e.target.value || undefined) as '' | 'user' | 'admin' | undefined, page: 1, pageSize: adminPageSize }) }} className="admin-filter-select">
            <option value="">全部角色</option>
            <option value="admin">管理员</option>
            <option value="user">普通用户</option>
          </select>
          <button className="primary-button compact-button" type="button" onClick={handleAdminSearch}>搜索</button>
        </section>

        <section className="admin-table-shell">
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  {adminColumns.map((column) => (
                    <th key={column.key} className={column.align === 'center' ? 'is-center' : undefined}>
                      <div className={column.align === 'center' ? 'admin-th-content is-center' : 'admin-th-content'}>
                        <span>{column.label}</span>
                        <span
                          aria-hidden="true"
                          className="admin-column-resizer"
                          onMouseDown={(event) => handleAdminColumnResizeStart(column.key, event)}
                        />
                      </div>
                    </th>
                  ))}
                  <th className="is-center"><div className="admin-th-content is-center"><span>操作</span></div></th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.length ? (
                  adminUsers.map((adminUser) => (
                    <tr key={adminUser.id}>
                      <td className="is-center">{adminUser.id}</td>
                      <td>{adminUser.username}</td>
                      <td>{adminUser.email}</td>
                      <td className="is-center">
                        <span className={adminUser.role === 'admin' ? 'admin-tag role-admin' : 'admin-tag role-user'}>{adminUser.role}</span>
                      </td>
                      <td className="is-center">
                        <span className={adminUser.status === 'active' ? 'admin-tag status-active' : 'admin-tag status-inactive'}>{adminUser.status}</span>
                      </td>
                      <td className="is-center">{formatAdminDate(adminUser.createdAt)}</td>
                      <td className="is-center">
                        <div className="admin-actions">
                          <button className="admin-action-btn" type="button" onClick={() => void handleAdminViewDetail(adminUser.id)} title="查看详情">详情</button>
                          <button className="admin-action-btn" type="button" onClick={() => void handleAdminUpdateRole(adminUser.id, adminUser.role === 'admin' ? 'user' : 'admin')} title="切换角色">改角色</button>
                          <button className="admin-action-btn" type="button" onClick={() => void handleAdminUpdateStatus(adminUser.id, adminUser.status === 'active' ? 'disabled' : 'active')} title="切换状态">{adminUser.status === 'active' ? '禁用' : '启用'}</button>
                          <button className="admin-action-btn" type="button" onClick={() => void handleAdminResetPassword(adminUser.id)} title="重置密码">重置密码</button>
                          <button className="admin-action-btn is-danger" type="button" onClick={() => void handleAdminDeleteUser(adminUser.id)} title="删除用户">删除</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="admin-table-empty" colSpan={adminColumns.length + 1}>暂无用户数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {adminTotalPages > 1 && (
          <section className="admin-pagination">
            <button className="pill-action" type="button" disabled={adminPage <= 1} onClick={() => handleAdminPageChange(adminPage - 1)}>上一页</button>
            <span className="pagination-info">第 {adminPage} / {adminTotalPages} 页（共 {adminTotal} 条）</span>
            <button className="pill-action" type="button" disabled={adminPage >= adminTotalPages} onClick={() => handleAdminPageChange(adminPage + 1)}>下一页</button>
          </section>
        )}

        {adminDetail && (
          <section className="admin-detail-modal glass-panel">
            <div className="admin-detail-header">
              <h3>用户详情</h3>
              <button className="secondary-button compact-button" type="button" onClick={() => setAdminDetail(null)}>关闭</button>
            </div>
            <div className="admin-detail-body">
              <div className="admin-detail-row"><span className="admin-detail-label">ID</span><span>{adminDetail.detail.id}</span></div>
              <div className="admin-detail-row"><span className="admin-detail-label">用户名</span><span>{adminDetail.detail.username}</span></div>
              <div className="admin-detail-row"><span className="admin-detail-label">邮箱</span><span>{adminDetail.detail.email}</span></div>
              <div className="admin-detail-row"><span className="admin-detail-label">角色</span><span>{adminDetail.detail.role}</span></div>
              <div className="admin-detail-row"><span className="admin-detail-label">创建时间</span><span>{formatAdminDate(adminDetail.detail.createdAt)}</span></div>
              <div className="admin-detail-row"><span className="admin-detail-label">任务总数</span><span>{adminDetail.stats.totalTaskCount}</span></div>
              <div className="admin-detail-row"><span className="admin-detail-label">已完成</span><span>{adminDetail.stats.completedTaskCount}</span></div>
              <div className="admin-detail-row"><span className="admin-detail-label">完成率</span><span>{adminDetail.stats.completionRate}%</span></div>
            </div>
          </section>
        )}
      </>
    )
  }

  const renderWorkspace = () => {
    return (
      <div className="app-shell dashboard-screen">
        <div className="page-glow page-glow-left" />
        <div className="page-glow page-glow-right" />

        <div className="dashboard-layout">
          <aside className="sidebar glass-panel">
            <div className="sidebar-brand">
              <div className="brand-mark">
                {profile?.avatar ? <img src={profile.avatar.startsWith('http') ? profile.avatar : baseURL + profile.avatar} alt="" /> : 'PM'}
              </div>
              <div>
                <strong>Plan Mate</strong>
                <p>真实数据工作台</p>
              </div>
            </div>

            <nav className="sidebar-nav">
              {visibleNavItems.map((item) => {
                const Icon = navIconMap[item.key]
                const isActive = activeView === item.key

                return (
                  <button key={item.key} className={isActive ? 'nav-item is-active' : 'nav-item'} type="button" onClick={() => handleViewChange(item.key)}>
                    <span className="nav-icon"><Icon size={18} /></span>
                    <span className="nav-copy">
                      <strong>{item.label}</strong>
                    </span>
                  </button>
                )
              })}
            </nav>

            <div className="sidebar-footer">
              <div>
                <strong>{user?.username ?? '未登录用户'}</strong>
                <p>角色 {user?.role ?? 'user'}</p>
              </div>
              <button className="secondary-button" type="button" onClick={logout}>
                退出登录
              </button>
            </div>
          </aside>

          <main className="workspace">
            {loadingPage ? (
              <div className="loading-overlay glass-panel">
                <LoaderCircle className="spin-icon" size={18} />
                <span>正在同步工作台数据...</span>
              </div>
            ) : null}

            {activeView === 'today' ? renderTodayView() : null}
            {activeView === 'long' ? renderLongView() : null}
            {activeView === 'ai' ? renderAiView() : null}
            {activeView === 'profile' ? renderProfileView() : null}
            {activeView === 'admin' ? renderAdminView() : null}
          </main>
        </div>
      </div>
    )
  }

  if (!isAuthed) {
    return (
      <div className="app-shell auth-screen">
        <div className="page-glow page-glow-left" />
        <div className="page-glow page-glow-right" />

        <main className="auth-layout">
          <section className="auth-hero glass-panel">
            <p className="eyebrow">Plan Mate</p>
            <h1>把任务拆成可执行的一天，也把长期目标真正推进下去。</h1>
            <p className="auth-copy">
              当前认证页已经接入真实注册和登录接口，登录成功后会自动拉取你的任务、资料和 AI 配置。
            </p>

            <div className="auth-highlight-list">
              {authHighlights.map((item) => (
                <div key={item} className="auth-highlight-item">
                  <Sparkles size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="auth-panel glass-panel">
            <div className="auth-switch">
              <button
                className={authMode === 'login' ? 'auth-tab is-active' : 'auth-tab'}
                type="button"
                onClick={() => setAuthMode('login')}
              >
                登录
              </button>
              <button
                className={authMode === 'register' ? 'auth-tab is-active' : 'auth-tab'}
                type="button"
                onClick={() => setAuthMode('register')}
              >
                注册
              </button>
            </div>

            <div className="auth-header">
              <h2>{authMode === 'login' ? '欢迎回来' : '创建你的任务空间'}</h2>
              <p>
                {authMode === 'login'
                  ? '输入邮箱和密码即可进入已对接真实数据的工作台。'
                  : '注册完成后会直接拿到登录态并进入系统。'}
              </p>
            </div>

            {renderFeedback()}

            <form className="auth-form" onSubmit={(event) => {
              event.preventDefault()
              void handleAuthSubmit()
            }}>
              {authMode === 'register' ? (
                <label className="field-block">
                  <span>用户名</span>
                  <input
                    value={authForm.username}
                    onChange={(event) => setAuthForm((current) => ({ ...current, username: event.target.value }))}
                    placeholder="例如：PlanMate 用户"
                    type="text"
                  />
                </label>
              ) : null}

              <label className="field-block">
                <span>邮箱</span>
                <input
                  value={authForm.email}
                  onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="you@example.com"
                  type="email"
                />
              </label>

              <label className="field-block">
                <span>密码</span>
                <input
                  value={authForm.password}
                  onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="请输入密码"
                  type="password"
                />
              </label>

              <button className="primary-button" type="submit" disabled={authLoading}>
                {authLoading ? '处理中...' : authMode === 'login' ? '立即登录' : '创建账号'}
              </button>
            </form>
          </section>
        </main>
      </div>
    )
  }

  return renderWorkspace()
}

export default App
