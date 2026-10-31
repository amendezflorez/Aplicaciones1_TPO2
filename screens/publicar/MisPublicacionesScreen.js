import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import PublicationCard from '../../components/PublicationCard';
import { colors, spacing } from '../../config/theme';
import { getErrorMessage } from '../../services/errors';
import { getMisPublicaciones, renovarPublicacion } from '../../services/publicacionesService';

// "Mis publicaciones" (sección 4.5 del plan): es la pantalla inicial de la tab Publicar —
// mismo criterio que ReclamosNavigator, donde la bandeja es la puerta de entrada y no el
// formulario. MiPublicacionResponse ya trae los mismos campos que PublicationCard espera
// (fotoPrincipalUrl, categoria, barrio, fechaSuceso, estado), así que se reusa tal cual en
// vez de armar una card nueva.
export default function MisPublicacionesScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renovandoId, setRenovandoId] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getMisPublicaciones());
      setError('');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const renovar = async (id) => {
    setRenovandoId(id);
    try {
      const actualizada = await renovarPublicacion(id);
      setItems((actuales) => actuales.map((item) => (item.id === id ? actualizada : item)));
    } catch (e) {
      Alert.alert('No se pudo renovar', getErrorMessage(e));
    } finally {
      setRenovandoId(null);
    }
  };

  const irAPublicar = () => navigation.navigate('PublicarWizard');
  const irAlDetalle = (id) => navigation.navigate('Buscar', { screen: 'DetallePublicacion', params: { id } });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button title="+ Nueva publicación" onPress={irAPublicar} />
      </View>
      <ErrorText message={error} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.lista, !items.length && styles.listaVacia]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargar} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <PublicationCard publicacion={item} onPress={() => irAlDetalle(item.id)} />
            {item.puedeRenovar ? (
              <Button
                title="Renovar"
                variant="secondary"
                onPress={() => renovar(item.id)}
                loading={renovandoId === item.id}
              />
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>Todavía no publicaste nada</Text>
            <Text style={styles.vacioTexto}>Publicá lo que perdiste o encontraste para que otros lo vean.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, paddingBottom: 0 },
  lista: { padding: spacing.md, gap: spacing.sm },
  listaVacia: { flexGrow: 1, justifyContent: 'center' },
  item: { gap: spacing.xs },
  vacio: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  vacioTitulo: { color: colors.text, fontWeight: '700', fontSize: 17, textAlign: 'center' },
  vacioTexto: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
