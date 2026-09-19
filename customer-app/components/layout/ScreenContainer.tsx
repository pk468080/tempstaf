import {
  SafeAreaView,
  StyleSheet,
  type ViewProps,
} from 'react-native'

export function ScreenContainer({
  style,
  ...props
}: ViewProps) {
  return (
    <SafeAreaView
      {...props}
      style={[styles.container, style]}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
})