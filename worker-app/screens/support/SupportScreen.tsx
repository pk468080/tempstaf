import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import {
  AppButton,
} from '../../components/ui/AppButton'

import {
  ScreenContainer,
} from '../../components/layout/ScreenContainer'

import EmptyState from '../../components/ui/EmptyState'

import ErrorState from '../../components/ui/ErrorState'

import StatusBadge from '../../components/ui/StatusBadge'

import {
  UI,
} from '../../constants/ui'

import {
  createWorkerSupportTicket,
  getWorkerSupportCategoryLabel,
  getWorkerSupportTickets,
  isOpenWorkerSupportTicket,
  type WorkerSupportCategory,
  type WorkerSupportTicket,
} from '../../services/support/workerSupport.service'

type SupportScreenProps = {
  onBack?: () => void
  initialBookingId?: string
}

const CATEGORIES: WorkerSupportCategory[] = [
  'booking',
  'payment',
  'worker',
  'refund',
  'technical',
]

const MAX_SUBJECT_LENGTH = 120

const MAX_DESCRIPTION_LENGTH = 1000

function getStatusLabel(
  status: string,
): string {
  switch (status) {
    case 'open':
      return 'Open'

    case 'in_progress':
      return 'In progress'

    case 'resolved':
      return 'Resolved'

    case 'closed':
      return 'Closed'

    default:
      return status
        .replace(/_/g, ' ')
        .replace(
          /^./,
          value =>
            value.toUpperCase(),
        )
  }
}

function getStatusVariant(
  status: string,
):
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info' {
  switch (status) {
    case 'open':
      return 'info'

    case 'in_progress':
      return 'warning'

    case 'resolved':
      return 'success'

    case 'closed':
      return 'default'

    default:
      return 'default'
  }
}

function formatDateTime(
  value: string,
): string {
  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

export default function SupportScreen({
  onBack,
  initialBookingId,
}: SupportScreenProps) {
  const [
    tickets,
    setTickets,
  ] = useState<
    WorkerSupportTicket[]
  >([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    refreshing,
    setRefreshing,
  ] = useState(false)

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    category,
    setCategory,
  ] = useState<WorkerSupportCategory>(
    'booking',
  )

  const [
    subject,
    setSubject,
  ] = useState('')

  const [
    description,
    setDescription,
  ] = useState('')

  const [
    bookingId,
    setBookingId,
  ] = useState(
    initialBookingId ?? '',
  )

  const [
    localError,
    setLocalError,
  ] = useState('')

  const loadTickets =
    useCallback(
      async (
        mode:
          | 'initial'
          | 'refresh' = 'initial',
      ) => {
        setError('')

        if (
          mode ===
          'initial'
        ) {
          setLoading(true)
        } else {
          setRefreshing(true)
        }

        try {
          const nextTickets =
            await getWorkerSupportTickets(
              50,
            )

          setTickets(
            nextTickets,
          )
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load your support tickets.',
          )
        } finally {
          if (
            mode ===
            'initial'
          ) {
            setLoading(false)
          } else {
            setRefreshing(false)
          }
        }
      },
      [],
    )

  useEffect(() => {
    void loadTickets()
  }, [loadTickets])

  useEffect(() => {
    if (
      initialBookingId
    ) {
      setBookingId(
        initialBookingId,
      )
      setCategory(
        'booking',
      )
    }
  }, [initialBookingId])

  const openTicketCount =
    useMemo(
      () =>
        tickets.filter(
          ticket =>
            isOpenWorkerSupportTicket(
              ticket,
            ),
        ).length,
      [tickets],
    )

  function validateForm(): string | null {
    const normalizedSubject =
      subject.trim()

    const normalizedDescription =
      description.trim()

    const normalizedBookingId =
      bookingId.trim()

    if (
      !normalizedSubject
    ) {
      return 'Ticket subject is required.'
    }

    if (
      normalizedSubject.length >
      MAX_SUBJECT_LENGTH
    ) {
      return `Ticket subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.`
    }

    if (
      !normalizedDescription
    ) {
      return 'Ticket description is required.'
    }

    if (
      normalizedDescription.length >
      MAX_DESCRIPTION_LENGTH
    ) {
      return `Ticket description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`
    }

    if (
      category ===
        'booking' &&
      !normalizedBookingId
    ) {
      return 'Booking reference is required for a booking ticket.'
    }

    return null
  }

  async function handleSubmit() {
    if (submitting) {
      return
    }

    setError('')
    setLocalError('')

    const validationError =
      validateForm()

    if (validationError) {
      setLocalError(
        validationError,
      )
      return
    }

    setSubmitting(true)

    try {
      const created =
        await createWorkerSupportTicket(
          {
            category,

            subject:
              subject.trim(),

            description:
              description.trim(),

            bookingId:
              bookingId.trim()
                ? bookingId.trim()
                : null,
          },
        )

      setTickets(
        current => [
          created,
          ...current,
        ],
      )

      setSubject('')
      setDescription('')

      if (
        !initialBookingId
      ) {
        setBookingId('')
      }

      Alert.alert(
        'Support ticket created',
        `Ticket ${created.id} has been created. Our support team can now review it.`,
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to create your support ticket.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (
    loading &&
    tickets.length === 0
  ) {
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
            Loading support
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Fetching your worker support tickets...
          </Text>
        </View>
      </ScreenContainer>
    )
  }

  if (
    error &&
    tickets.length === 0
  ) {
    return (
      <ScreenContainer>
        <ErrorState
          title="Support unavailable"
          message={error}
          onAction={() => {
            void loadTickets()
          }}
        />
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={() => {
                void loadTickets(
                  'refresh',
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
                WORKER SUPPORT
              </Text>

              <Text
                style={styles.title}
              >
                Support
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Create a support ticket for booking,
                payment, account, refund or technical issues.
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
                  disabled={
                    submitting
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
                Support update notice
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
              styles.summaryCard
            }
          >
            <View
              style={
                styles.summaryCopy
              }
            >
              <Text
                style={
                  styles.summaryTitle
                }
              >
                Your support tickets
              </Text>

              <Text
                style={
                  styles.summaryText
                }
              >
                {openTicketCount === 0
                  ? 'No open support tickets.'
                  : `${openTicketCount} open support ticket${
                      openTicketCount === 1
                        ? ''
                        : 's'
                    }`}
              </Text>
            </View>

            <StatusBadge
              label={`${tickets.length} total`}
              variant="default"
            />
          </View>

          <View
            style={styles.card}
          >
            <Text
              style={styles.sectionTitle}
            >
              Create a support ticket
            </Text>

            <Text
              style={
                styles.sectionDescription
              }
            >
              Provide enough detail for the support team
              to identify and resolve the issue.
            </Text>

            <View
              style={styles.field}
            >
              <Text
                style={styles.label}
              >
                Category
              </Text>

              <View
                style={
                  styles.categoryGrid
                }
              >
                {CATEGORIES.map(
                  item => {
                    const selected =
                      category ===
                      item

                    return (
                      <View
                        key={item}
                        style={
                          styles.categoryButton
                        }
                      >
                        <AppButton
                          title={getWorkerSupportCategoryLabel(
                            item,
                          )}
                          variant={
                            selected
                              ? 'primary'
                              : 'secondary'
                          }
                          onPress={() => {
                            setCategory(
                              item,
                            )
                            setLocalError(
                              '',
                            )
                          }}
                          disabled={
                            submitting
                          }
                        />
                      </View>
                    )
                  },
                )}
              </View>
            </View>

            <View
              style={styles.field}
            >
              <Text
                style={styles.label}
              >
                Subject
              </Text>

              <TextInput
                value={subject}
                onChangeText={value => {
                  setSubject(
                    value,
                  )
                  setLocalError('')
                  setError('')
                }}
                placeholder="Describe the issue briefly"
                placeholderTextColor={
                  UI.colors
                    .textMuted
                }
                editable={
                  !submitting
                }
                maxLength={
                  MAX_SUBJECT_LENGTH
                }
                style={
                  styles.input
                }
              />

              <Text
                style={
                  styles.helperText
                }
              >
                {subject.length}/
                {
                  MAX_SUBJECT_LENGTH
                }
              </Text>
            </View>

            <View
              style={styles.field}
            >
              <Text
                style={styles.label}
              >
                Booking reference
              </Text>

              <TextInput
                value={
                  bookingId
                }
                onChangeText={value => {
                  setBookingId(
                    value,
                  )
                  setLocalError('')
                  setError('')
                }}
                placeholder={
                  category ===
                  'booking'
                    ? 'Required for booking issues'
                    : 'Optional'
                }
                placeholderTextColor={
                  UI.colors
                    .textMuted
                }
                autoCapitalize="none"
                autoCorrect={
                  false
                }
                editable={
                  !submitting
                }
                style={
                  styles.input
                }
              />

              <Text
                style={
                  styles.helperText
                }
              >
                Provide the booking ID when the issue is
                related to a specific booking.
              </Text>
            </View>

            <View
              style={styles.field}
            >
              <Text
                style={styles.label}
              >
                Description
              </Text>

              <TextInput
                value={
                  description
                }
                onChangeText={value => {
                  setDescription(
                    value,
                  )
                  setLocalError('')
                  setError('')
                }}
                placeholder="Explain what happened and what you need help with"
                placeholderTextColor={
                  UI.colors
                    .textMuted
                }
                multiline
                textAlignVertical="top"
                editable={
                  !submitting
                }
                maxLength={
                  MAX_DESCRIPTION_LENGTH
                }
                style={[
                  styles.input,
                  styles.multiline,
                ]}
              />

              <Text
                style={
                  styles.helperText
                }
              >
                {description.length}/
                {
                  MAX_DESCRIPTION_LENGTH
                }
              </Text>
            </View>

            {localError ? (
              <View
                style={
                  styles.formError
                }
              >
                <Text
                  style={
                    styles.formErrorText
                  }
                >
                  {localError}
                </Text>
              </View>
            ) : null}

            <View
              style={
                styles.submitButton
              }
            >
              <AppButton
                title={
                  submitting
                    ? 'Creating ticket...'
                    : 'Create support ticket'
                }
                onPress={() => {
                  void handleSubmit()
                }}
                disabled={
                  submitting
                }
              />
            </View>
          </View>

          <View
            style={styles.card}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Ticket history
            </Text>

            {tickets.length ===
            0 ? (
              <View
                style={
                  styles.emptyWrapper
                }
              >
                <EmptyState
                  title="No support tickets"
                  message="Your support requests will appear here after you create the first ticket."
                />
              </View>
            ) : (
              <View
                style={
                  styles.ticketList
                }
              >
                {tickets.map(
                  ticket => (
                    <View
                      key={
                        ticket.id
                      }
                      style={
                        styles.ticket
                      }
                    >
                      <View
                        style={
                          styles.ticketHeader
                        }
                      >
                        <View
                          style={
                            styles.ticketCopy
                          }
                        >
                          <Text
                            style={
                              styles.ticketSubject
                            }
                          >
                            {
                              ticket.subject
                            }
                          </Text>

                          <Text
                            style={
                              styles.ticketMeta
                            }
                          >
                            {
                              ticket.id
                            }
                          </Text>
                        </View>

                        <StatusBadge
                          label={getStatusLabel(
                            ticket.status,
                          )}
                          variant={getStatusVariant(
                            ticket.status,
                          )}
                        />
                      </View>

                      <Text
                        style={
                          styles.ticketCategory
                        }
                      >
                        {getWorkerSupportCategoryLabel(
                          ticket.category,
                        )}
                      </Text>

                      <Text
                        style={
                          styles.ticketDescription
                        }
                      >
                        {
                          ticket.description
                        }
                      </Text>

                      {ticket.bookingId ? (
                        <Text
                          style={
                            styles.ticketBooking
                          }
                        >
                          Booking:{' '}
                          {
                            ticket.bookingId
                          }
                        </Text>
                      ) : null}

                      {ticket.adminNotes ? (
                        <View
                          style={
                            styles.adminNotes
                          }
                        >
                          <Text
                            style={
                              styles.adminNotesTitle
                            }
                          >
                            Support response
                          </Text>

                          <Text
                            style={
                              styles.adminNotesText
                            }
                          >
                            {
                              ticket.adminNotes
                            }
                          </Text>
                        </View>
                      ) : null}

                      <Text
                        style={
                          styles.ticketDate
                        }
                      >
                        Created:{' '}
                        {formatDateTime(
                          ticket.createdAt,
                        )}
                      </Text>

                      {ticket.resolvedAt ? (
                        <Text
                          style={
                            styles.ticketDate
                          }
                        >
                          Resolved:{' '}
                          {formatDateTime(
                            ticket.resolvedAt,
                          )}
                        </Text>
                      ) : null}
                    </View>
                  ),
                )}
              </View>
            )}
          </View>

          <Text
            style={
              styles.footerText
            }
          >
            Support tickets are associated with your authenticated
            TempStaff worker account.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },

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

  subtitle: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.body,
    lineHeight: 21,
    color:
      UI.colors.textSecondary,
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
    borderColor: '#FDE68A',
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

  summaryCard: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
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

  summaryCopy: {
    flex: 1,
    paddingRight:
      UI.spacing.md,
  },

  summaryTitle: {
    fontSize:
      UI.typography.bodyLarge,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  summaryText: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.small,
    color:
      UI.colors.textSecondary,
  },

  card: {
    marginTop:
      UI.spacing.lg,
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

  sectionTitle: {
    fontSize:
      UI.typography.subtitle,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  sectionDescription: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.small,
    lineHeight: 18,
    color:
      UI.colors.textSecondary,
  },

  field: {
    marginTop:
      UI.spacing.lg,
  },

  label: {
    marginBottom:
      UI.spacing.sm,
    fontSize:
      UI.typography.small,
    fontWeight: '700',
    color:
      UI.colors.text,
  },

  categoryGrid: {
    flexDirection:
      'row',
    flexWrap:
      'wrap',
    marginLeft:
      -UI.spacing.sm,
  },

  categoryButton: {
    width: '50%',
    marginBottom:
      UI.spacing.sm,
    paddingLeft:
      UI.spacing.sm,
  },

  input: {
    minHeight:
      UI.sizes.inputHeight,
    paddingHorizontal:
      UI.spacing.md,
    paddingVertical:
      UI.spacing.sm,
    borderWidth: 1,
    borderColor:
      UI.colors.inputBorder,
    borderRadius:
      UI.radius.md,
    backgroundColor:
      UI.colors.surface,
    fontSize:
      UI.typography.bodyLarge,
    color:
      UI.colors.text,
  },

  multiline: {
    minHeight: 120,
  },

  helperText: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.caption,
    lineHeight: 16,
    color:
      UI.colors.textMuted,
  },

  formError: {
    marginTop:
      UI.spacing.md,
    padding:
      UI.spacing.md,
    borderRadius:
      UI.radius.md,
    backgroundColor:
      UI.colors.errorBackground,
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  formErrorText: {
    fontSize:
      UI.typography.small,
    lineHeight: 18,
    color:
      UI.colors.error,
  },

  submitButton: {
    marginTop:
      UI.spacing.lg,
  },

  ticketList: {
    marginTop:
      UI.spacing.md,
  },

  ticket: {
    paddingTop:
      UI.spacing.lg,
    paddingBottom:
      UI.spacing.lg,
    borderTopWidth: 1,
    borderTopColor:
      UI.colors.border,
  },

  ticketHeader: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
  },

  ticketCopy: {
    flex: 1,
    paddingRight:
      UI.spacing.md,
  },

  ticketSubject: {
    fontSize:
      UI.typography.bodyLarge,
    lineHeight: 21,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  ticketMeta: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.caption,
    color:
      UI.colors.textMuted,
  },

  ticketCategory: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.small,
    fontWeight: '700',
    color:
      UI.colors.secondary,
  },

  ticketDescription: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.body,
    lineHeight: 20,
    color:
      UI.colors.textSecondary,
  },

  ticketBooking: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.small,
    fontWeight: '600',
    color:
      UI.colors.text,
  },

  adminNotes: {
    marginTop:
      UI.spacing.md,
    padding:
      UI.spacing.md,
    borderRadius:
      UI.radius.md,
    backgroundColor:
      UI.colors.infoBackground,
  },

  adminNotesTitle: {
    fontSize:
      UI.typography.small,
    fontWeight: '800',
    color:
      UI.colors.info,
  },

  adminNotesText: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.small,
    lineHeight: 18,
    color:
      UI.colors.textSecondary,
  },

  ticketDate: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.caption,
    color:
      UI.colors.textMuted,
  },

  emptyWrapper: {
    minHeight: 260,
    marginTop:
      UI.spacing.md,
  },

  footerText: {
    marginTop:
      UI.spacing.lg,
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