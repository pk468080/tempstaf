import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native'

import { UI } from '../../constants/ui'

type AppButtonVariant =
  | 'primary'
  | 'secondary'

type AppButtonProps = PressableProps & {
  title: string
  variant?: AppButtonVariant
}

export function AppButton({
  title,
  variant = 'primary',
  disabled,
  ...props
}: AppButtonProps) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' &&
          styles.secondaryButton,
        disabled && styles.disabled,
        pressed &&
          !disabled &&
          styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'secondary' &&
            styles.secondaryText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: UI.sizes.buttonHeight,
    borderRadius: UI.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI.spacing.xl,
    backgroundColor: UI.colors.primary,
  },

  secondaryButton: {
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.primary,
  },

  text: {
    color: UI.colors.surface,
    fontSize: UI.typography.bodyLarge,
    fontWeight: '700',
  },

  secondaryText: {
    color: UI.colors.primary,
  },

  disabled: {
    opacity: 0.5,
  },

  pressed: {
    opacity: 0.8,
  },
})