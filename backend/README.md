# Backend — Hallado (puntos 1-4)

API REST en **Java 21 + Spring Boot 4.1 (Maven)** que implementa:

- El contrato de la sección 4 de [`../.docs/PLAN_puntos_1_y_2.md`](../.docs/PLAN_puntos_1_y_2.md):
  autenticación (registro con OTP, login, recupero de contraseña) y perfil/reputación.
- El contrato de la sección 3 de [`../.docs/PLAN_puntos_3_y_4.md`](../.docs/PLAN_puntos_3_y_4.md):
  buscador/resultados y detalle de publicación, incluyendo alta de alertas, seguir
  publicaciones e iniciar un reclamo ("Es mío" / "Lo encontré"). También implementa
  la bandeja y resolución de reclamos, el límite de tres intentos y el vencimiento a 48 h.
  Puntos 5/8/9/10 siguen siendo responsabilidad de quien los construya.

## Reclamos

- `GET /reclamos` devuelve en una sola lista los reclamos enviados y recibidos por el usuario autenticado.
- `PATCH /reclamos/{id}/decision` acepta `{ "decision": "aceptar" | "rechazar" }`; solo puede responder el publicador y únicamente mientras esté pendiente.
- Los pendientes vencen automáticamente al cumplirse 48 horas (tarea programada) y al consultar la bandeja o el reclamo propio.
- `POST /publicaciones/{id}/reclamos` limita a tres intentos por autor y publicación; el alta serializa el conteo por publicación.

## Correr el servidor

Requiere JDK 21+ (el proyecto apunta a `--release 21`; un JDK más nuevo, como 23 o 25,
también compila — javac siempre puede apuntar hacia abajo). El wrapper de Maven descarga
Maven solo, no hace falta tenerlo instalado.

```bash
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
```

Queda escuchando en `http://localhost:3000/api` (o `http://10.0.2.2:3000/api` desde
el emulador Android), que es exactamente `API_BASE_URL` en `config/env.js` del
frontend. Con `USE_MOCK = false` (valor actual) la app ya le pega a este servidor.

## Base de datos

H2 persistido en archivo (`backend/data/`, ignorado por git) vía JPA/Hibernate
(`ddl-auto=update`, crea/actualiza las tablas solo). Al arrancar por primera vez,
`DataSeeder` siembra los mismos barrios y usuarios demo que el mock
(`services/mock/mockAdapter.js`), para no romper flujos de prueba del equipo:

- `demo@hallado.com` / `Demo1234` (5 devoluciones → insignia "Vecino solidario")
- `ana@hallado.com` / `Ana12345`

También siembra 12 publicaciones de prueba (mitad perdido/mitad encontrado, repartidas
entre `demo`/`ana`, con foto y variedad de categoría/barrio/fecha) para poder probar el
buscador y el detalle de los puntos 3 y 4 desde el primer día.

Consola web de H2 (opcional, para inspeccionar datos): `http://localhost:3000/api/h2-console`
— JDBC URL `jdbc:h2:file:./data/hallado`, usuario `sa`, contraseña vacía.

## OTP sin servidor de email

No hay proveedor de email configurado (fuera del alcance de la cátedra). Los
códigos de registro/recupero de contraseña se imprimen en la consola del backend:

```
INFO ... OtpService : Código OTP para alguien@mail.com (REGISTER): 483920
```

## Variables de entorno opcionales

| Variable | Default | Qué hace |
|---|---|---|
| `APP_JWT_SECRET` | secreto fijo en `application.properties` | Clave HMAC del JWT (Spring Boot mapea esta env var a `app.jwt.secret` automáticamente) |

## Estructura

```
config/     CORS, resource handler de /uploads/**, bean de PasswordEncoder
security/   JwtService (genera/valida el JWT), JwtAuthFilter (exige Bearer salvo en
            /auth/*, /barrios, /uploads/**)
entity/     User, Barrio, OtpCode, RegistrationToken,
            Publicacion, FotoPublicacion, Alerta, Seguimiento, Reclamo (JPA)
repository/ Spring Data JPA
dto/        request/ y response/ (records) — el shape exacto que espera la app
service/    AuthService, UserService, OtpService, PhotoStorageService, UserMapper,
            PublicacionService, PublicacionMapper, AlertaService, SeguimientoService,
            ReclamoService
controller/ AuthController, UserController, BarrioController,
            PublicacionController, AlertaController, SeguimientoController,
            ReclamoController
exception/  Jerarquía de ApiException + @RestControllerAdvice
seed/       DataSeeder (barrios + usuarios demo + publicaciones de prueba)
```

No se usa Spring Security (no se vio en la cátedra): la autenticación es manual con
JWT propio (`io.jsonwebtoken:jjwt`) + `spring-security-crypto` solo para BCrypt.
