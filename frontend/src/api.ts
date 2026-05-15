import axios from 'axios'
import { useAuthStore } from '@/auth-store'

export const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export const http = axios.create({
  baseURL,
  timeout: 15000,
})

let authToken: string | null = null

export const setAuthToken = (token: string | null) => {
  authToken = token
}

http.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status

    if (status === 401) {
      useAuthStore.getState().logout()
    }

    return Promise.reject(error)
  },
)

export type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

export const unwrapResponse = async <T>(promise: Promise<{ data: ApiEnvelope<T> }>) => {
  const response = await promise

  if (typeof response.data?.code === 'number' && response.data.code !== 200) {
    throw new Error(response.data.message || '请求失败')
  }

  return response.data.data
}
