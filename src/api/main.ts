import { api } from './client'
import { IndexData } from '../types'
import { USE_MOCK, mockResponse, mockIndexData } from '../data/mockData'

export const mainApi = {
  index: () =>
    USE_MOCK ? mockResponse(mockIndexData) : api.get<IndexData>('/main/index'),
}