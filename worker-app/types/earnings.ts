// worker-app/types/earnings.ts

export type WorkerEarning = {
  id: string

  workerId: string
  bookingId: string

  grossAmount: number
  platformFee: number
  netAmount: number

  createdAt: string
}

export type WorkerEarningSummary = {
  totalGrossAmount: number
  totalPlatformFee: number
  totalNetAmount: number

  earningCount: number
}

export type WorkerEarningPeriod = {
  startDate: string
  endDate: string

  summary: WorkerEarningSummary

  earnings: WorkerEarning[]
}