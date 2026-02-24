import { api } from './client'
import { IndexData } from '../types'

export const mainApi = {
  index: () => api.get<IndexData>('/main/index'),
}