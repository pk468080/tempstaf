import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack'
import { useCallback, useEffect, useState } from 'react'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Money'
>

type PaymentRow = {
  id: string
  amount: number
  status: string
  created_at: string
  booking_id: string | null
}

export default function MoneyScreen({
  navigation,
}: Props) {
  const [payments, setPayments] =
    useState<PaymentRow[]>([])

  const [loading, setLoading] =
    useState(true)

  const loadPayments = useCallback(
    async () => {
      try {
        setLoading(true)

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          throw authError
        }

        if (!user) {
          throw new Error(
            'Customer is not authenticated.'
          )
        }

        /*
         * The customer app currently records
         * payment against bookings.
         *
         * We therefore read completed/paid
         * bookings instead of inventing a
         * separate customer wallet table.
         */
        const {
          data,
          error,
        } = await supabase
          .from('bookings')
          .select(
            'id, total_amount, payment_status, created_at'
          )
          .eq('customer_id', user.id)
          .order('created_at', {
            ascending: false,
          })

        if (error) {
          throw error
        }

        const rows: PaymentRow[] =
          (data || []).map(
            (item: any) => ({
              id: String(item.id),
              amount:
                Number(
                  item.total_amount
                ) || 0,
              status:
                item.payment_status ||
                'pending',
              created_at:
                item.created_at,
              booking_id:
                item.id || null,
            })
          )

        setPayments(rows)
      } catch (error: any) {
        console.error(
          '[TempStaff] Failed to load money history:',
          error
        )

        /*
         * Do not make the whole screen unusable
         * if the optional payment-history query
         * is unavailable.
         */
        setPayments([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  const totalPaid = payments
    .filter(payment =>
      isPaidStatus(payment.status)
    )
    .reduce(
      (sum, payment) =>
        sum + payment.amount,
      0
    )

  const pendingAmount = payments
    .filter(
      payment =>
        !isPaidStatus(
          payment.status
        ) &&
        isPendingStatus(
          payment.status
        )
    )
    .reduce(
      (sum, payment) =>
        sum + payment.amount,
      0
    )

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Header
          onBack={() =>
            navigation.goBack()
          }
        />

        <View style={styles.header}>
          <Text style={styles.title}>
            TempStaff Money
          </Text>

          <Text style={styles.subtitle}>
            View your booking payments and
            transaction history.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            TOTAL PAID
          </Text>

          <Text style={styles.summaryAmount}>
            ₹
            {totalPaid.toLocaleString(
              'en-IN'
            )}
          </Text>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.smallLabel}>
                Transactions
              </Text>

              <Text style={styles.smallValue}>
                {payments.length}
              </Text>
            </View>

            <View style={styles.summaryRight}>
              <Text style={styles.smallLabel}>
                Pending
              </Text>

              <Text style={styles.smallValue}>
                ₹
                {pendingAmount.toLocaleString(
                  'en-IN'
                )}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>
              ₹
            </Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Customer payment history
            </Text>

            <Text style={styles.infoText}>
              TempStaff Money shows payments
              associated with your bookings.
              Your customer account does not
              hold a withdrawable wallet balance.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Transactions
        </Text>

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator
              size="large"
              color={COLORS.teal}
            />

            <Text style={styles.stateText}>
              Loading transactions...
            </Text>
          </View>
        ) : payments.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>
                ₹
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              No transactions yet
            </Text>

            <Text style={styles.emptyText}>
              Your booking payments will appear
              here once you start using TempStaff.
            </Text>
          </View>
        ) : (
          payments.map(payment => (
            <TransactionCard
              key={payment.id}
              payment={payment}
            />
          ))
        )}

        <Text style={styles.footerNote}>
          Payment processing is handled securely
          through the TempStaff payment flow.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function TransactionCard({
  payment,
}: {
  payment: PaymentRow
}) {
  const paid =
    isPaidStatus(payment.status)

  const pending =
    isPendingStatus(payment.status)

  const date =
    formatDate(payment.created_at)

  return (
    <View style={styles.transaction}>
      <View
        style={[
          styles.transactionIcon,
          paid &&
            styles.transactionIconPaid,
          pending &&
            styles.transactionIconPending,
        ]}
      >
        <Text
          style={[
            styles.transactionIconText,
            paid &&
              styles.transactionIconTextPaid,
            pending &&
              styles.transactionIconTextPending,
          ]}
        >
          {paid ? '✓' : '₹'}
        </Text>
      </View>

      <View style={styles.transactionMain}>
        <Text style={styles.transactionTitle}>
          Booking payment
        </Text>

        <Text style={styles.transactionDate}>
          {date}
        </Text>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              paid &&
                styles.statusDotPaid,
              pending &&
                styles.statusDotPending,
            ]}
          />

          <Text
            style={[
              styles.statusText,
              paid &&
                styles.statusTextPaid,
              pending &&
                styles.statusTextPending,
            ]}
          >
            {formatStatus(
              payment.status
            )}
          </Text>
        </View>
      </View>

      <Text style={styles.transactionAmount}>
        ₹
        {payment.amount.toLocaleString(
          'en-IN'
        )}
      </Text>
    </View>
  )
}

function isPaidStatus(
  status: string
) {
  const value =
    status.toLowerCase()

  return (
    value === 'paid' ||
    value === 'completed' ||
    value === 'success' ||
    value === 'succeeded'
  )
}

function isPendingStatus(
  status: string
) {
  const value =
    status.toLowerCase()

  return (
    value === 'pending' ||
    value === 'created' ||
    value === 'unpaid'
  )
}

function formatStatus(
  status: string
) {
  const value =
    status.toLowerCase()

  if (isPaidStatus(value)) {
    return 'Paid'
  }

  if (isPendingStatus(value)) {
    return 'Pending'
  }

  if (
    value === 'failed' ||
    value === 'cancelled' ||
    value === 'canceled'
  ) {
    return 'Failed'
  }

  return status || 'Unknown'
}

function formatDate(
  value: string
) {
  if (!value) {
    return ''
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  )
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        COLORS.light,
    },

    page: {
      padding: 22,
      paddingBottom: 45,
    },

    header: {
      marginTop: 8,
      marginBottom: 20,
    },

    title: {
      color: COLORS.navy,
      fontSize: 29,
      lineHeight: 35,
      fontWeight: '900',
    },

    subtitle: {
      color: COLORS.gray,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 7,
    },

    summaryCard: {
      backgroundColor:
        COLORS.navy,
      borderRadius: 21,
      padding: 21,
      marginBottom: 14,
    },

    summaryLabel: {
      color: '#D7E3EF',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
    },

    summaryAmount: {
      color: COLORS.white,
      fontSize: 36,
      fontWeight: '900',
      marginTop: 5,
    },

    summaryDivider: {
      height: 1,
      backgroundColor:
        'rgba(255,255,255,0.16)',
      marginVertical: 17,
    },

    summaryRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
    },

    summaryRight: {
      alignItems: 'flex-end',
    },

    smallLabel: {
      color: '#D7E3EF',
      fontSize: 10,
      fontWeight: '700',
    },

    smallValue: {
      color: COLORS.white,
      fontSize: 15,
      fontWeight: '900',
      marginTop: 3,
    },

    infoBox: {
      flexDirection: 'row',
      backgroundColor:
        '#E8F6F6',
      borderRadius: 16,
      padding: 14,
      marginBottom: 25,
    },

    infoIcon: {
      width: 35,
      height: 35,
      borderRadius: 18,
      backgroundColor:
        COLORS.teal,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    infoIconText: {
      color: COLORS.white,
      fontSize: 15,
      fontWeight: '900',
    },

    infoContent: {
      flex: 1,
    },

    infoTitle: {
      color: COLORS.navy,
      fontSize: 13,
      fontWeight: '900',
      marginBottom: 3,
    },

    infoText: {
      color: COLORS.gray,
      fontSize: 11,
      lineHeight: 16,
    },

    sectionTitle: {
      color: COLORS.navy,
      fontSize: 18,
      fontWeight: '900',
      marginBottom: 12,
    },

    stateBox: {
      minHeight: 170,
      backgroundColor:
        COLORS.white,
      borderRadius: 19,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    stateText: {
      color: COLORS.gray,
      fontSize: 13,
      marginTop: 11,
    },

    emptyBox: {
      backgroundColor:
        COLORS.white,
      borderRadius: 19,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 25,
      alignItems: 'center',
    },

    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor:
        '#E8F6F6',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 13,
    },

    emptyIconText: {
      color: COLORS.teal,
      fontSize: 25,
      fontWeight: '900',
    },

    emptyTitle: {
      color: COLORS.navy,
      fontSize: 17,
      fontWeight: '900',
    },

    emptyText: {
      color: COLORS.gray,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: 7,
    },

    transaction: {
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 18,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },

    transactionIcon: {
      width: 45,
      height: 45,
      borderRadius: 14,
      backgroundColor:
        '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
    },

    transactionIconPaid: {
      backgroundColor:
        '#ECFDF3',
    },

    transactionIconPending: {
      backgroundColor:
        '#FFF7E8',
    },

    transactionIconText: {
      color: COLORS.gray,
      fontSize: 17,
      fontWeight: '900',
    },

    transactionIconTextPaid: {
      color: '#15803D',
    },

    transactionIconTextPending: {
      color: '#B45309',
    },

    transactionMain: {
      flex: 1,
    },

    transactionTitle: {
      color: COLORS.navy,
      fontSize: 13,
      fontWeight: '900',
    },

    transactionDate: {
      color: COLORS.gray,
      fontSize: 10,
      marginTop: 3,
    },

    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },

    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        COLORS.gray,
      marginRight: 5,
    },

    statusDotPaid: {
      backgroundColor:
        '#16A34A',
    },

    statusDotPending: {
      backgroundColor:
        '#D97706',
    },

    statusText: {
      color: COLORS.gray,
      fontSize: 9,
      fontWeight: '800',
    },

    statusTextPaid: {
      color: '#15803D',
    },

    statusTextPending: {
      color: '#B45309',
    },

    transactionAmount: {
      color: COLORS.navy,
      fontSize: 15,
      fontWeight: '900',
      marginLeft: 8,
    },

    footerNote: {
      color: COLORS.gray,
      fontSize: 10,
      lineHeight: 16,
      textAlign: 'center',
      marginTop: 18,
    },
  })