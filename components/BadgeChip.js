import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../config/theme';

export default function BadgeChip({ label }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.text}>🏅 {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.accent,
    borderRadius: radius.round,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md - 4,
  },
  text: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
});
