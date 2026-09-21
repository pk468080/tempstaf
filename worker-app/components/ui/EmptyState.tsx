import {
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { AppButton } from './AppButton'
import { UI } from '../../constants/ui'

type EmptyStateProps = {
  title?: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({
  title = 'Nothing here yet',
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>
          —
        </Text>
      </View>

      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.message}>
        {message}
      </Text>

      {actionLabel && onAction ? (
        <View style={styles.action}>
          <AppButton
            title={actionLabel}
            onPress={onAction}
          />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI.spacing.xxl,
    backgroundColor: UI.colors.background,
  },

  icon: {
    width: 48,
    height: 48,
    borderRadius: UI.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.colors.infoBackground,
    borderWidth: 1,
    borderColor: UI.colors.info,
  },

  iconText: {
    fontSize: 24,
    fontWeight: '800',
    color: UI.colors.info,
  },

  title: {
    marginTop: UI.spacing.lg,
    fontSize: UI.typography.subtitle,
    lineHeight: 24,
    fontWeight: '800',
    color: UI.colors.text,
    textAlign: 'center',
  },

  message: {
    marginTop: UI.spacing.sm,
    fontSize: UI.typography.body,
    lineHeight: 21,
    color: UI.colors.textSecondary,
    textAlign: 'center',
  },

  action: {
    width: '100%',
    marginTop: UI.spacing.xl,
  },
})