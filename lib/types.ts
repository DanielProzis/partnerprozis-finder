export type PartnerType = 'gym' | 'personal_trainer' | 'nutrition_store' | 'fitness_studio' | 'crossfit'

export interface SearchResult {
  google_place_id: string
  name: string
  address: string
  city: string
  country: string
  phone?: string
  website?: string
  rating?: number
  type: PartnerType
  instagram?: string
  facebook?: string
  email?: string
  saved?: boolean
}

export interface Lead extends SearchResult {
  id: string
  user_id: string
  status: 'to_contact' | 'contacted' | 'partner' | 'not_interested'
  notes?: string
  created_at: string
}

export const PARTNER_TYPES: Record<PartnerType, { label: string; query: string; emoji: string }> = {
  gym: { label: 'Ginásio', query: 'gym fitness center', emoji: '🏋️' },
  personal_trainer: { label: 'Personal Trainer', query: 'personal trainer', emoji: '🤸' },
  nutrition_store: { label: 'Loja de Nutrição', query: 'nutrition store health food supplement shop', emoji: '🥗' },
  fitness_studio: { label: 'Estúdio de Fitness', query: 'yoga pilates fitness studio', emoji: '🧘' },
  crossfit: { label: 'CrossFit / Box', query: 'crossfit box', emoji: '🔥' },
}

export const EUROPEAN_COUNTRIES = [
  { code: 'PT', name: 'Portugal' },
  { code: 'ES', name: 'Espanha' },
  { code: 'FR', name: 'França' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'IT', name: 'Itália' },
  { code: 'NL', name: 'Países Baixos' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'PL', name: 'Polónia' },
  { code: 'SE', name: 'Suécia' },
  { code: 'NO', name: 'Noruega' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'FI', name: 'Finlândia' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'AT', name: 'Áustria' },
  { code: 'CH', name: 'Suíça' },
  { code: 'GB', name: 'Reino Unido' },
]
