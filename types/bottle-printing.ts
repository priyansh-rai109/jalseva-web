export type OccasionCategory =
  | 'Wedding'
  | 'Birthday'
  | 'Anniversary'
  | 'Corporate'
  | 'Baby Shower'
  | 'Festival'
  | 'Other'

export type BottleDesignStatus = 'active' | 'inactive'

export interface BottleDesign {
  id: string
  design_code: string
  title: string
  occasion_category: OccasionCategory | string
  description?: string | null
  tags?: string[] | null
  images: string[]
  status: BottleDesignStatus
  internal_notes?: string | null
  created_at: string
  updated_at: string
}

export type BottleDesignPublic = Omit<BottleDesign, 'internal_notes'>

export interface ShortlistItem {
  id: string
  design_code: string
  title: string
  occasion_category: string
  image: string
}

export interface CreateBottleDesignInput {
  design_code: string
  title: string
  occasion_category: string
  description?: string
  tags?: string[]
  images: string[]
  status?: BottleDesignStatus
  internal_notes?: string
}

export interface UpdateBottleDesignInput extends Partial<CreateBottleDesignInput> {
  id: string
}

export const OCCASION_CATEGORIES: OccasionCategory[] = [
  'Wedding',
  'Birthday',
  'Anniversary',
  'Corporate',
  'Baby Shower',
  'Festival',
  'Other',
]
