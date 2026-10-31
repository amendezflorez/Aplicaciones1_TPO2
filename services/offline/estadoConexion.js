// Último estado de conexión conocido, legible desde fuera de React (servicios). Lo escribe
// ConnectivityProvider cada vez que cambia; los servicios lo usan para no esperar un
// timeout de red que ya se sabe que va a fallar (p. ej. getBarrios cae directo al caché).
let sinConexion = false;

export const setSinConexion = (valor) => {
  sinConexion = valor;
};

export const estaSinConexion = () => sinConexion;
