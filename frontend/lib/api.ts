import axios, { AxiosInstance, AxiosError } from 'axios'
import { TokenResponse, LoginCredentials, RegisterData, User, Team, TeamCreate, Project, ProjectCreate, Task, TaskCreate, TaskUpdate } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// ==================== TOKEN MANAGEMENT ====================
// Store access token in memory
// Refresh token stored in httpOnly cookie by server

let accessToken: string | null = null

export const tokenManager = {
  getToken: () => accessToken,
  setToken: (token: string) => { accessToken = token },
  clearToken: () => { accessToken = null },
}

// ==================== AXIOS INSTANCE ====================

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, 
})

// Request interceptor - attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = tokenManager.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - auto-refresh token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh using stored refresh token
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')

        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refresh_token: refreshToken
        })

        const { access_token } = response.data
        tokenManager.setToken(access_token)

        // Retry original request with new token
        if (originalRequest?.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`
        }
        return apiClient(originalRequest!)
      } catch {
        // Refresh failed - redirect to login
        tokenManager.clearToken()
        localStorage.removeItem('refresh_token')
        window.location.href = '/auth/login'
      }
    }

    return Promise.reject(error)
  }
)

// ==================== AUTH API ====================

export const authApi = {
  register: async (data: RegisterData): Promise<User> => {
    const response = await apiClient.post('/api/auth/register', data)
    return response.data
  },

  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    const response = await apiClient.post('/api/auth/login', credentials)
    const tokenData: TokenResponse = response.data

    // Store tokens
    tokenManager.setToken(tokenData.access_token)
    localStorage.setItem('refresh_token', tokenData.refresh_token)

    return tokenData
  },

  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      await apiClient.post('/api/auth/logout', { refresh_token: refreshToken }).catch(() => {})
    }
    tokenManager.clearToken()
    localStorage.removeItem('refresh_token')
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/api/auth/me')
    return response.data
  },

  // Restore session on page load
  restoreSession: async (): Promise<User | null> => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) return null

    try {
      const response = await apiClient.post('/api/auth/refresh', {
        refresh_token: refreshToken
      })
      const { access_token, user } = response.data
      tokenManager.setToken(access_token)
      return user
    } catch {
      localStorage.removeItem('refresh_token')
      return null
    }
  }
}

// ==================== TEAMS API ====================

export const teamsApi = {
  list: async (): Promise<Team[]> => {
    const response = await apiClient.get('/api/teams')
    return response.data
  },

  create: async (data: TeamCreate): Promise<Team> => {
    const response = await apiClient.post('/api/teams', data)
    return response.data
  },

  addMember: async (teamId: number, email: string, role = 'member'): Promise<void> => {
    await apiClient.post(`/api/teams/${teamId}/members`, { email, role })
  }
}

// ==================== PROJECTS API ====================

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const response = await apiClient.get('/api/projects')
    return response.data
  },

  create: async (data: ProjectCreate): Promise<Project> => {
    const response = await apiClient.post('/api/projects', data)
    return response.data
  },
}

// ==================== TASKS API ====================

export const tasksApi = {
  list: async (params?: {
    project_id?: number
    status?: string
    assigned_to_me?: boolean
  }): Promise<Task[]> => {
    const response = await apiClient.get('/api/tasks', { params })
    return response.data
  },

  get: async (id: number): Promise<Task> => {
    const response = await apiClient.get(`/api/tasks/${id}`)
    return response.data
  },

  create: async (data: TaskCreate): Promise<Task> => {
    const response = await apiClient.post('/api/tasks', data)
    return response.data
  },

  update: async (id: number, data: TaskUpdate): Promise<Task> => {
    const response = await apiClient.patch(`/api/tasks/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/tasks/${id}`)
  },
}

export default apiClient