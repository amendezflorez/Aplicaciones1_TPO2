import { StyleSheet, Text } from 'react-native';
import { colors } from '../config/theme';

export default function ErrorText({ message }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  error: {
    color: colors.error,
    fontSize: 14,
  },
});
