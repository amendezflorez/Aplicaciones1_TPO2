import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../config/theme';

export default function Avatar({ uri, name = '', size = 96 }) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, dimension]} />;
  }

  return (
    <View style={[styles.placeholder, dimension]}>
      <Text style={[styles.initial, { fontSize: size / 2.5 }]}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surface,
  },
  placeholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.white,
    fontWeight: '700',
  },
});
