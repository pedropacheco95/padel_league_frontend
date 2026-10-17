import { api } from '@/api/client'
import { API_V2_BASE, type PasswordCode } from '@/api/v2'

const v2 = { baseURL: API_V2_BASE }

export const passwordCodesKey = ['v2', 'admin', 'password-codes'] as const

export const passwordCodesApi = {
  list: async (): Promise<PasswordCode[]> => (await api.get('/admin/password-codes', v2)).data,
  make: async (playerId: number): Promise<PasswordCode> => (await api.post('/admin/password-codes', { playerId }, v2)).data,
  dismiss: async (userId: number): Promise<void> => {
    await api.delete(`/admin/password-codes/${userId}`, v2)
  },
}

/** The message an admin forwards by WhatsApp: the link pre-fills the code. */
export function whatsappText(c: PasswordCode, origin = window.location.origin) {
  const name = c.player?.name ?? c.username
  return (
    `Olá ${name}! O teu código para mudares a password na Porto Padel League é ${c.code}.\n` +
    `Abre este link e define a nova password: ${origin}/verify-code/${c.userId}?code=${c.code}\n` +
    `O teu username é: ${c.username}`
  )
}

// No phone number: WhatsApp opens its own contact picker.
export const whatsappUrl = (c: PasswordCode) => `https://wa.me/?text=${encodeURIComponent(whatsappText(c))}`
