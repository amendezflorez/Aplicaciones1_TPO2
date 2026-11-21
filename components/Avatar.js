import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../config/theme';
import { resolverUrlFoto } from '../utils/fotoUrl';

// Foto de perfil redonda; sin foto, la inicial del nombre sobre el color de marca.
// ring dibuja un aro blanco (para apoyarla sobre fondos de color o sobre una tarjeta).
export default function Avatar({ uri, name = '', size = 96, ring = false }) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  const ringStyle = ring ? { borderWidth: Math.max(3, size / 24), borderColor: colors.card } : null;

  if (uri) {
    return (
      <Image
        source={{ uri: resolverUrlFoto(uri) }}
        style={[styles.image, dimension, ringStyle]}
        accessibilityLabel={name ? `Foto de ${name}` : 'Foto de perfil'}
      />
    );
  }

  return (
    <View style={[styles.placeholder, dimension, ringStyle]} accessibilityLabel={name ? `Avatar de ${name}` : 'Avatar'}>
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
    fontWeight: '800',
  },
});
