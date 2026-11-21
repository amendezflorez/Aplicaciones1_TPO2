import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Button from '../../components/Button';
import { InlineMessage } from '../../components/StateViews';
import { colors, radius, spacing, typography } from '../../config/theme';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../services/errors';
import { valorarCaso } from '../../services/historialService';

const MAX_MENSAJE = 250;

// Valoración de la contraparte (Punto 10): positiva/negativa, mensaje breve opcional y,
// solo para quien recuperó el objeto, un agradecimiento público opcional.
export default function ValorarModal({ visible, caso, onClose, onValorado }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* El formulario se monta recién al abrir: cada caso arranca con campos limpios. */}
      {caso ? <Formulario key={caso.id} caso={caso} onClose={onClose} onValorado={onValorado} /> : null}
    </Modal>
  );
}

function Formulario({ caso, onClose, onValorado }) {
  const toast = useToast();
  const [positiva, setPositiva] = useState(null); // null = todavía no eligió
  const [comentario, setComentario] = useState('');
  const [incluirAgradecimiento, setIncluirAgradecimiento] = useState(false);
  const [agradecimiento, setAgradecimiento] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const esRecuperador = caso.tipo === 'recupere';
  const nombre = caso.contraparte.name;

  const enviar = async () => {
    if (positiva === null) return;
    setLoading(true);
    setError('');
    try {
      const actualizado = await valorarCaso(caso.id, {
        positiva,
        comentario: comentario.trim() || undefined,
        agradecimientoPublico:
          esRecuperador && incluirAgradecimiento && agradecimiento.trim() ? agradecimiento.trim() : undefined,
      });
      onValorado(actualizado);
      onClose();
      toast.success(`Listo, valoraste a ${nombre}. ¡Gracias por ayudar a la comunidad!`);
    } catch (e) {
      // El toast queda detrás del modal: el error se muestra también adentro.
      const mensaje = getErrorMessage(e);
      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.fondo} onPress={loading ? undefined : onClose} accessibilityLabel="Cerrar" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.encabezado}>
              <Text style={styles.titulo}>{`Valorar a ${nombre}`}</Text>
              <Text style={styles.subtitulo} numberOfLines={2}>
                {caso.publicacionTitulo}
              </Text>
            </View>

            <Text style={styles.label}>¿Cómo fue la experiencia?</Text>
            <View style={styles.opciones}>
              <Opcion
                icon="thumbs-up"
                label="Positiva"
                tone="success"
                selected={positiva === true}
                onPress={() => setPositiva(true)}
              />
              <Opcion
                icon="thumbs-down"
                label="Negativa"
                tone="error"
                selected={positiva === false}
                onPress={() => setPositiva(false)}
              />
            </View>

            <View style={styles.campo}>
              <Text style={styles.label}>Mensaje breve (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Contá cómo fue la entrega o el trato…"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={MAX_MENSAJE}
                value={comentario}
                onChangeText={setComentario}
                accessibilityLabel="Mensaje de la valoración"
              />
              <Contador valor={comentario} />
            </View>

            {esRecuperador ? (
              <View style={styles.agradecimientoBox}>
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>Agradecimiento público</Text>
                    <Text style={styles.ayuda}>{`Se muestra en el perfil de ${nombre}.`}</Text>
                  </View>
                  <Switch
                    value={incluirAgradecimiento}
                    onValueChange={setIncluirAgradecimiento}
                    trackColor={{ true: colors.primary, false: colors.borderStrong }}
                    thumbColor={colors.white}
                    accessibilityLabel="Dejar un agradecimiento público"
                  />
                </View>
                {incluirAgradecimiento ? (
                  <View style={styles.campo}>
                    <TextInput
                      style={styles.input}
                      placeholder="Escribí unas palabras de agradecimiento…"
                      placeholderTextColor={colors.textMuted}
                      multiline
                      maxLength={MAX_MENSAJE}
                      value={agradecimiento}
                      onChangeText={setAgradecimiento}
                      accessibilityLabel="Agradecimiento público"
                    />
                    <Contador valor={agradecimiento} />
                  </View>
                ) : null}
              </View>
            ) : null}

            <InlineMessage tone="error" message={error} />
          </ScrollView>

          <View style={styles.footer}>
            <Button title="Cancelar" variant="secondary" onPress={onClose} disabled={loading} style={styles.footerBtn} />
            <Button
              title="Enviar valoración"
              icon="send"
              onPress={enviar}
              loading={loading}
              disabled={positiva === null}
              style={styles.footerBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function Contador({ valor }) {
  const restante = MAX_MENSAJE - valor.length;
  return (
    <Text style={[styles.contador, restante <= 20 && styles.contadorLimite]}>{`${valor.length}/${MAX_MENSAJE}`}</Text>
  );
}

function Opcion({ icon, label, tone, selected, onPress }) {
  const color = tone === 'success' ? colors.success : colors.error;
  const soft = tone === 'success' ? colors.successSoft : colors.errorSoft;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Valoración ${label.toLowerCase()}`}
      style={[styles.opcion, selected && { borderColor: color, backgroundColor: soft }]}
    >
      <Ionicons name={selected ? icon : `${icon}-outline`} size={36} color={selected ? color : colors.textMuted} />
      <Text style={[styles.opcionTexto, selected && { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  fondo: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.sm,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  encabezado: {
    gap: spacing.xs,
  },
  titulo: {
    ...typography.title,
  },
  subtitulo: {
    ...typography.body,
    color: colors.textSecondary,
  },
  label: {
    ...typography.label,
    color: colors.text,
  },
  opciones: {
    flexDirection: 'row',
    gap: spacing.md - 4,
  },
  opcion: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 104,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  opcionTexto: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMuted,
  },
  campo: {
    gap: spacing.xs,
  },
  input: {
    ...typography.body,
    minHeight: 88,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md - 4,
    textAlignVertical: 'top',
  },
  contador: {
    ...typography.caption,
    alignSelf: 'flex-end',
  },
  contadorLimite: {
    color: colors.warning,
    fontWeight: '700',
  },
  agradecimientoBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md - 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    ...typography.bodyStrong,
    color: colors.primaryDark,
  },
  ayuda: {
    ...typography.caption,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: {
    flex: 1,
  },
});
