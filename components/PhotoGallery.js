import { useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, radius, spacing } from '../config/theme';
import FotoPublicacion from './FotoPublicacion';

// Carrusel horizontal a todo el ancho de la pantalla (sin bordes redondeados: pensado para
// ir pegado arriba del detalle; quien lo use dentro de un contenedor con padding lo
// compensa con márgenes negativos). Indicador de páginas: puntos sobre la foto y contador
// "2/5". FlatList horizontal + onMomentumScrollEnd para saber qué foto está activa, sin
// ninguna librería de carrusel.
export default function PhotoGallery({ fotos, altura = 280, style }) {
  const { width } = useWindowDimensions();
  const [activa, setActiva] = useState(0);
  const estiloFoto = { width, height: altura };

  if (!fotos || fotos.length === 0) {
    return (
      <View style={style}>
        <FotoPublicacion url={null} style={estiloFoto} iconSize={64} />
      </View>
    );
  }

  const onScrollEnd = (event) => {
    setActiva(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={style}>
      <FlatList
        data={fotos}
        keyExtractor={(item) => String(item.id ?? item.url)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => <FotoPublicacion url={item.url} style={estiloFoto} iconSize={64} />}
      />
      {fotos.length > 1 ? (
        <>
          <View style={styles.contador} accessibilityLabel={`Foto ${activa + 1} de ${fotos.length}`}>
            <Text style={styles.contadorTexto}>
              {activa + 1}/{fotos.length}
            </Text>
          </View>
          <View style={styles.dots} pointerEvents="none">
            {fotos.map((_, i) => (
              <View key={i} style={[styles.dot, i === activa && styles.dotActiva]} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contador: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.round,
    backgroundColor: colors.overlay,
  },
  contadorTexto: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.round,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActiva: {
    width: 18,
    backgroundColor: colors.white,
  },
});
