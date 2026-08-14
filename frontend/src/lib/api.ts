import axios from 'axios'

const getApiBaseUrl = (): string => {
  let url = import.meta.env.VITE_API_URL

  if (!url) {
    url = '/api'
  }

  url = url.trim()
  if (!url.endsWith('/api') && !url.endsWith('/api/')) {
    url = url.replace(/\/$/, '') + '/api'
  }

  return url
}

export const API_BASE_URL = getApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ai_workplace_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        localStorage.removeItem('ai_workplace_token')
        localStorage.removeItem('ai_workplace_user')
        localStorage.removeItem('ai_workplace_employee')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
