import {
  useMemo,
  useState,
} from 'react'

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

import ErrorState from '../../components/ui/ErrorState'

import {
  UI,
} from '../../constants/ui'

import {
  SCHEDULE,
} from '../../constants/schedule'

import {
  useWorkerSchedule,
} from '../../hooks/useWorkerSchedule'

import type {
  WorkerDayOfWeek,
  WorkerScheduleException,
  WorkerScheduleExceptionType,
  WorkerWeeklySchedule,
} from '../../types/schedule'

const DAY_ORDER: WorkerDayOfWeek[] = [
  0,
  1,
  2,
  3,
  4,
  5,
  6,
]

const DEFAULT_START = '09:00'
const DEFAULT_END = '18:00'

const EXCEPTION_TYPES: WorkerScheduleExceptionType[] = [
  'unavailable',
  'available',
]

type WorkerScheduleScreenProps = {
  onBack?: () => void
}

function formatTime(
  value: string | null,
): string {
  return value
    ? value.slice(0, 5)
    : ''
}

function validateTime(
  value: string,
): boolean {
  return /^\d{2}:\d{2}$/.test(value)
}

function validateDate(
  value: string,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const parsed = new Date(
    `${value}T00:00:00`,
  )

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed
      .toISOString()
      .slice(0, 10) === value
  )
}

function getScheduleForDay(
  schedules: WorkerWeeklySchedule[],
  dayOfWeek: WorkerDayOfWeek,
): WorkerWeeklySchedule | undefined {
  return (
    schedules.find(
      schedule =>
        schedule.dayOfWeek ===
        dayOfWeek,
    )
  )
}

function sortExceptions(
  exceptions: WorkerScheduleException[],
): WorkerScheduleException[] {
  return [...exceptions].sort(
    (a, b) => {
      const dateComparison =
        a.exceptionDate.localeCompare(
          b.exceptionDate,
        )

      if (dateComparison !== 0) {
        return dateComparison
      }

      return (
        (a.startTime ?? '').localeCompare(
          b.startTime ?? '',
        )
      )
    },
  )
}

export default function WorkerScheduleScreen({
  onBack,
}: WorkerScheduleScreenProps) {
  const {
    schedule,
    loading,
    saving,
    error,
    refresh,
    replaceWeeklySchedules,
    setSettings,
    createException,
    deleteException,
  } = useWorkerSchedule()

  const [timezone, setTimezone] =
  useState<string>(
    SCHEDULE.defaults.timezone,
  )

  const [
    slotIntervalMinutes,
    setSlotIntervalMinutes,
  ] = useState(
    String(
      SCHEDULE.defaults
        .slotIntervalMinutes,
    ),
  )

  const [draftDays, setDraftDays] =
    useState<
      Record<
        WorkerDayOfWeek,
        {
          enabled: boolean
          startTime: string
          endTime: string
        }
      >
    >({
      0: {
        enabled: false,
        startTime: DEFAULT_START,
        endTime: DEFAULT_END,
      },
      1: {
        enabled: true,
        startTime: DEFAULT_START,
        endTime: DEFAULT_END,
      },
      2: {
        enabled: true,
        startTime: DEFAULT_START,
        endTime: DEFAULT_END,
      },
      3: {
        enabled: true,
        startTime: DEFAULT_START,
        endTime: DEFAULT_END,
      },
      4: {
        enabled: true,
        startTime: DEFAULT_START,
        endTime: DEFAULT_END,
      },
      5: {
        enabled: true,
        startTime: DEFAULT_START,
        endTime: DEFAULT_END,
      },
      6: {
        enabled: false,
        startTime: DEFAULT_START,
        endTime: DEFAULT_END,
      },
    })

  const [exceptionDate, setExceptionDate] =
    useState('')

  const [
    exceptionType,
    setExceptionType,
  ] = useState<WorkerScheduleExceptionType>(
    'unavailable',
  )

  const [exceptionStart, setExceptionStart] =
    useState('')

  const [exceptionEnd, setExceptionEnd] =
    useState('')

  const [exceptionReason, setExceptionReason] =
    useState('')

  const [localError, setLocalError] =
    useState('')

  const [savingSettings, setSavingSettings] =
    useState(false)

  const [savingException, setSavingException] =
    useState(false)

  const initializedScheduleId =
    schedule?.workerId ?? ''

  const activeDayCount =
    useMemo(
      () =>
        Object.values(draftDays).filter(
          day => day.enabled,
        ).length,
      [draftDays],
    )

  const exceptions = useMemo(
    () =>
      sortExceptions(
        schedule?.exceptions ?? [],
      ),
    [schedule?.exceptions],
  )

  useMemo(() => {
    if (!schedule) {
      return
    }

    setTimezone(
      schedule.settings?.timezone ??
        SCHEDULE.defaults.timezone,
    )

    setSlotIntervalMinutes(
      String(
        schedule.settings
          ?.slotIntervalMinutes ??
          SCHEDULE.defaults
            .slotIntervalMinutes,
      ),
    )

    setDraftDays(current => {
      const next = {
        ...current,
      }

      DAY_ORDER.forEach(
        dayOfWeek => {
          const saved =
            getScheduleForDay(
              schedule.weeklySchedules,
              dayOfWeek,
            )

          if (saved) {
            next[dayOfWeek] = {
              enabled:
                saved.isActive,
              startTime:
                formatTime(
                  saved.startTime,
                ),
              endTime:
                formatTime(
                  saved.endTime,
                ),
            }
          }
        },
      )

      return next
    })
  }, [initializedScheduleId])

  function updateDay(
    dayOfWeek: WorkerDayOfWeek,
    patch: Partial<{
      enabled: boolean
      startTime: string
      endTime: string
    }>,
  ) {
    setLocalError('')

    setDraftDays(current => ({
      ...current,

      [dayOfWeek]: {
        ...current[dayOfWeek],
        ...patch,
      },
    }))
  }

  function validateWeeklyForm():
    string | null {
    const interval =
      Number(
        slotIntervalMinutes,
      )

    if (!timezone.trim()) {
      return 'Timezone is required.'
    }

    if (
      !Number.isInteger(interval) ||
      interval <
        SCHEDULE.validation
          .minimumSlotIntervalMinutes ||
      interval >
        SCHEDULE.validation
          .maximumSlotIntervalMinutes
    ) {
      return `Slot interval must be between ${SCHEDULE.validation.minimumSlotIntervalMinutes} and ${SCHEDULE.validation.maximumSlotIntervalMinutes} minutes.`
    }

    if (activeDayCount === 0) {
      return 'Enable at least one working day.'
    }

    for (
      const dayOfWeek of DAY_ORDER
    ) {
      const day =
        draftDays[dayOfWeek]

      if (!day.enabled) {
        continue
      }

      if (
        !validateTime(
          day.startTime,
        ) ||
        !validateTime(
          day.endTime,
        )
      ) {
        return `${SCHEDULE.dayLabels.long[dayOfWeek]} must use HH:MM format.`
      }

      if (
        day.startTime >=
        day.endTime
      ) {
        return `${SCHEDULE.dayLabels.long[dayOfWeek]} end time must be after start time.`
      }
    }

    return null
  }

  async function handleSaveWeekly() {
    if (saving || savingSettings) {
      return
    }

    setLocalError('')

    const validationError =
      validateWeeklyForm()

    if (validationError) {
      setLocalError(
        validationError,
      )
      return
    }

    setSavingSettings(true)

    try {
      await replaceWeeklySchedules(
        DAY_ORDER.map(
          dayOfWeek => ({
            dayOfWeek,
            startTime:
              draftDays[dayOfWeek]
                .startTime,
            endTime:
              draftDays[dayOfWeek]
                .endTime,
            isActive:
              draftDays[dayOfWeek]
                .enabled,
          }),
        ),
      )

      await setSettings({
        timezone:
          timezone.trim(),
        slotIntervalMinutes:
          Number(
            slotIntervalMinutes,
          ),
      })

      Alert.alert(
        'Schedule saved',
        'Your weekly worker schedule has been updated.',
      )
    } catch {
      // The schedule hook exposes the server
      // error through `error`.
    } finally {
      setSavingSettings(false)
    }
  }

  function validateExceptionForm():
    string | null {
    if (
      !validateDate(
        exceptionDate.trim(),
      )
    ) {
      return 'Enter a valid exception date in YYYY-MM-DD format.'
    }

    const hasStart =
      exceptionStart.trim()
        .length > 0

    const hasEnd =
      exceptionEnd.trim()
        .length > 0

    if (hasStart !== hasEnd) {
      return 'Exception start and end times must be provided together.'
    }

    if (hasStart && hasEnd) {
      if (
        !validateTime(
          exceptionStart.trim(),
        ) ||
        !validateTime(
          exceptionEnd.trim(),
        )
      ) {
        return 'Exception times must use HH:MM format.'
      }

      if (
        exceptionStart.trim() >=
        exceptionEnd.trim()
      ) {
        return 'Exception end time must be after the start time.'
      }
    }

    if (
      exceptionReason.trim()
        .length > 0 &&
      exceptionReason.trim()
        .length > 200
    ) {
      return 'Exception reason must be 200 characters or fewer.'
    }

    return null
  }

  async function handleAddException() {
    if (
      saving ||
      savingException
    ) {
      return
    }

    setLocalError('')

    const validationError =
      validateExceptionForm()

    if (validationError) {
      setLocalError(
        validationError,
      )
      return
    }

    setSavingException(true)

    try {
      await createException({
        exceptionDate:
          exceptionDate.trim(),

        exceptionType,

        startTime:
          exceptionStart.trim()
            ? exceptionStart.trim()
            : null,

        endTime:
          exceptionEnd.trim()
            ? exceptionEnd.trim()
            : null,

        reason:
          exceptionReason.trim()
            ? exceptionReason.trim()
            : null,

        isActive: true,
      })

      setExceptionDate('')
      setExceptionStart('')
      setExceptionEnd('')
      setExceptionReason('')
      setExceptionType(
        'unavailable',
      )

      Alert.alert(
        'Exception added',
        'Your schedule exception has been saved.',
      )
    } catch {
      // The schedule hook exposes the server
      // error through `error`.
    } finally {
      setSavingException(false)
    }
  }

  function handleDeleteException(
    exception: WorkerScheduleException,
  ) {
    Alert.alert(
      'Delete exception',
      `Remove the ${exception.exceptionDate} schedule exception?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteException(
              exception.id,
            )
          },
        },
      ],
    )
  }

  if (loading && !schedule) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={UI.colors.secondary}
          />

          <Text style={styles.loadingTitle}>
            Loading your schedule
          </Text>

          <Text style={styles.loadingText}>
            Fetching your weekly availability and
            schedule exceptions...
          </Text>
        </View>
      </ScreenContainer>
    )
  }

  if (error && !schedule) {
    return (
      <ScreenContainer>
        <ErrorState
          title="Schedule unavailable"
          message={error}
          onAction={() => {
            void refresh()
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
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              WORKER SCHEDULE
            </Text>

            <Text style={styles.title}>
              Manage your availability
            </Text>

            <Text style={styles.subtitle}>
              Set the weekly hours when you can accept
              work and add date-specific exceptions.
            </Text>
          </View>

          {(localError || error) ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>
                Schedule issue
              </Text>

              <Text style={styles.errorText}>
                {localError || error}
              </Text>
            </View>
          ) : null}

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Current weekly schedule
            </Text>

            <Text style={styles.summaryValue}>
              {activeDayCount} active day
              {activeDayCount === 1
                ? ''
                : 's'}
            </Text>

            <Text style={styles.summaryText}>
              Slot interval:{' '}
              {slotIntervalMinutes} minutes
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Schedule settings
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>
                Timezone
              </Text>

              <TextInput
                value={timezone}
                onChangeText={value => {
                  setTimezone(value)
                  setLocalError('')
                }}
                placeholder="Asia/Kolkata"
                placeholderTextColor={
                  UI.colors.textMuted
                }
                autoCapitalize="none"
                autoCorrect={false}
                editable={
                  !saving &&
                  !savingSettings
                }
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Slot interval
              </Text>

              <TextInput
                value={
                  slotIntervalMinutes
                }
                onChangeText={value => {
                  setSlotIntervalMinutes(
                    value.replace(
                      /\D/g,
                      '',
                    ),
                  )
                  setLocalError('')
                }}
                placeholder="30"
                placeholderTextColor={
                  UI.colors.textMuted
                }
                keyboardType="number-pad"
                maxLength={3}
                editable={
                  !saving &&
                  !savingSettings
                }
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Weekly availability
            </Text>

            {DAY_ORDER.map(
              dayOfWeek => {
                const day =
                  draftDays[dayOfWeek]

                return (
                  <View
                    key={dayOfWeek}
                    style={[
                      styles.dayRow,
                      dayOfWeek !== 0 &&
                        styles.rowBorder,
                    ]}
                  >
                    <View style={styles.dayHeader}>
                      <View
                        style={
                          styles.dayCopy
                        }
                      >
                        <Text
                          style={
                            styles.dayName
                          }
                        >
                          {
                            SCHEDULE
                              .dayLabels
                              .long[
                              dayOfWeek
                            ]
                          }
                        </Text>

                        <Text
                          style={
                            styles.dayStatus
                          }
                        >
                          {day.enabled
                            ? `${day.startTime} - ${day.endTime}`
                            : 'Unavailable'}
                        </Text>
                      </View>

                      <View style={styles.dayButton}>
                        <AppButton
                          title={
                            day.enabled
                              ? 'Disable'
                              : 'Enable'
                          }
                          variant="secondary"
                          onPress={() => {
                            updateDay(
                              dayOfWeek,
                              {
                                enabled:
                                  !day.enabled,
                              },
                            )
                          }}
                          disabled={
                            saving ||
                            savingSettings
                          }
                        />
                      </View>
                    </View>

                    {day.enabled ? (
                      <View
                        style={
                          styles.timeRow
                        }
                      >
                        <View
                          style={
                            styles.timeField
                          }
                        >
                          <Text
                            style={
                              styles.timeLabel
                            }
                          >
                            Start
                          </Text>

                          <TextInput
                            value={
                              day.startTime
                            }
                            onChangeText={value => {
                              updateDay(
                                dayOfWeek,
                                {
                                  startTime:
                                    value,
                                },
                              )
                            }}
                            placeholder="09:00"
                            placeholderTextColor={
                              UI.colors
                                .textMuted
                            }
                            autoCapitalize="none"
                            autoCorrect={false}
                            maxLength={5}
                            editable={
                              !saving &&
                              !savingSettings
                            }
                            style={
                              styles.timeInput
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.timeDivider
                          }
                        >
                          <Text
                            style={
                              styles.timeDividerText
                            }
                          >
                            to
                          </Text>
                        </View>

                        <View
                          style={
                            styles.timeField
                          }
                        >
                          <Text
                            style={
                              styles.timeLabel
                            }
                          >
                            End
                          </Text>

                          <TextInput
                            value={
                              day.endTime
                            }
                            onChangeText={value => {
                              updateDay(
                                dayOfWeek,
                                {
                                  endTime:
                                    value,
                                },
                              )
                            }}
                            placeholder="18:00"
                            placeholderTextColor={
                              UI.colors
                                .textMuted
                            }
                            autoCapitalize="none"
                            autoCorrect={false}
                            maxLength={5}
                            editable={
                              !saving &&
                              !savingSettings
                            }
                            style={
                              styles.timeInput
                            }
                          />
                        </View>
                      </View>
                    ) : null}
                  </View>
                )
              },
            )}

            <View style={styles.saveButton}>
              <AppButton
                title={
                  savingSettings
                    ? 'Saving...'
                    : 'Save weekly schedule'
                }
                onPress={() => {
                  void handleSaveWeekly()
                }}
                disabled={
                  saving ||
                  savingSettings
                }
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Add schedule exception
            </Text>

            <Text style={styles.sectionDescription}>
              Add a date when your normal weekly schedule
              should be unavailable or additionally available.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>
                Date
              </Text>

              <TextInput
                value={exceptionDate}
                onChangeText={value => {
                  setExceptionDate(value)
                  setLocalError('')
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={
                  UI.colors.textMuted
                }
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={10}
                editable={
                  !saving &&
                  !savingException
                }
                style={styles.input}
              />
            </View>

            <Text style={styles.label}>
              Exception type
            </Text>

            <View style={styles.typeRow}>
              {EXCEPTION_TYPES.map(
                type => {
                  const selected =
                    exceptionType ===
                    type

                  return (
                    <View
                      key={type}
                      style={
                        styles.typeButton
                      }
                    >
                      <AppButton
                        title={
                          SCHEDULE
                            .labels
                            .exceptionType[
                            type
                          ]
                        }
                        variant={
                          selected
                            ? 'primary'
                            : 'secondary'
                        }
                        onPress={() => {
                          setExceptionType(
                            type,
                          )
                          setLocalError('')
                        }}
                        disabled={
                          saving ||
                          savingException
                        }
                      />
                    </View>
                  )
                },
              )}
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>
                  Start
                </Text>

                <TextInput
                  value={exceptionStart}
                  onChangeText={value => {
                    setExceptionStart(
                      value,
                    )
                    setLocalError('')
                  }}
                  placeholder="Optional"
                  placeholderTextColor={
                    UI.colors.textMuted
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={5}
                  editable={
                    !saving &&
                    !savingException
                  }
                  style={styles.timeInput}
                />
              </View>

              <View
                style={
                  styles.timeDivider
                }
              >
                <Text
                  style={
                    styles.timeDividerText
                  }
                >
                  to
                </Text>
              </View>

              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>
                  End
                </Text>

                <TextInput
                  value={exceptionEnd}
                  onChangeText={value => {
                    setExceptionEnd(
                      value,
                    )
                    setLocalError('')
                  }}
                  placeholder="Optional"
                  placeholderTextColor={
                    UI.colors.textMuted
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={5}
                  editable={
                    !saving &&
                    !savingException
                  }
                  style={styles.timeInput}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Reason
              </Text>

              <TextInput
                value={exceptionReason}
                onChangeText={value => {
                  setExceptionReason(
                    value,
                  )
                  setLocalError('')
                }}
                placeholder="Optional reason"
                placeholderTextColor={
                  UI.colors.textMuted
                }
                multiline
                maxLength={200}
                editable={
                  !saving &&
                  !savingException
                }
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
              />
            </View>

            <View style={styles.saveButton}>
              <AppButton
                title={
                  savingException
                    ? 'Adding...'
                    : 'Add exception'
                }
                onPress={() => {
                  void handleAddException()
                }}
                disabled={
                  saving ||
                  savingException
                }
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Saved exceptions
            </Text>

            {exceptions.length === 0 ? (
              <Text style={styles.emptyText}>
                No schedule exceptions have been added.
              </Text>
            ) : (
              exceptions.map(
                exception => (
                  <View
                    key={exception.id}
                    style={
                      styles.exceptionRow
                    }
                  >
                    <View
                      style={
                        styles.exceptionCopy
                      }
                    >
                      <Text
                        style={
                          styles.exceptionDate
                        }
                      >
                        {exception.exceptionDate}
                      </Text>

                      <Text
                        style={
                          styles.exceptionType
                        }
                      >
                        {
                          SCHEDULE
                            .labels
                            .exceptionType[
                            exception
                              .exceptionType
                          ]
                        }
                      </Text>

                      {exception.startTime &&
                      exception.endTime ? (
                        <Text
                          style={
                            styles.exceptionTime
                          }
                        >
                          {formatTime(
                            exception.startTime,
                          )}
                          {' - '}
                          {formatTime(
                            exception.endTime,
                          )}
                        </Text>
                      ) : (
                        <Text
                          style={
                            styles.exceptionTime
                          }
                        >
                          Whole day
                        </Text>
                      )}

                      {exception.reason ? (
                        <Text
                          style={
                            styles.exceptionReason
                          }
                        >
                          {exception.reason}
                        </Text>
                      ) : null}
                    </View>

                    <View
                      style={
                        styles.exceptionAction
                      }
                    >
                      <AppButton
                        title="Delete"
                        variant="secondary"
                        onPress={() => {
                          handleDeleteException(
                            exception,
                          )
                        }}
                        disabled={
                          saving ||
                          savingException
                        }
                      />
                    </View>
                  </View>
                ),
              )
            )}
          </View>

          {onBack ? (
            <View style={styles.backButton}>
              <AppButton
                title="Back"
                variant="secondary"
                onPress={onBack}
                disabled={
                  saving ||
                  savingSettings ||
                  savingException
                }
              />
            </View>
          ) : null}

          <Text style={styles.footerText}>
            Keep this schedule up to date so job offers
            can be matched against your actual availability.
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
    paddingHorizontal: UI.spacing.xl,
    paddingTop: UI.spacing.xl,
    paddingBottom: UI.spacing.xxxl,
  },

  header: {
    marginBottom: UI.spacing.lg,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: UI.colors.secondary,
  },

  title: {
    marginTop: UI.spacing.sm,
    fontSize: UI.typography.title,
    lineHeight: 30,
    fontWeight: '800',
    color: UI.colors.text,
  },

  subtitle: {
    marginTop: UI.spacing.sm,
    fontSize: UI.typography.body,
    lineHeight: 21,
    color: UI.colors.textSecondary,
  },

  errorBox: {
    marginBottom: UI.spacing.lg,
    padding: UI.spacing.md,
    borderRadius: UI.radius.md,
    backgroundColor:
      UI.colors.errorBackground,
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  errorTitle: {
    fontSize: UI.typography.small,
    fontWeight: '800',
    color: UI.colors.error,
  },

  errorText: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.small,
    lineHeight: 18,
    color: UI.colors.error,
  },

  summaryCard: {
    marginTop: UI.spacing.lg,
    padding: UI.spacing.lg,
    borderRadius: UI.radius.lg,
    backgroundColor:
      UI.colors.infoBackground,
    borderWidth: 1,
    borderColor: UI.colors.info,
  },

  summaryLabel: {
    fontSize: UI.typography.small,
    fontWeight: '700',
    color: UI.colors.textSecondary,
  },

  summaryValue: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.subtitle,
    fontWeight: '800',
    color: UI.colors.text,
  },

  summaryText: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.small,
    color: UI.colors.textSecondary,
  },

  card: {
    marginTop: UI.spacing.lg,
    padding: UI.spacing.lg,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
  },

  sectionTitle: {
    fontSize: UI.typography.subtitle,
    fontWeight: '800',
    color: UI.colors.text,
  },

  sectionDescription: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.small,
    lineHeight: 18,
    color: UI.colors.textSecondary,
  },

  field: {
    marginTop: UI.spacing.lg,
  },

  label: {
    marginBottom: UI.spacing.sm,
    fontSize: UI.typography.small,
    fontWeight: '700',
    color: UI.colors.text,
  },

  input: {
    minHeight: UI.sizes.inputHeight,
    paddingHorizontal: UI.spacing.md,
    paddingVertical: UI.spacing.sm,
    borderWidth: 1,
    borderColor: UI.colors.inputBorder,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.surface,
    fontSize: UI.typography.bodyLarge,
    color: UI.colors.text,
  },

  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },

  dayRow: {
    paddingVertical: UI.spacing.lg,
  },

  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: UI.colors.border,
  },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dayCopy: {
    flex: 1,
    paddingRight: UI.spacing.md,
  },

  dayName: {
    fontSize: UI.typography.bodyLarge,
    fontWeight: '800',
    color: UI.colors.text,
  },

  dayStatus: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.small,
    color: UI.colors.textSecondary,
  },

  dayButton: {
    width: 92,
  },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: UI.spacing.md,
  },

  timeField: {
    flex: 1,
  },

  timeLabel: {
    marginBottom: UI.spacing.xs,
    fontSize: UI.typography.small,
    fontWeight: '600',
    color: UI.colors.textSecondary,
  },

  timeInput: {
    minHeight: 44,
    paddingHorizontal: UI.spacing.md,
    borderWidth: 1,
    borderColor: UI.colors.inputBorder,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.surface,
    fontSize: UI.typography.bodyLarge,
    color: UI.colors.text,
  },

  timeDivider: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
  },

  timeDividerText: {
    fontSize: UI.typography.small,
    color: UI.colors.textMuted,
  },

  saveButton: {
    marginTop: UI.spacing.lg,
  },

  typeRow: {
    flexDirection: 'row',
    marginTop: UI.spacing.xs,
  },

  typeButton: {
    flex: 1,
    marginRight: UI.spacing.sm,
  },

  exceptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: UI.spacing.md,
    paddingTop: UI.spacing.md,
    borderTopWidth: 1,
    borderTopColor: UI.colors.border,
  },

  exceptionCopy: {
    flex: 1,
    paddingRight: UI.spacing.md,
  },

  exceptionDate: {
    fontSize: UI.typography.bodyLarge,
    fontWeight: '800',
    color: UI.colors.text,
  },

  exceptionType: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.small,
    fontWeight: '700',
    color: UI.colors.secondary,
  },

  exceptionTime: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.small,
    color: UI.colors.textSecondary,
  },

  exceptionReason: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.small,
    lineHeight: 18,
    color: UI.colors.textSecondary,
  },

  exceptionAction: {
    width: 90,
  },

  emptyText: {
    marginTop: UI.spacing.md,
    fontSize: UI.typography.body,
    lineHeight: 20,
    color: UI.colors.textMuted,
  },

  backButton: {
    marginTop: UI.spacing.lg,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI.spacing.xxl,
  },

  loadingTitle: {
    marginTop: UI.spacing.lg,
    fontSize: UI.typography.subtitle,
    fontWeight: '800',
    color: UI.colors.text,
    textAlign: 'center',
  },

  loadingText: {
    marginTop: UI.spacing.sm,
    fontSize: UI.typography.body,
    lineHeight: 20,
    color: UI.colors.textSecondary,
    textAlign: 'center',
  },

  footerText: {
    marginTop: UI.spacing.lg,
    fontSize: UI.typography.caption,
    lineHeight: 16,
    color: UI.colors.textMuted,
    textAlign: 'center',
  },
})