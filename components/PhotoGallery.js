import { useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../config/theme';

// Ancho del carrusel = ancho de pantalla menos el padding horizontal que ya aplica
// <Screen> (spacing.md de cada lado) — si no, las fotos se ven más anchas que el resto
// del contenido y quedan cortadas contra el borde.
const GALLERY_WIDTH = Dimensions.get('window').width - spacing.md * 2;

// Carrusel horizontal con puntos de paginación (sección 4.3 del plan). Reusa el patrón de
// FlatList horizontal + onMomentumScrollEnd para saber qué foto está activa, sin traer
// ninguna librería de carrusel.
export default function PhotoGallery({ fotos }) {
  const [activa, setActiva] = useState(0);

  if (!fotos || fotos.length === 0) {
    return <View style={[styles.imagen, styles.placeholder]} />;
  }

  const onScrollEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / GALLERY_WIDTH);
    setActiva(index);
  };

  return (
    <View>
      <FlatList
        data={fotos}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => <Image source={{ uri: item.url }} style={styles.imagen} />}
      />
      {fotos.length > 1 ? (
        <View style={styles.dots}>
          {fotos.map((_, i) => (
            <View key={i} style={[styles.dot, i === activa && styles.dotActiva]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  imagen: {
    width: GALLERY_WIDTH,
    height: 240,
    borderRadius: radius.md,
  },
  placeholder: {
    backgroundColor: colors.surface,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.round,
    backgroundColor: colors.border,
  },
  dotActiva: {
    backgroundColor: colors.primary,
  },
});
