import {
  SafeAreaView,
  StyleSheet,
  type ViewProps,
} from 'react-native'

import { UI } from '../../constants/ui'

export function ScreenContainer({
  style,
  ...props
}: ViewProps) {
  return (
    <SafeAreaView
      {...props}
      style={[
        styles.container,
        style,
      ]}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.colors.surface,
  },
})