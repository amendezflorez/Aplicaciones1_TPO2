// Roles dentro de un reclamo (Puntos 7, 8 y 11).
// - publicador: quien creó la publicación; autor: quien reclama.
// - "Es mío": el autor es el dueño y el publicador tiene el objeto.
// - "Lo encontré": el autor tiene el objeto y el publicador es el dueño.
// Quien TIENE el objeto (titular) propone el punto de encuentro y muestra el QR;
// quien lo RECUPERA (receptor) escanea el QR para confirmar la entrega.
export function rolesReclamo(reclamo, userId) {
  const soyPublicador = reclamo?.publicadorId === userId;
  const titularId = reclamo?.tipo === 'lo_encontre' ? reclamo?.autorId : reclamo?.publicadorId;
  const soyTitular = titularId === userId;
  const otro = soyPublicador
    ? { id: reclamo?.autorId, nombre: reclamo?.autorNombre, fotoUrl: reclamo?.autorFotoUrl }
    : { id: reclamo?.publicadorId, nombre: reclamo?.publicadorNombre, fotoUrl: reclamo?.publicadorFotoUrl };
  return {
    recibido: soyPublicador,
    soyTitular,
    soyReceptor: !soyTitular,
    otro,
  };
}

// Texto de vencimiento para reclamos pendientes: "Vence en 47 h", "Vence en 35 min".
// urgente = queda menos de 6 horas.
export function textoVencimiento(venceEn, ahora = Date.now()) {
  if (!venceEn) return null;
  const ms = new Date(venceEn).getTime() - ahora;
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return { texto: 'Venció', urgente: true };
  const min = Math.ceil(ms / 60000);
  if (min < 60) return { texto: `Vence en ${min} min`, urgente: true };
  const horas = Math.ceil(min / 60);
  return { texto: `Vence en ${horas} h`, urgente: horas <= 6 };
}
