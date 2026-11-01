import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Button from '../../components/Button';
import { colors, radius, spacing } from '../../config/theme';
import { getErrorMessage } from '../../services/errors';
import { valorarCaso } from '../../services/historialService';

export default function ValorarModal({ visible, caso, onClose, onValorado }) {
  const [positiva, setPositiva] = useState(true);
  const [comentario, setComentario] = useState('');
  const [incluirAgradecimiento, setIncluirAgradecimiento] = useState(false);
  const [agradecimiento, setAgradecimiento] = useState('');
  const [loading, setLoading] = useState(false);

  if (!caso) return null;

  const esRecuperador = caso.tipo === 'recupere';

  const enviar = async () => {
    setLoading(true);
    try {
      const data = {
        positiva,
        comentario: comentario.trim() || undefined,
        agradecimientoPublico: esRecuperador && incluirAgradecimiento && agradecimiento.trim()
          ? agradecimiento.trim()
          : undefined,
      };
      const actualizado = await valorarCaso(caso.id, data);
      Alert.alert('¡Muchas gracias!', 'Tu valoración fue registrada exitosamente.');
      onValorado(actualizado);
      onClose();
    } catch (e) {
      Alert.alert('No se pudo enviar', getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.titulo}>Valorar a {caso.contraparte.name}</Text>
            <Text style={styles.subtitulo}>
              Por la devolución de: {caso.publicacionTitulo}
            </Text>

            <Text style={styles.label}>¿Cómo calificarías la experiencia?</Text>
            <View style={styles.selectorCalificacion}>
              <TouchableOpacity
                style={[styles.opcionCalificacion, positiva && styles.opcionPositivaActiva]}
                onPress={() => setPositiva(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.calificacionEmoji}>👍</Text>
                <Text style={[styles.calificacionTexto, positiva && styles.calificacionTextoActivo]}>
                  Positiva
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.opcionCalificacion, !positiva && styles.opcionNegativaActiva]}
                onPress={() => setPositiva(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.calificacionEmoji}>👎</Text>
                <Text style={[styles.calificacionTexto, !positiva && styles.calificacionTextoActivo]}>
                  Negativa
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Mensaje breve (opcional)</Text>
            <TextInput
              style={styles.inputArea}
              placeholder="Contá cómo fue la entrega o el trato recibido…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={250}
              value={comentario}
              onChangeText={setComentario}
            />

            {esRecuperador ? (
              <View style={styles.agradecimientoSeccion}>
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>Agradecimiento público</Text>
                    <Text style={styles.switchSub}>
                      Aparecerá en el perfil público de {caso.contraparte.name} para destacar su ayuda.
                    </Text>
                  </View>
                  <Switch
                    value={incluirAgradecimiento}
                    onValueChange={setIncluirAgradecimiento}
                    trackColor={{ true: colors.primary, false: colors.border }}
                  />
                </View>

                {incluirAgradecimiento ? (
                  <TextInput
                    style={styles.inputArea}
                    placeholder="Escribí unas palabras públicas de agradecimiento…"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    maxLength={250}
                    value={agradecimiento}
                    onChangeText={setAgradecimiento}
                  />
                ) : null}
              </View>
            ) : null}

            <View style={styles.botones}>
              <Button
                title="Cancelar"
                variant="secondary"
                onPress={onClose}
                disabled={loading}
              />
              <Button
                title="Enviar valoración"
                onPress={enviar}
                loading={loading}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '85%',
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitulo: {
    fontSize: 14,
    color: colors.textMuted,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  selectorCalificacion: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  opcionCalificacion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  opcionPositivaActiva: {
    borderColor: '#16A34A',
    backgroundColor: '#DCFCE7',
  },
  opcionNegativaActiva: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  calificacionEmoji: {
    fontSize: 20,
  },
  calificacionTexto: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
  },
  calificacionTextoActivo: {
    color: colors.text,
  },
  inputArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  agradecimientoSeccion: {
    backgroundColor: '#F0F9FF',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  switchSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  botones: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});

