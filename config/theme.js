// Sistema visual de Hallado. Todas las pantallas toman colores, tipografía, espaciado,
// radios y sombras de acá: no hardcodear valores sueltos en los StyleSheet.
//
// Dirección: verde azulado profundo (confianza, "vecindario") + coral cálido (acción,
// urgencia de algo perdido), sobre un fondo apenas cálido para que las tarjetas blancas
// se despeguen. Las claves históricas (primary, surface, textMuted, ...) se mantienen
// para no romper pantallas existentes.

export const colors = {
  // Marca
  primary: '#0B6E63',
  primaryDark: '#06463F',
  primarySoft: '#E3F2EF',
  accent: '#F2643D',
  accentSoft: '#FDE9E2',

  // Superficies
  background: '#F6F5F1',
  surface: '#EFEDE7',
  card: '#FFFFFF',
  border: '#E2DFD6',
  borderStrong: '#C9C5B9',

  // Texto
  text: '#16201E',
  textSecondary: '#46524F',
  textMuted: '#7A8582',
  white: '#FFFFFF',

  // Estados
  success: '#1F8A4C',
  successSoft: '#E2F4E9',
  warning: '#B7791F',
  warningSoft: '#FDF3DC',
  error: '#C8372D',
  errorSoft: '#FBE6E4',
  info: '#2563EB',
  infoSoft: '#E5EDFD',

  // Tipos de publicación
  perdido: '#F2643D',
  perdidoSoft: '#FDE9E2',
  encontrado: '#0B6E63',
  encontradoSoft: '#E3F2EF',

  overlay: 'rgba(10, 20, 18, 0.55)',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  round: 999,
};

// Escala tipográfica (fuente del sistema: Roboto en Android). Usar con spread:
// <Text style={[typography.title, ...]}>.
export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: colors.text },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400', color: colors.text },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.text },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400', color: colors.textMuted },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.textSecondary },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mono: { fontSize: 12, lineHeight: 16, fontFamily: 'monospace', color: colors.textSecondary },
};

export const shadow = {
  sm: {
    shadowColor: '#0A1412',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#0A1412',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#0A1412',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

// Opciones comunes para los headers de native-stack (todas las pantallas con header).
export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700', fontSize: 17, color: colors.text },
  contentStyle: { backgroundColor: colors.background },
  headerBackButtonDisplayMode: 'minimal',
};
