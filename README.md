# Wordlish Tutoring

Plataforma SaaS de operación tutorial construida con **React Native + Expo Router + TypeScript**, ejecutable desde el mismo código fuente en **iOS, Android y Web**.

Wordlish automatiza el ciclo completo de una clase (reserva → pago → dictado → screenshot → asistencia → reporte → material → nómina) y expone cinco roles con experiencias diferenciadas: **estudiante, acudiente, profesor, administrador, supervisor**.

---

## Tabla de contenidos

1. [Estado del proyecto](#estado-del-proyecto)
2. [Stack técnico](#stack-técnico)
3. [Requisitos](#requisitos)
4. [Instalación](#instalación)
5. [Ejecución en Web, iOS y Android](#ejecución-en-web-ios-y-android)
6. [Variables de entorno](#variables-de-entorno)
7. [Arquitectura](#arquitectura)
8. [Estructura de carpetas](#estructura-de-carpetas)
9. [Roles y flujos](#roles-y-flujos)
10. [Filosofía de diseño](#filosofía-de-diseño)
11. [Estrategia responsive](#estrategia-responsive)
12. [Datos y backend](#datos-y-backend)
13. [Servicios mock y stubs](#servicios-mock-y-stubs)
14. [Archivos a migrar al backend real](#archivos-a-migrar-al-backend-real)
15. [Parches técnicos actuales](#parches-técnicos-actuales)
16. [Integraciones pendientes](#integraciones-pendientes)
17. [Convención de commits](#convención-de-commits)
18. [Versionado](#versionado)
19. [Seguridad y buenas prácticas](#seguridad-y-buenas-prácticas)

---

## Estado del proyecto

**Versión estable actual:** `v1.0 Foundation`

Incluye:

- Autenticación mock por rol (contraseña maestra documentada).
- Reservas individuales y grupales con políticas centralizadas.
- Ciclo de clase completo (screenshot, tolerancia, incidentes, reporte, material).
- Dashboards por rol.
- **Fase 1** · contenedores responsive (`PageContainer`).
- **Fase 2** · sidebar web fijo desde 1024 px (`WebSidebar`).
- **Fase 3** · pantallas en dos columnas y master-detail en desktop.
- **Fase 4** · Dashboard administrativo SaaS (topbar, KPIs, tablas ordenables/buscables/filtrables).
- **Cultura Wordlish para profesores** (recordatorios contextuales y felicitaciones breves, sin lenguaje motivacional ni sancionatorio).
- iOS, Android y Web comparten el **mismo código fuente**, la **misma base de datos mock** y la **misma lógica de negocio**.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Runtime | React Native + Expo SDK |
| Routing | Expo Router (rutas basadas en archivos, layouts por rol) |
| Lenguaje | TypeScript |
| Estado global | React Context API |
| Estado local | `useState` / `useReducer` |
| Diseño | Sistema de tokens propio (`constants/theme.ts`) |
| Iconografía | Componente `Ionicons` propio basado en Unicode (compat OnSpace) |
| Safe area | `react-native-safe-area-context` |
| Web | Expo Web (mismo bundle RN) |
| Backend | Mock in-memory (`services/mockDb.ts`) — preparado para OnSpace Cloud / Supabase |

---

## Requisitos

- Node.js ≥ 18
- npm ≥ 9 (o pnpm/yarn equivalente)
- Expo CLI (`npx expo`) — no requiere instalación global
- Para iOS: macOS + Xcode + iOS Simulator
- Para Android: Android Studio + emulador o dispositivo con USB debugging
- Para Web: cualquier navegador moderno

---

## Instalación

```bash
git clone <URL_DEL_REPOSITORIO>
cd wordlish-tutoring
npm install
cp .env.example .env
```

Edita `.env` según necesites (ver [Variables de entorno](#variables-de-entorno)). Mientras se use el backend mock, todas las variables pueden quedar vacías.

---

## Ejecución en Web, iOS y Android

```bash
npx expo start          # menú interactivo (recomendado)
npx expo start --web    # solo Web
npx expo start --ios    # solo iOS (macOS)
npx expo start --android
```

Atajos npm:

```bash
npm start            # expo start
npm run web          # expo start --web
npm run ios          # expo start --ios
npm run android      # expo start --android
```

**Cuentas de prueba (auth mock).** Contraseña única: `123456`.

| Rol | Email |
|---|---|
| Admin | admin@wordlish.com |
| Supervisor | supervisor@wordlish.com |
| Profesor | profesor@wordlish.com |
| Estudiante | estudiante@wordlish.com |
| Acudiente | acudiente@wordlish.com |

Esta contraseña maestra vive únicamente en `services/authService.ts` como constante mock (`MASTER_PASSWORD = '123456'`). Al migrar a autenticación real, debe eliminarse.

---

## Variables de entorno

El proyecto lee variables desde `.env` en la raíz. Solo las que comienzan con `EXPO_PUBLIC_` llegan al bundle cliente.

Variables definidas en `.env.example`:

| Variable | Uso | Estado |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase / OnSpace Cloud | Requerido al activar backend real |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima para llamadas cliente | Requerido al activar backend real |
| `EXPO_PUBLIC_SUPPORT_WHATSAPP` | Teléfono de soporte para `wa.me` | Opcional |
| `EXPO_PUBLIC_ZOOM_CLIENT_ID` | OAuth Zoom (creación de salas) | Pendiente |
| `EXPO_PUBLIC_ZOOM_REDIRECT_URI` | OAuth Zoom callback | Pendiente |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Cobros con Stripe | Pendiente |
| `EXPO_PUBLIC_SENTRY_DSN` | Monitoreo de errores | Opcional |
| `EXPO_PUBLIC_ANALYTICS_KEY` | Analítica de producto | Opcional |

**Ninguna de estas variables tiene valor por defecto en el código.** El archivo `.env` está excluido del repositorio.

---

## Arquitectura

Arquitectura estricta en 4 capas. **La capa superior nunca puede saltarse capas inferiores.**

```
UI (app/, components/)
        ↓ consume
Hooks (hooks/)
        ↓ consume
Contexts (contexts/) ── Repositories (repositories/)
                              ↓ consume
                        Services (services/)
                              ↓ consume
                        Mock DB (services/mockDb.ts)
```

### Reglas

- **Services** — funciones puras, sin React, sin JSX. Operan sobre `mockDb`.
- **Repositories** — aplican filtrado por rol y validaciones de negocio. Sin React.
- **Contexts** — estado global reactivo (`AuthContext`, `BookingsContext`, `NotificationsContext`, `DraftBookingContext`, `TeacherNotificationsContext`).
- **Hooks** — consumen contextos y encapsulan lógica de UI. Sin JSX.
- **Components / app/** — renderizado puro. Nunca invocan `services/` directamente.

### Constantes de negocio

Toda regla vive centralizada en `constants/`:

- `policies.ts` — tolerancias, screenshots, gracia, tarifas, tiers, cursos grupales.
- `contextualPolicies.ts` — qué política se muestra en cada pantalla y momento.
- `designPhilosophy.ts` — 14 principios inmutables de diseño.
- `teacherCulture.ts` — indicadores positivos, tiers Essential/Special, `coachMessage()`, recordatorios contextuales.
- `theme.ts` — tokens de color, espaciado, radios, sombras y tipografía.
- `breakpoints.ts` — puntos de corte responsive.
- `roles.ts` / `tabs.ts` — configuración de navegación por rol.

---

## Estructura de carpetas

```
app/                       # Rutas Expo Router
├── _layout.tsx            # Providers globales + ErrorBoundary
├── login.tsx              # Acceso multi-rol
├── (student)/             # Home, reservas, Mi plan, reportes, perfil
├── (guardian)/            # Home, reservas, pagos, reportes, perfil
├── (teacher)/             # Home, agenda, pendientes, perfil
├── (admin)/               # Dashboard SaaS, usuarios, paquetes, ajustes
├── (supervisor)/          # Live, alertas, histórico
├── booking/               # Wizard de reserva (tipo, fecha, profesor, resumen)
├── class/[id].tsx         # Detalle de clase + reporte
├── payments/[id].tsx      # Detalle de pago
├── reports/[id].tsx       # Detalle de reporte
└── teacher/standards.tsx  # Guía del profesor

components/
├── ui/                    # Card, Header, Avatar, Screen, Icon,
│                          # PageContainer, WebSidebar, WebTwoColumn, ...
├── booking/               # BookingCard, BookingWizard
├── class/                 # ClassTimeline
├── teacher/               # CoachBanner, GrowthCard, TeacherHint
└── admin/                 # DashboardTopBar, DashboardPanel, DashboardTable

hooks/                     # useAuth, useBookings, useNotifications,
                           # useResponsive, useTeacherNotifications, ...

contexts/                  # Auth, Bookings, DraftBooking,
                           # Notifications, TeacherNotifications

repositories/              # bookings, classes, materials, payments,
                           # payrolls, reports, screenshots, users, ...

services/                  # mockDb, mockData, authService, bookingService,
                           # classService, notificationService,
                           # payrollService, dashboardMockData, ...

constants/                 # theme, policies, contextualPolicies,
                           # designPhilosophy, teacherCulture, breakpoints,
                           # roles, tabs

types/                     # enums, models
template/                  # AlertProvider (utilidad UI transversal) +
                           # esqueleto de auth mock/supabase (no activado)
stubs/                     # Parches runtime OnSpace
```

---

## Roles y flujos

| Rol | Home | Acciones clave |
|---|---|---|
| **Estudiante** | Próxima clase + Mi plan + Último reporte | Reservar, pagar, ver reporte |
| **Acudiente** | Estudiantes vinculados + próximas clases | Reservar por estudiante, pagos, reportes |
| **Profesor** | Clase en curso + Growth + Próximas | Screenshot, incidentes, reporte, material |
| **Administrador** | Dashboard SaaS en 3 columnas | Operativa, pendientes, negocio, alertas |
| **Supervisor** | Live monitoring | Screenshots pendientes, incidentes activos |

Flujo típico de una clase:

1. Estudiante o acudiente reserva → **pending_payment**.
2. Pago aprobado → **confirmed** + hora consumida.
3. Profesor abre Zoom y sube **screenshot** (gracia 10 min).
4. Sistema confirma asistencia y notifica.
5. A los 15 min sin estudiante → alerta con `Esperar 5` / `WhatsApp` / `No asistió`.
6. Profesor cierra clase → **completed** → reporte + material opcional.
7. Reporte queda visible para estudiante y acudiente.

---

## Filosofía de diseño

14 principios inmutables definidos en `constants/designPhilosophy.ts`. Núcleo:

- **Extrema simplicidad.** Cada pantalla responde a **una** pregunta.
- **Mostrar resultados, no procesos.** El usuario ve "clase en curso", nunca "screenshot pendiente".
- **Divulgación contextual de políticas.** Cada regla aparece solo cuando el usuario ejecuta la acción correspondiente.
- **Comprensión en 3 segundos.**
- **Cultura sobre reglas** en el módulo profesor: recordatorios cortos, útiles y amables. Nunca lenguaje motivacional ni sancionatorio.
- **Morado solo para acciones importantes.** Blanco como color principal.

Estética referente: Notion, Stripe Dashboard, Linear, ClickUp.

---

## Estrategia responsive

Un único código fuente, tres experiencias:

| Viewport | Ancho | Navegación | Layout |
|---|---|---|---|
| Phone | < 600 px | Tabs inferiores | 1 columna |
| Tablet | 600 – 1023 px | Tabs inferiores | 1 columna centrada |
| Desktop | ≥ 1024 px | `WebSidebar` fijo 240 px | 2 columnas / master-detail |

Piezas responsables:

- `hooks/useResponsive.tsx` — detección SSR-safe (`Dimensions` + listener).
- `components/ui/PageContainer.tsx` — max-width por tipo de pantalla (Home limitado a 960 px).
- `components/ui/WebSidebar.tsx` — navegación lateral en desktop.
- `components/ui/WebTwoColumn.tsx` — dos columnas en desktop, stack vertical en móvil.

**iOS y Android nunca son afectados** porque todos los cambios web quedan detrás de `isDesktop` (colapso automático).

---

## Datos y backend

Actualmente **mock in-memory**. No hay persistencia real ni sincronización entre dispositivos: cada recarga reinicia el estado.

### Datos simulados (`services/mockData.ts` y `services/mockDb.ts`)

- Usuarios de las cinco cuentas de prueba.
- Reservas de ejemplo por rol (individuales y grupales).
- Clase activa del profesor (`teacherActiveClass`).
- Clases del día del profesor (`teacherTodayClasses`).
- Reportes pendientes (`teacherPendingReports`).
- Materias, grados, niveles, paquetes, promociones.
- Historial de pagos y liquidaciones.
- Indicadores de crecimiento para el nivel Special.

### Datos del dashboard admin (`services/dashboardMockData.ts`)

- Clases en curso y próximas.
- Screenshots, reportes y materiales pendientes.
- Alumnos esperando profesor.
- Pagos pendientes y nuevas reservas.
- Mensajes importantes y alertas del sistema.

### Repositorios (`repositories/*.ts`)

API estable orientada a Supabase / OnSpace Cloud. Reemplazar el cuerpo de cada repositorio por llamadas al backend real **sin tocar hooks ni UI**.

---

## Servicios mock y stubs

Los siguientes archivos contienen lógica simulada que deberá activarse contra un backend real:

| Archivo | Estado | Acción al migrar |
|---|---|---|
| `services/authService.ts` | Auth mock (contraseña maestra `123456`) | Reemplazar por Supabase Auth / OnSpace Cloud Auth. |
| `services/mockDb.ts` | Colecciones en memoria | Reemplazar por tablas Postgres. |
| `services/mockData.ts` | Datos semilla iniciales | Migrar a seeders del backend. |
| `services/dashboardMockData.ts` | Datos operativos del panel admin | Reemplazar por vistas/consultas reales. |
| `services/pushService.ts` | Registro de tokens en memoria | Persistir en tabla `push_tokens` y despachar vía FCM/APNS/Web Push. |
| `services/notificationService.ts` | Notificaciones internas simuladas | Conectar a canal real y push. |
| `services/payrollService.ts` | Cálculo de nómina sobre mock | Ejecutar como función serverless con datos reales. |
| `services/exportService.ts` | Export CSV en cliente | Delegar a job del backend cuando el volumen crezca. |
| `services/policiesAck.ts` | Acknowledgements en memoria | Persistir por usuario. |
| `services/securityService.ts` | Reglas de seguridad simuladas | Portar a RLS de Postgres. |
| `services/supportService.ts` | Enlaces WhatsApp | Reemplazar teléfono hardcoded por env var. |
| `services/classService.ts` | Máquina de estados sobre mock | Delegar transiciones a triggers/edge functions. |
| `services/bookingService.ts` | Validaciones + escritura mock | Ejecutar sobre tablas reales con RLS. |
| `template/auth/mock/*` | Esqueleto de auth mock del template | Reemplazar por `template/auth/supabase/*` cuando se active. |
| `template/auth/supabase/*` | Cliente listo, sin credenciales | Activar tras completar `.env`. |
| `template/core/client.ts` | Devuelve `null` si no hay env vars | Se activa automáticamente al configurar `.env`. |

### Stubs y parches runtime (`stubs/`)

- `stubs/NativeSafeAreaContext.js`, `NativeSafeAreaProvider.js`, `NativeSafeAreaView.js` — stubs neutros para runtime OnSpace donde el módulo nativo no está disponible.
- `stubs/hermes-parser-plugin.js` — plugin Babel neutro para satisfacer un `require` con ruta absoluta que quedó embebido en `babel-plugin-syntax-hermes-parser`. Devuelve un visitor vacío para no alterar el AST.
- `node_modules/@react-native/babel-preset/node_modules/babel-plugin-syntax-hermes-parser/*` — carpeta parcheada dentro de `node_modules` para desbloquear el bundle. Este stub es indispensable en el runtime OnSpace y no debe removerse manualmente.

---

## Archivos a migrar al backend real

Al conectar el backend, priorizar en este orden:

1. **Autenticación.** Reemplazar `services/authService.ts` por `template/auth/supabase/*` y configurar `.env`.
2. **Usuarios y roles.** `repositories/users.ts` → tabla `users` con columna `role`.
3. **Reservas y clases.** `repositories/bookings.ts`, `classes.ts`, `classEvents.ts`, `availability.ts`.
4. **Screenshots, materiales, reportes.** `repositories/screenshots.ts`, `materials.ts`, `reports.ts` + Storage bucket.
5. **Pagos.** `repositories/payments.ts`, `packages.ts` + integración Stripe/Yappy.
6. **Nómina.** `repositories/payrolls.ts` + edge function mensual.
7. **Notificaciones.** `repositories/notifications.ts` + `services/pushService.ts` + FCM/APNS.

Ninguna capa superior (`hooks/`, `contexts/`, `components/`, `app/`) debería requerir cambios si se respeta la API existente de cada repositorio.

---

## Parches técnicos actuales

Estos son ajustes conocidos, documentados para no borrarse por error:

- **Icon system.** `components/ui/Icon.tsx` es una implementación propia basada en Unicode. Sustituye `@expo/vector-icons` porque `ExpoFontLoader.isLoadedNative` no está expuesto por el runtime OnSpace y provocaba crash. Todo import `Ionicons` viene de este archivo, no del paquete original.
- **`babel.config.js`.** Reducido a `babel-preset-expo` con `jsxRuntime: 'automatic'`. No añadir plugins adicionales sin revisar interacción con Hermes.
- **`metro.config.js`.** Configuración congelada por instrucción del propietario. No modificar.
- **`stubs/hermes-parser-plugin.js`.** Ver sección [Servicios mock y stubs](#servicios-mock-y-stubs).
- **`ProgressBarAndroid`.** No usar. Se reemplazó por un Spinner cross-plataforma propio dentro de `components/ui`.
- **Alertas.** Se usa `useAlert()` de `@/template/ui` (envuelto por `AlertProvider` en `app/_layout.tsx`). No usar `Alert.alert` importado desde `react-native` para diálogos con múltiples botones en web.

---

## Integraciones pendientes

| Integración | Estado | Nota |
|---|---|---|
| Autenticación real | Pendiente | Migrar `authService` + activar `template/auth/supabase`. |
| Base de datos real | Pendiente | Sustituir `mockDb` por Postgres (Supabase/OnSpace Cloud). |
| Pagos | Pendiente | Stripe + Yappy. Webhooks para actualizar `pending_payment → confirmed`. |
| Zoom | Enlace estático | Integrar OAuth para crear sala por clase y capturar asistencia. |
| Notificaciones push | Stub | FCM (Android), APNS (iOS), Web Push. |
| Email transaccional | Sin implementar | Templates de bienvenida, recordatorios, reportes. |
| WhatsApp Business API | Solo `wa.me` | Migrar a API oficial para notificaciones salientes. |
| Almacenamiento de archivos | Pendiente | Bucket para materiales y screenshots. |
| Analítica | Sin integrar | PostHog / Amplitude. |
| Monitoreo | Sin integrar | Sentry. |
| Tests | Sin integrar | Jest + React Native Testing Library. |
| Legal | Pendiente | Términos, privacidad, consentimiento de grabación (obligatorio en Panamá). |

---

## Convención de commits

**Conventional Commits.** Ejemplos aplicados al proyecto:

```
feat(admin): tabla compacta de pagos pendientes con orden y filtros
feat(student): "Adquirir nuevo plan" colapsable en Mi plan
fix(teacher): screenshot vencido no desaparecía tras enviarlo
refactor(bookings): mover cálculo de tolerancia a constants/policies
style(theme): reducir uso de morado en tarjetas secundarias
docs(readme): agregar guía de instalación web
chore(deps): actualizar expo-router
```

Reglas obligatorias:

- **Antes de cualquier cambio importante** → commit de respaldo (`chore: backup before <feature>`).
- **Nunca sobrescribir una versión estable sin dejar historial.** Trabajar en rama, mergear con merge commit descriptivo.
- Cada tag `vX.Y Nombre` corresponde a una versión estable verificada en iOS, Android y Web.

---

## Versionado

- **`main`** — rama principal, siempre estable.
- **Tags** — `vMAJOR.MINOR <Nombre>` (ej. `v1.0 Foundation`, `v1.1 Dashboard Payments`).
- **Ramas de feature** — `feature/<slug>`, `fix/<slug>`, `refactor/<slug>`.

---

## Seguridad y buenas prácticas

- **No hay secretos reales en el código.** Todas las credenciales viven en `.env`, excluido por `.gitignore`.
- **La contraseña `123456`** es exclusivamente para las cuentas mock. Debe eliminarse al activar auth real (`services/authService.ts`).
- **El teléfono de WhatsApp** (`+50765551234`) en `app/(teacher)/index.tsx` es un placeholder de demo. Reemplazar por `EXPO_PUBLIC_SUPPORT_WHATSAPP` al integrar.
- **Los avatares** usan `pravatar.cc`, un servicio público de imágenes de prueba. No hay PII real.
- **Nunca comitear** `.env`, `.expo/`, `node_modules/`, `.DS_Store`, `*.p12`, `*.keystore`, `google-services.json` ni `GoogleService-Info.plist`.
- **Antes de conectar el repo remoto**, ejecutar `git status` para confirmar que ningún archivo sensible quede fuera de `.gitignore`.

---

**Wordlish Tutoring** © — plataforma privada de operación tutorial.
