# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Hallado" — university project (Aplicaciones 1, TPO2): mobile app for lost/found objects and pets. Expo SDK 57, React Native 0.86, React 19, **JavaScript** (no TypeScript). The source of truth for scope is the course material and the assignment in `.docs/` (`TPO_Hallado.pdf` and the two class PDFs): only use what the classes cover (React Navigation, Axios + interceptors, useContext, SecureStore/AsyncStorage, expo-local-authentication). Don't introduce Redux/Zustand, TypeScript, Expo Router or UI/form libraries.

Plan and progress for points 1 (auth) and 2 (profile/reputation) live in `.docs/PLAN_puntos_1_y_2.md` and `.docs/TODO_puntos_1_y_2.md`; the integration guide for other team members is `.docs/INTEGRACION.md`. The REST API contract the app consumes is in section 4 of the plan; the backend is a separate responsibility and is not in this repo.

`AGENTS.md` rules still apply: verify Expo APIs against `https://docs.expo.dev/versions/v57.0.0/` before use, install packages with `npx expo install`, and never hand-edit `ios/`/`android/` (not committed; configure via `app.json` plugins). Its Expo Router guidance is **overridden** by the course: this app uses React Navigation with the class scaffold.

## Commands

```bash
npm start                # expo start; also: npm run android | ios | web
npx expo lint            # lint (eslint-config-expo)
npx expo-doctor          # dependency/config diagnostics
npx expo install <pkg>   # add packages
```

No test runner is configured. There is no `tsc` step. On this Windows machine `node`/`npx` may be missing from the shell PATH; they live in `C:\Program Files\nodejs` (prepend it to `$env:Path`). Android is the target platform; biometrics must be tested on a physical device with an enrolled fingerprint/face.

## Architecture

Entry: `index.js` → `App.js` = `SafeAreaProvider > AuthProvider > NavigationContainer > RootNavigator`. Folders at the repo root (class scaffold): `components/ screens/ navigation/ services/ hooks/ context/ utils/ config/`.

- **Session state** (`context/AuthContext.js`, consumed via `hooks/useAuth.js`): `status` is `loading | unauthenticated | locked | authenticated`. `RootNavigator` switches the whole app on it. On launch it reads the JWT from SecureStore, drops it if `exp` passed (`utils/jwt.js`), goes to `locked` if biometrics are enabled (`BiometricLockScreen` → `completeUnlock()`), else loads `GET /users/me`. `logout()` deletes the token **and** the biometric preference.
- **HTTP** (`services/api.js`): single Axios instance. Request interceptor attaches `Bearer` from SecureStore. The 401 response interceptor lives outside React, so `AuthProvider` injects `logout` via `setupInterceptors(logout)`; 401s from `/auth/*` are deliberately ignored (screens handle them). Services (`authService`, `userService`) wrap endpoints; `services/errors.js` `getErrorMessage(error, overrides)` maps errors/HTTP codes to Spanish messages.
- **Storage split**: token → SecureStore; non-sensitive prefs (biometric flag) → AsyncStorage (`services/storage.js`). Never store the token in AsyncStorage.
- **Navigation**: `AuthNavigator` (Stack: Login, RegisterEmail, VerifyOtp, SetPassword, ForgotPassword, ResetPassword) vs `AppNavigator` (bottom Tabs, where other points add their tabs). The "Perfil" tab hosts `ProfileNavigator` (Stack: Profile, EditProfile, Settings, PublicProfile). Other tabs open a public profile with `navigation.navigate('Perfil', { screen: 'PublicProfile', params: { userId } })`.
- **Reputation and badges are computed by the backend**; the app only renders `user.reputation` / `user.badges`. The public profile must never show phone or publication history.
- **Config**: `config/env.js` holds `API_BASE_URL` (currently `http://10.0.2.2:3000/api`, the Android-emulator alias for host localhost — change for a device/real backend).
- **Mock backend**: `USE_MOCK` in `config/env.js` (default `true`) swaps the Axios adapter for `services/mock/mockAdapter.js`, an in-memory (AsyncStorage-persisted) implementation of the plan's API contract (OTP `123456`, expired `000000`, demo user `demo@hallado.com` / `Demo1234`). Keep it in sync with the contract when endpoints change; set `USE_MOCK = false` for the real backend.
