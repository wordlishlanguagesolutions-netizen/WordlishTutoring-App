# Wordlish Design System · v1.0

Documento canónico de la identidad visual de Wordlish. Toda pantalla, nueva o existente, debe respetar estas reglas. Se aplica desde el 18 de julio de 2026.

Objetivo: transmitir **Premium · Moderna · Tecnológica · Elegante · Minimalista · Muy limpia · Profesional · Cálida y cercana**. Referencias: Notion, Stripe, Linear, Calm — adaptado al sector educativo.

---

## 1 · Paleta oficial

| Token | Hex | Uso |
| --- | --- | --- |
| `colors.primary` | `#5B2C83` | CTAs y elementos destacados **únicamente** |
| `colors.primaryDark` | `#3F1D5C` | Hover / pressed del primario |
| `colors.primaryLight` | `#7C4EAF` | Acentos gráficos del primario |
| `colors.secondary` | `#A78BFA` | Acciones secundarias, gradientes suaves |
| `colors.accent` | `#E9D5FF` | Pills, tags, hovers muy suaves |
| `colors.surfaceTinted` | `#F5EBFF` | Superficies teñidas discretas |
| `colors.background` | `#F8FAFC` | Fondo de app · dominante |
| `colors.surface` | `#FFFFFF` | Tarjetas y superficies principales |
| `colors.text` | `#334155` | Texto principal · slate cálido |
| `colors.textStrong` | `#0F172A` | Titulares |
| `colors.textSubtle` | `#64748B` | Subtítulos y captions |
| `colors.border` | `#E2E8F0` | Bordes muy suaves |

**Regla dura:** el morado no puede pintar el 60% de la pantalla. Se reserva para acciones y detalles.

---

## 2 · Tipografía

| Rol | Familia | Peso | Tamaño |
| --- | --- | --- | --- |
| Logo | Poppins | SemiBold | 22 |
| h1 | Manrope | SemiBold | 30 / lh 38 |
| h2 | Manrope | SemiBold | 24 / lh 32 |
| h3 | Manrope | SemiBold | 20 / lh 28 |
| Subtítulos | Manrope | Medium | 17 / lh 26 |
| Cuerpo | Manrope | Regular | 17 / lh 26 |
| Body Strong | Manrope | SemiBold | 17 / lh 24 |
| Caption | Manrope | Regular | 14 / lh 20 |
| Label | Manrope | Medium | 15 / lh 22 |
| Botones | Manrope | SemiBold | 16 |
| Números grandes | Manrope | SemiBold | 36 / lh 44 |
| Números medianos | Manrope | SemiBold | 26 / lh 32 |

**Regla dura v1.1:** ningún texto de UI puede ser menor a **13 px**. Los meta-datos y timestamps usan 13; el mínimo funcional para labels es 14. Con esto se eliminan los contrastes bruscos entre valores prominentes y textos secundarios diminutos que dejaban tarjetas con demasiado aire.

Los tokens viven en `typography.*`. Si las familias no están cargadas en runtime, React Native cae al system UI font (SF Pro / Roboto / system-ui) — igualmente premium. La jerarquía se preserva por peso y tamaño.

---

## 3 · Radios de esquina

| Elemento | Radio |
| --- | --- |
| Botones | 16 |
| Inputs | 16 |
| Cards | 20 |
| Modales | 24 |
| Pills / badges | 999 |

Nada cuadrado. Todo suave y moderno. Tokens: `radius.button`, `radius.input`, `radius.card`, `radius.modal`, `radius.pill`.

---

## 4 · Sombras

Inspiradas en Apple. Muy baja opacidad, muy difuminadas.

| Token | Uso |
| --- | --- |
| `shadow.xs` | Bordes que necesitan un mínimo de profundidad |
| `shadow.sm` | Cards default |
| `shadow.md` | Menús flotantes, hover states destacados |
| `shadow.lg` | Modales |
| `shadow.glass` | Tarjetas con glassmorphism |

Prohibido: `shadowOpacity > 0.1` o `shadowColor` en negro puro fuera de estos tokens.

---

## 5 · Espaciado

| Uso | Valor | Token |
| --- | --- | --- |
| Entre tarjetas | 24 | `spacing.betweenCards` / `spacing.xl` |
| Padding interno de tarjetas | 20 | `spacing.card` |
| Icono ↔ texto | 12 | `spacing.iconText` / `spacing.md` |
| Entre bloques grandes | 32 | `spacing.block` / `spacing.xxl` |

Regla: la app respira. Nunca se ve saturada.

---

## 6 · Botones (`components/ui/Button.tsx`)

- Altura **52 px** (spec oficial). Variante `sm` = 40 px.
- Border radius 16 px.
- Variantes: `primary` (morado sólido), `secondary` (tinted lavender), `ghost` (borde), `danger` (rojo semántico).
- Icono minimalista opcional a izquierda o derecha.
- Microanimación de scale 0.98 al presionar (150 ms).
- Loading state con ActivityIndicator del color del texto.

Ejemplo:

```tsx
<Button label="Reservar clase" leftIcon="calendar" onPress={confirm} />
<Button label="Cancelar" variant="ghost" onPress={dismiss} />
```

---

## 7 · Inputs (`components/ui/Input.tsx`)

- Altura 52 px.
- Border radius 16 px.
- Etiqueta arriba (Manrope Medium 14).
- Icono opcional a la izquierda.
- Focus: borde morado primario.
- Error: borde rojo + mensaje debajo con icono `alert-circle`.

---

## 8 · Modales (`components/ui/Modal.tsx`)

- Border radius 24 px.
- Backdrop `colors.overlay` (`rgba(15,23,42,0.45)`).
- Aparece con fade + slide-up muy suave (220 ms).
- Cierre por tap fuera o botón X en esquina superior derecha.
- Acciones alineadas a la derecha: `secondary` a la izquierda de `primary`.

---

## 9 · Skeleton / carga (`components/ui/Skeleton.tsx`)

- Pulse 0.5 → 1 en 900 ms.
- Radios del design system (`sm`, `md`, `lg`, `card`, `button`, `pill`).
- `SkeletonCard` compone un placeholder tipo tarjeta con líneas y avatar simulado.

Nunca dejar la pantalla en blanco durante una carga.

---

## 10 · Glassmorphism (`components/ui/GlassCard.tsx`)

Aplicar únicamente donde aporte valor:

- Tarjetas de estadísticas destacadas.
- Buscador o barra de filtros persistente.
- Bloques dentro de calendarios y timelines.

Máximo 1–2 GlassCard por pantalla. En Web se activa `backdropFilter: blur(20px)`; en móvil se simula con opacidad y sombra teñida.

---

## 11 · Animaciones (`motion.*`)

| Token | Valor | Uso |
| --- | --- | --- |
| `motion.fast` | 150 ms | Micro-interacciones de botones y hovers |
| `motion.base` | 220 ms | Fade-in de vistas, entrada de modales |
| `motion.slow` | 300 ms | Transiciones entre pestañas |

Reglas:

- Fade-in suave al montar pantallas y listas.
- Desplazamiento ligero (< 16 px) en transiciones entre pantallas.
- Skeleton en cargas > 250 ms.
- Confirmación con badge o toast al guardar (nunca alert grande).
- Nunca animaciones exageradas ni bounce fuerte.

---

## 12 · Iconografía

- Un único set: outline minimalista, mismo grosor.
- Se sirve por `components/ui/Icon.tsx` (drop-in Unicode + fallback compatible con `@expo/vector-icons`).
- Tamaño estándar: 18 px inline, 20 px en cards, 22 px en headers.
- Prohibido mezclar estilos (solid + outline) en la misma pantalla.

---

## 13 · Dashboard SaaS

- Tarjetas grandes con `radius.card`.
- Mucho blanco.
- Muy pocas líneas divisorias — separar por espacio, no por bordes.
- Gráficas con paleta oficial (primario + info como acento).
- Jerarquía clara: 1 título, 1 kpi principal, 3 secundarios.
- Cada rol ve **solo lo esencial**.

---

## 14 · Tablas (`components/admin/DashboardTable.tsx`)

- Filas altas (mínimo 56 px).
- Padding vertical 12 px, horizontal 20 px.
- Hover fila: `colors.surfaceAlt` (muy sutil).
- Encabezado: Manrope Medium 12 px, `colors.textMuted`, `textTransform: uppercase`, `letterSpacing: 0.6`.
- Filtros y búsqueda en el TopBar, no incrustados en la tabla.

---

## 15 · Experiencia por rol

Cada pantalla debe responder a una pregunta en < 5 segundos.

- **Administrador**: pagos, reservas, alertas, métricas.
- **Supervisor**: clases en curso y tareas pendientes.
- **Profesor**: clases del día + reportes por completar.
- **Estudiante**: próxima clase, materiales, tareas.
- **Acudiente**: progreso, próximas clases, pagos.

---

## 16 · Componentes canónicos

Barrel en `components/ui/index.ts`. Toda pantalla nueva debe importar desde aquí:

- `Screen`, `PageContainer`, `WebSidebar`, `WebTwoColumn`, `Header`
- `Card`, `GlassCard`, `StatCard`, `KnowCard`, `NotificationBanner`
- `Button`, `Input`, `Modal`, `Skeleton`, `SkeletonCard`
- `Avatar`, `StatusBadge`, `ZoomButton`, `SupportRow`

Prohibido crear un botón, tarjeta o input distinto fuera del design system.

---

## 17 · Recomendaciones para seguir elevando la experiencia

1. **Cargar Poppins + Manrope** vía `expo-google-fonts` cuando el runtime móvil de OnSpace lo permita, con splash screen coordinada.
2. **Modo oscuro** derivado automáticamente de la paleta (invertir slate ↔ blanco, primario se mantiene).
3. **Motion library**: adoptar `moti` o `react-native-reanimated` v3 para transiciones consistentes entre pestañas.
4. **Iconos de marca** propios (calendario, reloj, book) para diferenciarse de Ionicons.
5. **Ilustraciones vacías** (`empty states`) generadas con paleta oficial, minimalistas y con toque humano.
6. **Guía de tono verbal** que acompañe al design system — cómo suena Wordlish al usuario.
7. **Auditoría de accesibilidad**: contraste AA/AAA, touch targets ≥ 44 px, `accessibilityLabel` obligatorio en todos los Pressable.
8. **Storybook / catálogo interno** que muestre cada componente en sus estados (default, hover, disabled, loading, error).
