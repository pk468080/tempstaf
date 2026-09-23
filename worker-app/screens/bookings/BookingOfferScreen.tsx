import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import {
  AppButton,
} from '../../components/ui/AppButton'

import {
  ScreenContainer,
} from '../../components/layout/ScreenContainer'

import ErrorState from '../../components/ui/ErrorState'

import {
  UI,
} from '../../constants/ui'

import {
  useWorkerRuntime,
} from '../../context/WorkerRuntimeContext'

import {
  getWorkerBookingOffers,
  getWorkerBookingOfferRemainingSeconds,
  isWorkerBookingOfferPending,
  respondToWorkerBookingOffer,
  type WorkerBookingOffer,
} from '../../services/bookings/workerBookingOffers.service'

type BookingOfferScreenProps = {
  bookingId: string
  onBack?: () => void
  onAccepted?: (bookingId: string) => void
}

function formatDateTime(
  value: string,
): string {
  const date = new Date(
    value,
  )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—'
  }

  return date.toLocaleString(
    undefined,
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

function formatRemainingTime(
  totalSeconds: number,
): string {
  const safeSeconds = Math.max(
    0,
    totalSeconds,
  )

  const minutes = Math.floor(
    safeSeconds / 60,
  )

  const seconds =
    safeSeconds % 60

  return `${minutes}:${seconds
    .toString()
    .padStart(2, '0')}`
}

function getOfferStatusLabel(
  status: WorkerBookingOffer['status'],
): string {
  switch (status) {
    case 'pending':
      return 'Pending response'

    case 'accepted':
      return 'Accepted'

    case 'declined':
      return 'Declined'

    case 'expired':
      return 'Expired'

    case 'cancelled':
      return 'Cancelled'

    default:
      return status
  }
}

export default function BookingOfferScreen({
  bookingId,
  onBack,
  onAccepted,
}: BookingOfferScreenProps) {
  const {
    offerRevision,
  } = useWorkerRuntime()

  const [
    offer,
    setOffer,
  ] = useState<WorkerBookingOffer | null>(
    null,
  )

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState(0)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    refreshing,
    setRefreshing,
  ] = useState(false)

  const [
    responding,
    setResponding,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  )

  const loadOffer =
    useCallback(
      async (
        isRefresh = false,
      ): Promise<void> => {
        if (isRefresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        setError(null)

        try {
          const offers =
            await getWorkerBookingOffers()

          const matchingOffer =
            offers.find(
              item =>
                item.bookingId ===
                bookingId,
            )

          if (!matchingOffer) {
            throw new Error(
              'Booking offer not found for this worker account.',
            )
          }

          setOffer(
            matchingOffer,
          )

          setRemainingSeconds(
            getWorkerBookingOfferRemainingSeconds(
              matchingOffer,
            ),
          )
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load the booking offer.',
          )
        } finally {
          setLoading(false)
          setRefreshing(false)
        }
      },
      [bookingId],
    )

  useEffect(() => {
    void loadOffer()
  }, [
    loadOffer,
  ])

  useEffect(() => {
    if (
      offerRevision === 0
    ) {
      return
    }

    if (responding) {
      return
    }

    void loadOffer(true)
  }, [
    offerRevision,
    responding,
    loadOffer,
  ])

  useEffect(() => {
    if (!offer) {
      return
    }

    if (
      !isWorkerBookingOfferPending(
        offer,
      )
    ) {
      setRemainingSeconds(0)
      return
    }

    const interval =
      setInterval(() => {
        setRemainingSeconds(
          getWorkerBookingOfferRemainingSeconds(
            offer,
          ),
        )
      }, 1000)

    return () => {
      clearInterval(
        interval,
      )
    }
  }, [
    offer,
  ])

  const handleResponse =
    useCallback(
      async (
        response:
          | 'accept'
          | 'decline',
      ): Promise<void> => {
        if (!offer) {
          return
        }

        if (
          !isWorkerBookingOfferPending(
            offer,
          )
        ) {
          setError(
            'This booking offer is no longer available.',
          )
          return
        }

        setResponding(true)
        setError(null)

        try {
          const result =
            await respondToWorkerBookingOffer(
              offer.id,
              response,
            )

          if (
            !result.success
          ) {
            throw new Error(
              result.error ||
                'Booking offer response could not be processed.',
            )
          }

          const nextStatus =
            response ===
            'accept'
              ? 'accepted'
              : 'declined'

          const respondedAt =
            new Date().toISOString()

          setOffer(
            current =>
              current
                ? {
                    ...current,
                    status:
                      nextStatus,
                    respondedAt,
                    updatedAt:
                      respondedAt,
                  }
                : current,
          )

          setRemainingSeconds(0)

          if (
            response ===
            'accept'
          ) {
            onAccepted?.(
              result.bookingId ||
                bookingId,
            )
          }
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to respond to the booking offer.',
          )
        } finally {
          setResponding(false)
        }
      },
      [
        bookingId,
        offer,
        onAccepted,
      ],
    )

  const confirmAccept =
    useCallback(() => {
      Alert.alert(
        'Accept booking?',
        'Accepting this offer assigns the booking to you.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Accept',
            onPress: () => {
              void handleResponse(
                'accept',
              )
            },
          },
        ],
      )
    }, [
      handleResponse,
    ])

  const confirmDecline =
    useCallback(() => {
      Alert.alert(
        'Decline booking?',
        'This offer will no longer be available to you.',
        [
          {
            text: 'Keep offer',
            style: 'cancel',
          },
          {
            text: 'Decline',
            style: 'destructive',
            onPress: () => {
              void handleResponse(
                'decline',
              )
            },
          },
        ],
      )
    }, [
      handleResponse,
    ])

  if (loading) {
    return (
      <ScreenContainer>
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color={
              UI.colors.secondary
            }
          />

          <Text
            style={
              styles.loadingTitle
            }
          >
            Loading booking offer
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Checking the latest offer assigned to this worker account.
          </Text>
        </View>
      </ScreenContainer>
    )
  }

  if (
    error &&
    !offer
  ) {
    return (
      <ScreenContainer>
        <ErrorState
          title="Offer unavailable"
          message={
            error
          }
          onAction={() => {
            void loadOffer()
          }}
        />
      </ScreenContainer>
    )
  }

  if (!offer) {
    return (
      <ScreenContainer>
        <ErrorState
          title="Offer unavailable"
          message="The requested booking offer could not be loaded."
          onAction={() => {
            void loadOffer()
          }}
        />
      </ScreenContainer>
    )
  }

  const isPending =
    isWorkerBookingOfferPending(
      offer,
    )

  const displayedSeconds =
    isPending
      ? remainingSeconds
      : 0

  const isExpired =
    isPending &&
    displayedSeconds <= 0

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() => {
              void loadOffer(
                true,
              )
            }}
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={styles.header}
        >
          <View
            style={
              styles.headerCopy
            }
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              BOOKING OFFER
            </Text>

            <Text
              style={
                styles.title
              }
            >
              New work opportunity
            </Text>

            <Text
              style={
                styles.bookingId
              }
            >
              Booking {bookingId}
            </Text>
          </View>

          {onBack ? (
            <View
              style={
                styles.headerButton
              }
            >
              <AppButton
                title="Back"
                variant="secondary"
                onPress={
                  onBack
                }
              />
            </View>
          ) : null}
        </View>

        {error ? (
          <View
            style={
              styles.warningBox
            }
          >
            <Text
              style={
                styles.warningTitle
              }
            >
              Response notice
            </Text>

            <Text
              style={
                styles.warningText
              }
            >
              {error}
            </Text>
          </View>
        ) : null}

        <View
          style={
            styles.statusCard
          }
        >
          <View
            style={
              styles.statusHeader
            }
          >
            <View
              style={
                styles.statusCopy
              }
            >
              <Text
                style={
                  styles.statusEyebrow
                }
              >
                OFFER STATUS
              </Text>

              <Text
                style={
                  styles.statusTitle
                }
              >
                {getOfferStatusLabel(
                  offer.status,
                )}
              </Text>
            </View>

            {isPending ? (
              <View
                style={
                  styles.timerBadge
                }
              >
                <Text
                  style={
                    styles.timerLabel
                  }
                >
                  EXPIRES IN
                </Text>

                <Text
                  style={
                    styles.timerValue
                  }
                >
                  {isExpired
                    ? '0:00'
                    : formatRemainingTime(
                        displayedSeconds,
                      )}
                </Text>
              </View>
            ) : null}
          </View>

          {isExpired ? (
            <View
              style={
                styles.expiredBox
              }
            >
              <Text
                style={
                  styles.expiredTitle
                }
              >
                This offer has expired
              </Text>

              <Text
                style={
                  styles.expiredText
                }
              >
                The response window has closed. Refresh to check whether a newer offer is available.
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={styles.section}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Offer details
          </Text>

          <View
            style={styles.card}
          >
            <InfoRow
              label="Booking ID"
              value={
                offer.bookingId
              }
            />

            <InfoDivider />

            <InfoRow
              label="Offered at"
              value={formatDateTime(
                offer.offeredAt,
              )}
            />

            <InfoDivider />

            <InfoRow
              label="Expires at"
              value={formatDateTime(
                offer.expiresAt,
              )}
            />

            {offer.respondedAt ? (
              <>
                <InfoDivider />

                <InfoRow
                  label="Responded at"
                  value={formatDateTime(
                    offer.respondedAt,
                  )}
                />
              </>
            ) : null}
          </View>
        </View>

        {isPending && !isExpired ? (
          <View
            style={
              styles.actionSection
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Respond to offer
            </Text>

            <Text
              style={
                styles.actionDescription
              }
            >
              Accepting assigns the booking to your worker account. Declining releases the offer.
            </Text>

            <View
              style={
                styles.primaryAction
              }
            >
              <AppButton
                title={
                  responding
                    ? 'Accepting...'
                    : 'Accept booking'
                }
                disabled={
                  responding
                }
                onPress={
                  confirmAccept
                }
              />
            </View>

            <View
              style={
                styles.secondaryAction
              }
            >
              <AppButton
                title={
                  responding
                    ? 'Please wait...'
                    : 'Decline booking'
                }
                variant="secondary"
                disabled={
                  responding
                }
                onPress={
                  confirmDecline
                }
              />
            </View>
          </View>
        ) : null}

        {offer.status ===
        'accepted' ? (
          <View
            style={
              styles.successCard
            }
          >
            <Text
              style={
                styles.successTitle
              }
            >
              Booking accepted
            </Text>

            <Text
              style={
                styles.successText
              }
            >
              This booking has been accepted by your worker account.
            </Text>

            <View
              style={
                styles.successAction
              }
            >
              <AppButton
                title="Open booking"
                onPress={() => {
                  onAccepted?.(
                    offer.bookingId,
                  )
                }}
              />
            </View>
          </View>
        ) : null}

        {offer.status ===
        'declined' ? (
          <View
            style={
              styles.infoCard
            }
          >
            <Text
              style={
                styles.infoTitle
              }
            >
              Offer declined
            </Text>

            <Text
              style={
                styles.infoText
              }
            >
              You declined this booking offer. It cannot be accepted again.
            </Text>
          </View>
        ) : null}

        {offer.status ===
        'cancelled' ? (
          <View
            style={
              styles.infoCard
            }
          >
            <Text
              style={
                styles.infoTitle
              }
            >
              Offer cancelled
            </Text>

            <Text
              style={
                styles.infoText
              }
            >
              This booking offer was cancelled before you responded.
            </Text>
          </View>
        ) : null}

        {offer.status ===
        'expired' ? (
          <View
            style={
              styles.infoCard
            }
          >
            <Text
              style={
                styles.infoTitle
              }
            >
              Offer expired
            </Text>

            <Text
              style={
                styles.infoText
              }
            >
              The response window for this offer has closed.
            </Text>
          </View>
        ) : null}

        <Text
          style={
            styles.footerText
          }
        >
          Offer information is loaded for the authenticated worker account only.
        </Text>
      </ScrollView>
    </ScreenContainer>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View
      style={
        styles.infoRow
      }
    >
      <Text
        style={
          styles.infoLabel
        }
      >
        {label}
      </Text>

      <Text
        numberOfLines={3}
        style={
          styles.infoValue
        }
      >
        {value}
      </Text>
    </View>
  )
}

function InfoDivider() {
  return (
    <View
      style={
        styles.infoDivider
      }
    />
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal:
      UI.spacing.xl,
    paddingTop:
      UI.spacing.xl,
    paddingBottom:
      UI.spacing.xxxl,
  },

  header: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
    marginBottom:
      UI.spacing.lg,
  },

  headerCopy: {
    flex: 1,
    paddingRight:
      UI.spacing.md,
  },

  headerButton: {
    width: 76,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    color:
      UI.colors.secondary,
  },

  title: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.title,
    lineHeight: 30,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  bookingId: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.caption,
    color:
      UI.colors.textMuted,
  },

  warningBox: {
    marginBottom:
      UI.spacing.lg,
    padding:
      UI.spacing.md,
    borderRadius:
      UI.radius.md,
    backgroundColor:
      UI.colors.warningBackground,
    borderWidth: 1,
    borderColor:
      '#FDE68A',
  },

  warningTitle: {
    fontSize:
      UI.typography.small,
    fontWeight: '800',
    color:
      UI.colors.warning,
  },

  warningText: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.small,
    lineHeight: 18,
    color:
      UI.colors.textSecondary,
  },

  statusCard: {
    padding:
      UI.spacing.xl,
    borderRadius:
      UI.radius.xl,
    backgroundColor:
      UI.colors.primary,
  },

  statusHeader: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
    justifyContent:
      'space-between',
  },

  statusCopy: {
    flex: 1,
    paddingRight:
      UI.spacing.md,
  },

  statusEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color:
      UI.colors.surface,
    opacity: 0.72,
  },

  statusTitle: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.subtitle,
    lineHeight: 24,
    fontWeight: '800',
    color:
      UI.colors.surface,
  },

  timerBadge: {
    minWidth: 88,
    padding:
      UI.spacing.sm,
    borderRadius:
      UI.radius.md,
    backgroundColor:
      UI.colors.surface,
    alignItems:
      'center',
  },

  timerLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color:
      UI.colors.textMuted,
  },

  timerValue: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.bodyLarge,
    fontWeight: '900',
    color:
      UI.colors.text,
  },

  expiredBox: {
    marginTop:
      UI.spacing.lg,
    padding:
      UI.spacing.md,
    borderRadius:
      UI.radius.md,
    backgroundColor:
      UI.colors.surface,
  },

  expiredTitle: {
    fontSize:
      UI.typography.small,
    fontWeight: '800',
    color:
      UI.colors.error,
  },

  expiredText: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.small,
    lineHeight: 18,
    color:
      UI.colors.textSecondary,
  },

  section: {
    marginTop:
      UI.spacing.xl,
  },

  sectionTitle: {
    fontSize:
      UI.typography.subtitle,
    lineHeight: 23,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  card: {
    marginTop:
      UI.spacing.md,
    padding:
      UI.spacing.lg,
    borderRadius:
      UI.radius.lg,
    backgroundColor:
      UI.colors.surface,
    borderWidth: 1,
    borderColor:
      UI.colors.border,
  },

  infoRow: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
    justifyContent:
      'space-between',
    gap: UI.spacing.md,
  },

  infoLabel: {
    flex: 1,
    fontSize:
      UI.typography.small,
    color:
      UI.colors.textSecondary,
  },

  infoValue: {
    flex: 1,
    fontSize:
      UI.typography.small,
    fontWeight: '700',
    color:
      UI.colors.text,
    textAlign: 'right',
  },

  infoDivider: {
    height: 1,
    marginVertical:
      UI.spacing.md,
    backgroundColor:
      UI.colors.border,
  },

  actionSection: {
    marginTop:
      UI.spacing.xl,
  },

  actionDescription: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.small,
    lineHeight: 18,
    color:
      UI.colors.textSecondary,
  },

  primaryAction: {
    marginTop:
      UI.spacing.lg,
  },

  secondaryAction: {
    marginTop:
      UI.spacing.sm,
  },

  successCard: {
    marginTop:
      UI.spacing.xl,
    padding:
      UI.spacing.lg,
    borderRadius:
      UI.radius.lg,
    backgroundColor:
      UI.colors.successBackground,
    borderWidth: 1,
    borderColor:
      UI.colors.success,
  },

  successTitle: {
    fontSize:
      UI.typography.bodyLarge,
    fontWeight: '800',
    color:
      UI.colors.success,
  },

  successText: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.small,
    lineHeight: 18,
    color:
      UI.colors.textSecondary,
  },

  successAction: {
    marginTop:
      UI.spacing.md,
  },

  infoCard: {
    marginTop:
      UI.spacing.xl,
    padding:
      UI.spacing.lg,
    borderRadius:
      UI.radius.lg,
    backgroundColor:
      UI.colors.infoBackground,
    borderWidth: 1,
    borderColor:
      UI.colors.info,
  },

  infoTitle: {
    fontSize:
      UI.typography.bodyLarge,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  infoText: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.small,
    lineHeight: 18,
    color:
      UI.colors.textSecondary,
  },

  footerText: {
    marginTop:
      UI.spacing.xl,
    fontSize:
      UI.typography.caption,
    lineHeight: 16,
    color:
      UI.colors.textMuted,
    textAlign: 'center',
  },

  loadingContainer: {
    flex: 1,
    alignItems:
      'center',
    justifyContent:
      'center',
    paddingHorizontal:
      UI.spacing.xxl,
  },

  loadingTitle: {
    marginTop:
      UI.spacing.lg,
    fontSize:
      UI.typography.subtitle,
    fontWeight: '800',
    color:
      UI.colors.text,
    textAlign: 'center',
  },

  loadingText: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.body,
    lineHeight: 20,
    color:
      UI.colors.textSecondary,
    textAlign: 'center',
  },
})