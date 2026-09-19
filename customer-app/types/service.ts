export type HomeService = {
  id: string
  serviceVariantId: string
  name: string
  description: string | null
  hourlyPrice: number | null
  currency: string | null
}