/**
 * UI helpers only.
 *
 * Business data such as:
 * - services
 * - staffing packages
 * - prices
 * - workers
 *
 * must come from Supabase.
 */

export const iconFor = (service: string): string => {
  const normalized = service.trim().toLowerCase()

  if (normalized.includes('housekeeping')) {
    return '🧹'
  }

  if (normalized.includes('pantry')) {
    return '🍽️'
  }

  if (normalized.includes('office')) {
    return '💼'
  }

  if (normalized.includes('helper')) {
    return '👷'
  }

  return '👤'
}