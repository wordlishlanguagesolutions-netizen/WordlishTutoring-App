# Wordlish Tutoring

Plataforma SaaS de operación tutorial construida con **React Native + Expo Router + TypeScript**, ejecutable desde el mismo código fuente en **iOS, Android y Web**.

Wordlish automatiza el ciclo completo de una clase (reserva → pago → dictado → screenshot → asistencia → reporte → material → nómina) y expone cinco roles con experiencias diferenciadas: **estudiante, acudiente, profesor, administrador, supervisor**.

---

## Tabla de contenidos

1. [Estado del proyecto](#estado-del-proyecto)
2. [Stack técnico](#stack-técnico)
3. [Requisitos](#requisitos)
4. [Instalación](#instalación)
5. [Scripts](#scripts)
6. [Arquitectura](#arquitectura)
7. [Estructura de carpetas](#estructura-de-carpetas)
8. [Roles y flujos](#roles-y-flujos)
9. [Filosofía de diseño](#filosofía-de-diseño)
10. [Estrategia responsive](#estrategia-responsive)
11. [Datos y backend](#datos-y-backend)
12. [Convención de commits](#convención-de-commits)
13. [Versionado](#versionado)

---

## Estado del proyecto

**Versión estable actual:** `v1.0 Foundation`

Incluye:

- Autenticación mock por rol.
- Reservas individuales y grupales con políticas centralizadas.
- Ciclo de clase completo (screenshot, tolerancia, incidentes, reporte, material).
- Dashboards por rol.
- **Fase 1** · contenedores responsive (`PageContainer`).
- **Fase 2** · sidebar web fijo desde 1024 px (`WebSidebar`).
- **Fase 3** · pantallas en dos columnas y master-detail en desktop.
- **Fase 4** · Dashboard administrativo SaaS (topbar, KPIs, 12 tablas ordenables/buscables/filtrables).
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
- Para iOS: macOS + Xcode
- Para Android: Android Studio + emulador o dispositivo con USB debugging
- Para Web: cualquier navegador moderno

---

## Instalación

```bash
git clone <URL_DEL_REPOSITORIO>
cd wordlish-tutoring
npm install
```

Ejecutar en desarrollo:

```bash
npx expo start          # menú interactivo
npx expo start --web    # solo web
npx expo start --ios    # solo iOS
npx expo start --android
```

---

## Scripts

```bash
npm start            # expo start
npm run web          # expo start --web
npm run ios          # expo start --ios
npm run android      # expo start --android
```

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
- `teacherCulture.ts` — indicadores positivos, tiers Essential/Special, `coachMessage()`.
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
└── teacher/standards.tsx  # Programa de crecimiento

components/
├── ui/                    # Card, Header, Avatar, Screen, Icon,
│                          # PageContainer, WebSidebar, WebTwoColumn, ...
├── booking/               # BookingCard, BookingWizard
├── class/                 # ClassTimeline
├── teacher/               # CoachBanner, GrowthCard
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
template/                  # AlertProvider (utilidad UI transversal)
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
- **Cultura sobre reglas** en el módulo profesor (tono Bilbao, mensajes de coach).
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
- `components/ui/PageContainer.tsx` — max-width por tipo de pantalla.
- `components/ui/WebSidebar.tsx` — navegación lateral en desktop.
- `components/ui/WebTwoColumn.tsx` — dos columnas en desktop, stack vertical en móvil.

**iOS y Android nunca son afectados** porque todos los cambios web quedan detrás de `isDesktop` (colapso automático).

---

## Datos y backend

Actualmente **mock in-memory**:

- `services/mockDb.ts` — colecciones (users, bookings, classes, reports, materials, payments, payrolls, ...).
- `services/mockData.ts` — datos iniciales por rol.
- `repositories/*.ts` — API estable orientada a Supabase / OnSpace Cloud.

Migración futura: reemplazar el cuerpo de cada repositorio por llamadas al backend real **sin tocar hooks ni UI**.

Integraciones actuales: WhatsApp y Zoom como enlaces (`Linking.openURL`). Pagos (Yappy, Cuanto, tarjeta) son mock.

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

**Wordlish Tutoring** © — plataforma privada de operación tutorial.
