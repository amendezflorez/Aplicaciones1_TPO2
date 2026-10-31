import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../config/theme';
import { resolverUrlFoto } from '../utils/fotoUrl';

// Foto de una publicación (PublicationCard, PhotoGallery). Si no hay URL o la imagen no
// se puede cargar (host inalcanzable, archivo inexistente o corrupto), muestra un ícono de
// imagen en vez de dejar el espacio en blanco — <Image> falla en silencio.
export default function FotoPublicacion({ url, style, iconSize = 28 }) {
  const [fallo, setFallo] = useState(false);
  const uri = resolverUrlFoto(url);

  if (!uri || fallo) {
    return (
      <View style={[style, styles.placeholder]}>
        <Ionicons name="image-outline" size={iconSize} color={colors.textMuted} />
      </View>
    );
  }

  return <Image source={{ uri }} style={style} onError={() => setFallo(true)} />;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
