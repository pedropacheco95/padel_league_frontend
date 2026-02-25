import { api } from "@/api/client";
import { User } from '../types'
import { USE_MOCK, mockResponse, mockUser, MOCK_TOKEN } from '../data/mockData'

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  name: string
  full_name?: string
  prefered_hand?: string
  prefered_position?: string
  height?: number
  birth_date?: string
}

function mockLoginError(): never {
  throw { response: { data: { error: 'Credenciais inválidas.' } } }
}

export const authApi = {
  login: (data: LoginPayload) => {
    if (USE_MOCK) {
      if (data.username === 'admin' && data.password === 'admin') {
        return mockResponse({ user: mockUser, access_token: MOCK_TOKEN })
      }
      mockLoginError()
    }
    return api.post<{ user: User; access_token: string }>('/auth/login', data)
  },

  logout: () =>
    USE_MOCK ? mockResponse({}) : api.post('/auth/logout'),

  me: () => {
    if (USE_MOCK) {
      const token = localStorage.getItem('accessToken')
      if (token === MOCK_TOKEN) return mockResponse({ user: mockUser })
      return Promise.reject(new Error('Not authenticated'))
    }
    return api.get<{ user: User }>('/auth/me')
  },

  refresh: () =>
    api.post('/auth/refresh'),

  forgotPassword: (username: string) =>
    api.post<{ user_id: number }>('/auth/forgot_password', { username }),

  verifyCode: (user_id: number, generated_code: number) =>
    api.post<{ player_id: number }>(`/auth/verify_generated_code/${user_id}`, { generated_code }),

  generateNewCode: (user_id: number) =>
    api.post(`/auth/generate_new_code/${user_id}`),

  register: (data: FormData) =>
    api.post<{ user: User; access_token: string }>('/auth/register', data),
}