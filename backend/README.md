# Backend — Hallado (puntos 1 y 2)

API REST en **Java 25 + Spring Boot 4.1 (Maven)** que implementa el contrato de la
sección 4 de [`../.docs/PLAN_puntos_1_y_2.md`](../.docs/PLAN_puntos_1_y_2.md):
autenticación (registro con OTP, login, recupero de contraseña) y perfil/reputación.

## Correr el servidor

Requiere JDK 21+ (se usó JDK 25; el wrapper de Maven descarga Maven solo, no hace
falta tenerlo instalado).

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
entity/     User, Barrio, OtpCode, RegistrationToken (JPA)
repository/ Spring Data JPA
dto/        request/ y response/ (records) — el shape exacto que espera la app
service/    AuthService, UserService, OtpService, PhotoStorageService, UserMapper
controller/ AuthController, UserController, BarrioController
exception/  Jerarquía de ApiException + @RestControllerAdvice
seed/       DataSeeder (barrios + usuarios demo)
```

No se usa Spring Security (no se vio en la cátedra): la autenticación es manual con
JWT propio (`io.jsonwebtoken:jjwt`) + `spring-security-crypto` solo para BCrypt.
