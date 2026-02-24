import { api } from "@/api/client";
import { User } from '../types'

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

export const authApi = {
  login: (data: LoginPayload) =>
    api.post<{ user: User; access_token: string }>('/auth/login', data),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get<{ user: User }>('/auth/me'),

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