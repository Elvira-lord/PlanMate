import { unwrapResponse, http } from '@/api'

export type AuthPayload = {
  id: number
  username: string
  token: string
  role: 'user' | 'admin'
}

export type TodayTaskItem = {
  id: number
  title: string
  description: string | null
  priority: 'high' | 'medium' | 'low'
  isCompleted: boolean
  taskDate: string
  originalDate: string
  carryOverCount: number
  sortOrder: number
  source: 'manual' | 'ai'
  createdAt: string
  updatedAt: string
}

export type TodayTasksResponse = {
  list: TodayTaskItem[]
  total: number
}

export type LongTaskItem = {
  id: number
  title: string
  description: string | null
  priority: 'high' | 'medium' | 'low'
  isCompleted: boolean
  startDate: string
  source: 'manual' | 'ai'
  createdAt: string
  updatedAt: string
  isCheckedToday?: boolean
}

export type LongTasksResponse = {
  list: LongTaskItem[]
  total: number
}

export type DailyPlanItem = {
  id: number
  content: string
  planDate: string
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}

export type DailyPlansResponse = {
  list: DailyPlanItem[]
  total: number
}

export type AiSuggestionItem = {
  title: string
  description?: string
  priority: 'high' | 'medium' | 'low'
}

export type AiSuggestionsResponse = {
  list: AiSuggestionItem[]
  count: number
}

export type ProfileResponse = {
  id: number
  username: string
  email: string
  avatar: string | null
  role: 'user' | 'admin'
  aiPrompt: string | null
  aiProvider: string | null
  aiModel: string | null
  aiBaseUrl: string | null
  createdAt: string
}

export type ProfileStatsResponse = {
  totalTaskCount: number
  completedTaskCount: number
  completionRate: number
  weekCompletedTasks?: number
  todayTasksCompletionRate?: number
  trend: Array<{
    date: string
    completedCount: number
  }>
}

export type AdminUserItem = {
  id: number
  username: string
  email: string
  role: 'user' | 'admin'
  status: 'active' | 'disabled'
  createdAt: string
}

export type AdminUserListResponse = {
  list: AdminUserItem[]
  total: number
  page: number
  pageSize: number
}

export type AdminUserDetailResponse = AdminUserItem & {
  avatar: string | null
  aiPrompt: string | null
  updatedAt: string
}

export type AdminUserStatsResponse = ProfileStatsResponse

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    unwrapResponse<AuthPayload>(http.post('/plan/auth/login', payload)),
  register: (payload: { username: string; email: string; password: string }) =>
    unwrapResponse<AuthPayload>(http.post('/plan/auth/register', payload)),
}

export const todayTasksApi = {
  list: (params?: { taskDate?: string; isCompleted?: boolean }) =>
    unwrapResponse<TodayTasksResponse>(http.get('/plan/today-tasks', { params })),
  create: (payload: {
    title: string
    description?: string
    priority: 'high' | 'medium' | 'low'
    taskDate?: string
    sortOrder?: number
    source?: 'manual' | 'ai'
  }) => unwrapResponse<TodayTaskItem>(http.post('/plan/today-tasks', payload)),
  update: (
    id: number,
    payload: {
      title?: string
      description?: string
      priority?: 'high' | 'medium' | 'low'
      isCompleted?: boolean
      sortOrder?: number
    },
  ) => unwrapResponse<TodayTaskItem>(http.put(`/plan/today-tasks/${id}`, payload)),
  remove: (id: number) => unwrapResponse<{ id: number }>(http.delete(`/plan/today-tasks/${id}`)),
  clear: (payload?: { taskDate?: string }) =>
    unwrapResponse<{ deletedCount: number }>(http.post('/plan/today-tasks/clear', payload ?? {})),
  generate: (payload: { prompt: string; taskDate?: string; count?: number }) =>
    unwrapResponse<AiSuggestionsResponse>(http.post('/plan/today-tasks/ai-generate', payload)),
}

export const longTasksApi = {
  list: (params?: { isCompleted?: boolean }) =>
    unwrapResponse<LongTasksResponse>(http.get('/plan/long-tasks', { params })),
  create: (payload: {
    title: string
    description?: string
    priority: 'high' | 'medium' | 'low'
    startDate?: string
    source?: 'manual' | 'ai'
  }) => unwrapResponse<LongTaskItem>(http.post('/plan/long-tasks', payload)),
  update: (
    id: number,
    payload: {
      title?: string
      description?: string
      priority?: 'high' | 'medium' | 'low'
      startDate?: string
      isCompleted?: boolean
    },
  ) => unwrapResponse<LongTaskItem>(http.put(`/plan/long-tasks/${id}`, payload)),
  remove: (id: number) => unwrapResponse<{ id: number }>(http.delete(`/plan/long-tasks/${id}`)),
  clear: () => unwrapResponse<{ deletedCount: number }>(http.post('/plan/long-tasks/clear', {})),
  generate: (payload: { prompt: string; count?: number }) =>
    unwrapResponse<AiSuggestionsResponse>(http.post('/plan/long-tasks/ai-generate', payload)),
  checkin: (id: number, date?: string) =>
    unwrapResponse<{ longTaskId: number; checkDate: string; checked: boolean }>(http.post(`/plan/long-tasks/${id}/checkin`, { date })),
}

export const dailyPlansApi = {
  list: (longTaskId: number) =>
    unwrapResponse<DailyPlansResponse>(http.get(`/plan/long-tasks/${longTaskId}/daily-plans`)),
  create: (longTaskId: number, payload: { content: string; planDate: string }) =>
    unwrapResponse<DailyPlanItem>(http.post(`/plan/long-tasks/${longTaskId}/daily-plans`, payload)),
  update: (
    id: number,
    payload: { content?: string; planDate?: string; isCompleted?: boolean },
  ) => unwrapResponse<DailyPlanItem>(http.put(`/plan/daily-plans/${id}`, payload)),
  remove: (id: number) => unwrapResponse<{ id: number }>(http.delete(`/plan/daily-plans/${id}`)),
  generate: (longTaskId: number, payload: { prompt: string; count?: number }) =>
    unwrapResponse<AiSuggestionsResponse>(
      http.post(`/plan/long-tasks/${longTaskId}/daily-plans/ai-generate`, payload),
    ),
}

export const profileApi = {
  get: () => unwrapResponse<ProfileResponse>(http.get('/plan/profile')),
  stats: (params?: { periodType?: 'weekly' | 'monthly' | 'yearly' }) =>
    unwrapResponse<ProfileStatsResponse>(http.get('/plan/profile/stats', { params })),
  update: (payload: { username?: string; email?: string }) =>
    unwrapResponse<{ id: number; username: string; email: string; updatedAt: string }>(
      http.put('/plan/profile', payload),
    ),
  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return unwrapResponse<{ avatar: string | null; updatedAt: string }>(
      http.post('/plan/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),
    )
  },
  updatePassword: (payload: { currentPassword: string; newPassword: string }) =>
    unwrapResponse<{ updatedAt: string }>(http.put('/plan/profile/password', payload)),
  updateAiPrompt: (payload: { aiPrompt: string }) =>
    unwrapResponse<{ aiPrompt: string; updatedAt: string }>(http.put('/plan/profile/ai-prompt', payload)),
  updateAiConfig: (payload: {
    provider?: string
    model?: string
    baseUrl?: string
    apiKey: string
  }) => unwrapResponse<{ provider: string | null; model: string | null; baseUrl: string | null; apiKey: string; updatedAt: string }>(http.put('/plan/profile/ai-config', payload)),
}

export const adminApi = {
  users: (params?: { keyword?: string; role?: 'user' | 'admin'; page?: number; pageSize?: number }) =>
    unwrapResponse<AdminUserListResponse>(http.get('/plan/admin/users', { params })),
  detail: (id: number) => unwrapResponse<AdminUserDetailResponse>(http.get(`/plan/admin/users/${id}`)),
  stats: (id: number, params?: { periodType?: 'weekly' | 'monthly' | 'yearly' }) =>
    unwrapResponse<AdminUserStatsResponse>(http.get(`/plan/admin/users/${id}/stats`, { params })),
  updateRole: (id: number, payload: { role: 'user' | 'admin' }) =>
    unwrapResponse<AdminUserItem>(http.put(`/plan/admin/users/${id}`, payload)),
  updateStatus: (id: number, payload: { status: 'active' | 'disabled' }) =>
    unwrapResponse<AdminUserItem>(http.patch(`/plan/admin/users/${id}/status`, payload)),
  remove: (id: number) => unwrapResponse<{ id: number }>(http.delete(`/plan/admin/users/${id}`)),
  resetPassword: (id: number, payload: { newPassword: string }) =>
    unwrapResponse<{ id: number; updatedAt: string }>(http.post(`/plan/admin/users/${id}/reset-password`, payload)),
}
