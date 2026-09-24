import {
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { formatMoney } from '../../lib/bookingUtils'

interface BookingPriceSummaryProps {
  baseAmount?: number

  discountAmount?: number

  serviceDiscountPercent?: number

  serviceDiscountAmount?: number

  discountTierName?: string | null

  promotionTitle?: string | null

  promotionDiscountAmount?: number

  platformFee?: number

  taxAmount?: number

  finalAmount?: number

  currency?: string

  occurrenceCount?: number

  loading?: boolean

  error?: string | null
}

export default function BookingPriceSummary({
  baseAmount,

  discountAmount,

  serviceDiscountPercent = 0,

  serviceDiscountAmount = 0,

  discountTierName,

  promotionTitle,

  promotionDiscountAmount = 0,

  platformFee,

  taxAmount,

  finalAmount,

  currency,

  occurrenceCount,

  loading = false,

  error,
}: BookingPriceSummaryProps) {

  if (loading) {
    return (
      <View
        style={
          styles.container
        }
      >
        <Text
          style={
            styles.loadingText
          }
        >
          Calculating price...
        </Text>
      </View>
    )
  }

  if (error) {
    return (
      <View
        style={
          styles.container
        }
      >
        <Text
          style={
            styles.errorText
          }
        >
          {error}
        </Text>
      </View>
    )
  }

  if (
    finalAmount ===
    undefined
  ) {
    return null
  }

  const hasDurationDiscount =
  serviceDiscountAmount >
  0

const hasPromotion =
  promotionDiscountAmount >
  0

const effectiveDurationPercent =
  serviceDiscountPercent > 0
    ? serviceDiscountPercent
    : baseAmount &&
        baseAmount > 0 &&
        serviceDiscountAmount > 0
      ? (
          (serviceDiscountAmount /
            baseAmount) *
          100
        )
      : 0

  return (
    <View
      style={
        styles.container
      }
    >

      <View
        style={
          styles.row
        }
      >
        <Text
          style={
            styles.label
          }
        >
          Base amount
        </Text>

        <Text
          style={
            styles.value
          }
        >
          {formatMoney(
            baseAmount,
            currency,
          )}
        </Text>
      </View>

      {hasDurationDiscount && (
        <View
          style={
            styles.row
          }
        >
          <View
            style={
              styles.rowTextBlock
            }
          >
            <Text
              style={
                styles.label
              }
            >
              Duration discount
            </Text>

            <Text
              style={
                styles.helperText
              }
            >
              {discountTierName ||
  `${effectiveDurationPercent.toFixed(0)}% for this duration`}
            </Text>
          </View>

          <Text
            style={[
              styles.value,
              styles.discount,
            ]}
          >
            −
            {formatMoney(
              serviceDiscountAmount,
              currency,
            )}
          </Text>
        </View>
      )}

      {hasPromotion && (
        <View
          style={
            styles.row
          }
        >
          <View
            style={
              styles.rowTextBlock
            }
          >
            <Text
              style={
                styles.label
              }
            >
              Promotion
            </Text>

            <Text
              style={
                styles.helperText
              }
            >
              {promotionTitle ||
                'Active promotion'}
            </Text>
          </View>

          <Text
            style={[
              styles.value,
              styles.discount,
            ]}
          >
            −
            {formatMoney(
              promotionDiscountAmount,
              currency,
            )}
          </Text>
        </View>
      )}

      {!hasDurationDiscount &&
        !hasPromotion &&
        discountAmount !==
          undefined &&
        discountAmount > 0 && (
          <View
            style={
              styles.row
            }
          >
            <Text
              style={
                styles.label
              }
            >
              Discount
            </Text>

            <Text
              style={[
                styles.value,
                styles.discount,
              ]}
            >
              −
              {formatMoney(
                discountAmount,
                currency,
              )}
            </Text>
          </View>
        )}

      {(hasDurationDiscount ||
        hasPromotion) && (
        <View
          style={
            styles.row
          }
        >
          <Text
            style={
              styles.label
            }
          >
            Total discount
          </Text>

          <Text
            style={[
              styles.value,
              styles.discount,
            ]}
          >
            −
            {formatMoney(
              discountAmount ??
                (
                  serviceDiscountAmount +
                  promotionDiscountAmount
                ),
              currency,
            )}
          </Text>
        </View>
      )}

      {platformFee !==
        undefined &&
        platformFee > 0 && (
          <View
            style={
              styles.row
            }
          >
            <Text
              style={
                styles.label
              }
            >
              Platform fee
            </Text>

            <Text
              style={
                styles.value
              }
            >
              {formatMoney(
                platformFee,
                currency,
              )}
            </Text>
          </View>
        )}

      {taxAmount !==
        undefined &&
        taxAmount > 0 && (
          <View
            style={
              styles.row
            }
          >
            <Text
              style={
                styles.label
              }
            >
              Tax
            </Text>

            <Text
              style={
                styles.value
              }
            >
              {formatMoney(
                taxAmount,
                currency,
              )}
            </Text>
          </View>
        )}

      {occurrenceCount !==
        undefined && (
          <View
            style={
              styles.row
            }
          >
            <Text
              style={
                styles.label
              }
            >
              Occurrences
            </Text>

            <Text
              style={
                styles.value
              }
            >
              {occurrenceCount}
            </Text>
          </View>
        )}

      {(hasDurationDiscount ||
        hasPromotion) && (
        <View
          style={
            styles.savingsBanner
          }
        >
          <Text
            style={
              styles.savingsTitle
            }
          >
            You save{' '}
            {formatMoney(
              discountAmount ??
                0,
              currency,
            )}
          </Text>

          <Text
            style={
              styles.savingsText
            }
          >
            Discounts are applied
            automatically at checkout.
          </Text>
        </View>
      )}

      <View
        style={
          styles.divider
        }
      />

      <View
        style={
          styles.rowFinal
        }
      >
        <Text
          style={
            styles.labelFinal
          }
        >
          Total amount
        </Text>

        <Text
          style={
            styles.valueFinal
          }
        >
          {formatMoney(
            finalAmount,
            currency,
          )}
        </Text>
      </View>

    </View>
  )
}

const styles =
  StyleSheet.create({

    container: {
      padding: 16,
      marginVertical: 12,
      borderRadius: 12,
      backgroundColor:
        '#F9FAFB',
      borderWidth: 1,
      borderColor:
        '#E5E7EB',
    },

    loadingText: {
      fontSize: 14,
      color: '#6B7280',
      textAlign: 'center',
      fontWeight:
        '500',
    },

    errorText: {
      fontSize: 14,
      color: '#DC2626',
      textAlign: 'center',
      fontWeight:
        '500',
    },

    row: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      paddingVertical: 10,
      gap: 12,
    },

    rowTextBlock: {
      flex: 1,
      minWidth: 0,
    },

    helperText: {
      marginTop: 3,
      fontSize: 11,
      color: '#64748B',
      fontWeight:
        '500',
    },

    rowFinal: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      paddingVertical: 12,
    },

    label: {
      fontSize: 14,
      color: '#6B7280',
      fontWeight:
        '500',
    },

    labelFinal: {
      fontSize: 15,
      color: '#111827',
      fontWeight:
        '700',
    },

    value: {
      fontSize: 14,
      color: '#111827',
      fontWeight:
        '600',
    },

    valueFinal: {
      fontSize: 18,
      color: '#111827',
      fontWeight:
        '800',
    },

    discount: {
      color: '#059669',
    },

    savingsBanner: {
      marginTop: 6,
      padding: 12,
      borderRadius: 10,
      backgroundColor:
        '#ECFDF5',
      borderWidth: 1,
      borderColor:
        '#A7F3D0',
    },

    savingsTitle: {
      fontSize: 12,
      fontWeight:
        '800',
      color: '#047857',
    },

    savingsText: {
      marginTop: 3,
      fontSize: 11,
      color: '#065F46',
    },

    divider: {
      height: 1,
      backgroundColor:
        '#E5E7EB',
      marginVertical: 10,
    },

  })