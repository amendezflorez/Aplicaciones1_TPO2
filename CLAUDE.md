# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Hallado" — university project (Aplicaciones 1, TPO2): mobile app for lost/found objects and pets. Expo SDK 57, React Native 0.86, React 19, **JavaScript** (no TypeScript). The source of truth for scope is the course material and the assignment in `.docs/` (`TPO_Hallado.pdf` and the two class PDFs): only use what the classes cover (React Navigation, Axios + interceptors, useContext, SecureStore/AsyncStorage, expo-local-authentication). Don't introduce Redux/Zustand, TypeScript, Expo Router or UI/form libraries.

Plan and progress for points 1 (auth) and 2 (profile/reputation) live in `.docs/PLAN_puntos_1_y_2.md` and `.docs/TODO_puntos_1_y_2.md`; the integration guide for other team members is `.docs/INTEGRACION.md`. The REST API contract the app consumes is in section 4 of the plan. Points 3 (buscador/resultados) and 4 (detalle de publicación) are planned in `.docs/PLAN_puntos_3_y_4.md` (section 3 = REST contract, section 0 = explicit boundaries with points 5/7/8/9/10). A Java/Spring Boot implementation of both contracts (points 1-2 and 3-4) now lives in `backend/` in this same repo — see `backend/README.md`. Points 5, 7, 8, 9 and 10's backend functionality is still a separate responsibility, not in this repo (though points 3-4 already created the `Reclamo`/`Alerta`/`Seguimiento` entities those points should extend rather than duplicate — see section 0 of that plan).

`AGENTS.md` rules still apply: verify Expo APIs against `https://docs.expo.dev/versions/v57.0.0/` before use, install packages with `npx expo install`, and never hand-edit `ios/`/`android/` (not committed; configure via `app.json` plugins). Its Expo Router guidance is **overridden** by the course: this app uses React Navigation with the class scaffold.

## Commands

```bash
npm start                # expo start; also: npm run android | ios | web
npx expo lint            # lint (eslint-config-expo)
npx expo-doctor          # dependency/config diagnostics
npx expo install <pkg>   # add packages
```

No test runner is configured. There is no `tsc` step. On this Windows machine `node`/`npx` may be missing from the shell PATH; they live in `C:\Program Files\nodejs` (prepend it to `$env:Path`). Android is the target platform; biometrics must be tested on a physical device with an enrolled fingerprint/face.

For the Java backend (`backend/`), see `backend/README.md`; in short, `cd backend && ./mvnw spring-boot:run` (needs a JDK on PATH/JAVA_HOME — e.g. the one bundled with Android Studio at `Android Studio\jbr`, since `java`/`javac` may not otherwise be on PATH on this machine).

## Architecture

Entry: `index.js` → `App.js` = `SafeAreaProvider > AuthProvider > NavigationContainer > RootNavigator`. Folders at the repo root (class scaffold): `components/ screens/ navigation/ services/ hooks/ context/ utils/ config/`.

- **Session state** (`context/AuthContext.js`, consumed via `hooks/useAuth.js`): `status` is `loading | unauthenticated | locked | authenticated`. `RootNavigator` switches the whole app on it. On launch it reads the JWT from SecureStore, drops it if `exp` passed (`utils/jwt.js`), goes to `locked` if biometrics are enabled (`BiometricLockScreen` → `completeUnlock()`), else loads `GET /users/me`. `logout()` deletes the token **and** the biometric preference.
- **HTTP** (`services/api.js`): single Axios instance. Request interceptor attaches `Bearer` from SecureStore. The 401 response interceptor lives outside React, so `AuthProvider` injects `logout` via `setupInterceptors(logout)`; 401s from `/auth/*` are deliberately ignored (screens handle them). Services (`authService`, `userService`) wrap endpoints; `services/errors.js` `getErrorMessage(error, overrides)` maps errors/HTTP codes to Spanish messages.
- **Storage split**: token → SecureStore; non-sensitive prefs (biometric flag) → AsyncStorage (`services/storage.js`). Never store the token in AsyncStorage.
- **Navigation**: `AuthNavigator` (Stack: Login, RegisterEmail, VerifyOtp, SetPassword, ForgotPassword, ResetPassword) vs `AppNavigator` (bottom Tabs, where other points add their tabs). The "Perfil" tab hosts `ProfileNavigator` (Stack: Profile, EditProfile, Settings, PublicProfile). Other tabs open a public profile with `navigation.navigate('Perfil', { screen: 'PublicProfile', params: { userId } })`.
- **Reputation and badges are computed by the backend**; the app only renders `user.reputation` / `user.badges`. The public profile must never show phone or publication history.
- **Config**: `config/env.js` holds `API_BASE_URL` (currently `http://10.0.2.2:3000/api`, the Android-emulator alias for host localhost; matches the Java backend's default port 3000 + context-path `/api` — change for a physical device or a different backend).
- **Java backend** (`backend/`): Spring Boot 4.1 / Maven implementation of points 1 and 2 of the API contract (section 4 of the plan). H2 file-based DB via JPA, manual JWT (no Spring Security), seeded with the same demo users as the mock. Run with `cd backend && ./mvnw spring-boot:run`; see `backend/README.md`. This is the default backend (`USE_MOCK = false`).
- **Mock backend**: `USE_MOCK` in `config/env.js` (currently `false`) swaps the Axios adapter for `services/mock/mockAdapter.js`, an in-memory (AsyncStorage-persisted) implementation of the plan's API contract (OTP `123456`, expired `000000`, demo user `demo@hallado.com` / `Demo1234`). Kept as a fallback for working without the Java backend running; keep it in sync with the contract when endpoints change. Set `USE_MOCK = true` to use it instead.
