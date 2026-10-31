import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../config/theme';
import OfflineBanner from './OfflineBanner';

export default function Screen({ children, scroll = true, style }) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Punto 6: visible en toda pantalla que use <Screen> sin que cada una lo agregue a
         mano — ver components/OfflineBanner.js. */}
      <OfflineBanner />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  fill: {
    flex: 1,
  },
});
