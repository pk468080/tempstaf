import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import {
  getWorkerEarnings,
  WorkerEarning,
} from '../services/workerEarnings'

type EarningsScreenProps = {
  onBack: () => void
}

export default function EarningsScreen({
  onBack,
}: EarningsScreenProps) {
  const [earnings, setEarnings] = useState<WorkerEarning[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadEarnings = useCallback(async () => {
    try {
      const data = await getWorkerEarnings()
      setEarnings(data)
    } catch (error) {
      console.error(
        '[TempStaff Worker] Failed to load earnings:',
        error
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadEarnings()
  }, [loadEarnings])

  const refresh = () => {
    setRefreshing(true)
    loadEarnings()
  }

  const totalEarned = earnings.reduce(
    (sum, earning) => sum + Number(earning.net_amount || 0),
    0
  )

  const totalGross = earnings.reduce(
    (sum, earning) => sum + Number(earning.gross_amount || 0),
    0
  )

  const totalFees = earnings.reduce(
    (sum, earning) => sum + Number(earning.platform_fee || 0),
    0
  )

  const formatAmount = (amount: number) =>
    `₹${amount.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
          />
        }
      >
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ← Back
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>Earnings</Text>

        <Text style={styles.subtitle}>
          Track your earnings from completed jobs.
        </Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>
              Loading earnings...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>
                Total earned
              </Text>

              <Text style={styles.totalAmount}>
                {formatAmount(totalEarned)}
              </Text>

              <Text style={styles.totalJobs}>
                {earnings.length}{' '}
                {earnings.length === 1
                  ? 'completed job'
                  : 'completed jobs'}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>
                  Gross
                </Text>

                <Text style={styles.summaryAmount}>
                  {formatAmount(totalGross)}
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>
                  Platform fees
                </Text>

                <Text style={styles.summaryAmount}>
                  {formatAmount(totalFees)}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              Earnings history
            </Text>

            {earnings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  No earnings yet
                </Text>

                <Text style={styles.emptyText}>
                  Your earnings will appear here after
                  you complete a job.
                </Text>
              </View>
            ) : (
              earnings.map(earning => (
                <View
                  key={earning.id}
                  style={styles.earningCard}
                >
                  <View style={styles.earningHeader}>
                    <View>
                      <Text style={styles.jobTitle}>
                        Completed job
                      </Text>

                      <Text style={styles.bookingId}>
                        #{earning.booking_id.slice(0, 8)}
                      </Text>
                    </View>

                    <Text style={styles.netAmount}>
                      {formatAmount(
                        Number(earning.net_amount || 0)
                      )}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      Gross amount
                    </Text>

                    <Text style={styles.detailValue}>
                      {formatAmount(
                        Number(earning.gross_amount || 0)
                      )}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      Platform fee
                    </Text>

                    <Text style={styles.detailValue}>
                      {formatAmount(
                        Number(earning.platform_fee || 0)
                      )}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      You receive
                    </Text>

                    <Text style={styles.receiveValue}>
                      {formatAmount(
                        Number(earning.net_amount || 0)
                      )}
                    </Text>
                  </View>

                  <Text style={styles.date}>
                    {new Date(
                      earning.created_at
                    ).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  page: {
    padding: 22,
    paddingBottom: 45,
  },

  backButton: {
    marginBottom: 18,
  },

  backText: {
    color: '#0f766e',
    fontSize: 16,
    fontWeight: '700',
  },

  title: {
    color: '#0b1f3a',
    fontSize: 31,
    fontWeight: '800',
    marginBottom: 7,
  },

  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },

  loading: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },

  totalCard: {
    backgroundColor: '#0b1f3a',
    borderRadius: 22,
    padding: 24,
    marginBottom: 14,
  },

  totalLabel: {
    color: '#dbe4ee',
    fontSize: 14,
    marginBottom: 8,
  },

  totalAmount: {
    color: 'white',
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 8,
  },

  totalJobs: {
    color: '#cbd5e1',
    fontSize: 13,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  summaryLabel: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 7,
  },

  summaryAmount: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },

  sectionTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
  },

  earningCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 19,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  jobTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },

  bookingId: {
    color: '#9ca3af',
    fontSize: 12,
  },

  netAmount: {
    color: '#0f766e',
    fontSize: 19,
    fontWeight: '900',
  },

  divider: {
    height: 1,
    backgroundColor: '#eef0f2',
    marginVertical: 15,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },

  detailLabel: {
    color: '#6b7280',
    fontSize: 13,
  },

  detailValue: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },

  receiveValue: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '800',
  },

  date: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 10,
  },

  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },

  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
})
