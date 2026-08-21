import { Worker } from '../types'

export const SERVICES = ['Housekeeping', 'Office Boy', 'Pantry Staff', 'Helper']
export const DURATIONS = ['1 Day', '2 Days', '1 Week', '1 Month']
export const BOOKING_MODES = ['Instant', 'Scheduled', 'Recurring'] as const

export const WORKERS: Worker[] = [
  { id: 'w1', name: 'Amit Kumar', service: 'Housekeeping', rating: 4.8, jobs: 126, distance: '1.2 km' },
  { id: 'w2', name: 'Rahul Singh', service: 'Housekeeping', rating: 4.7, jobs: 98, distance: '2.1 km' },
  { id: 'w3', name: 'Vikas Sharma', service: 'Office Boy', rating: 4.9, jobs: 151, distance: '1.8 km' },
  { id: 'w4', name: 'Sandeep Yadav', service: 'Pantry Staff', rating: 4.6, jobs: 73, distance: '2.7 km' },
  { id: 'w5', name: 'Rohit Verma', service: 'Helper', rating: 4.8, jobs: 112, distance: '3.0 km' },
]

export const priceFor = (service: string, duration: string) => {
  const base: Record<string, number> = {
    Housekeeping: 799,
    'Office Boy': 899,
    'Pantry Staff': 999,
    Helper: 849,
  }
  const multiplier: Record<string, number> = {
    '1 Day': 1,
    '2 Days': 1.9,
    '1 Week': 6.2,
    '1 Month': 24,
  }
  return Math.round((base[service] || 799) * (multiplier[duration] || 1))
}

export const iconFor = (service: string) =>
  service === 'Housekeeping' ? '🧹'
  : service === 'Office Boy' ? '💼'
  : service === 'Pantry Staff' ? '🍽️'
  : '👷'
