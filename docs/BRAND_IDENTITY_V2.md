# Wordlish Education · Identidad Visual v2

Documento vivo. Fuente unica de verdad para la nueva marca. No modificar sin acuerdo.

---

## 1. Marca

**Nombre comercial:** Wordlish Education
**Tagline oficial:** Aprende. Conecta. Aplica.

Uso en producto:
- Splash / auth: logo completo (laptop + W ascendente + target + wordmark + tagline).
- Sidebar web y encabezados compactos: logo completo a menor escala.
- Micro-espacios (favicon, iconos de sistema): reservado a variante icono-only cuando exista.

---

## 2. Significado

| Palabra | Sentido |
|---|---|
| **Aprende** | Explora, pregunta, comprende conceptos y desarrolla las bases. |
| **Conecta** | Relaciona conocimientos, identifica patrones, integra ideas, razona. |
| **Aplica** | Utiliza lo aprendido en ejercicios, problemas, examenes y situaciones nuevas. |

Idea central: pasar del contenido a la comprension y de la comprension a la aplicacion.

---

## 3. Filosofia educativa

Wordlish Education es un **ecosistema** de profesores, metodologia, seguimiento y tecnologia. No es una plataforma de horas ni una academia tradicional.

Principios que guian la comunicacion:

- Comprender antes que repetir.
- Resolver problemas y no solo memorizar.
- Conectar conceptos entre materias y contextos.
- Preguntar y razonar.
- Analizar el error como fuente de informacion.
- Participacion activa del estudiante.
- Aplicacion practica del conocimiento.
- Autonomia progresiva.
- Tecnologia como acompanamiento, no sustituto del profesor.

Evitar: promesas absolutas, garantias de resultados, mensajes de refuerzo escolar generico.

---

## 4. Paleta oficial

Tokens canonicos (fuente de verdad: `constants/theme.ts`). Cualquier consumidor de color debe leer desde ahi; nunca reintroducir hex fuera del theme.

### Brand

| Token | Hex | Uso |
|---|---|---|
| `lavender-100` | `#D8C9FF` | Fondos suaves, tarjetas, detalles |
| `lavender-300` | `#B79CFF` | Acentos, ilustraciones |
| `violet-500` | `#7B6CF6` | Hover del primario, acciones secundarias |
| `violet-700` | `#4B3DBD` | Botones y elementos activos (primary) |
| `indigo-900` | `#1F1A4D` | Titulos y texto principal |

### Neutrals

| Token | Hex | Uso |
|---|---|---|
| `white` | `#FFFFFF` | Superficie principal |
| `bg-soft` | `#F7F5FB` | Fondo general |
| `text-secondary` | `#6E6A7A` | Texto de apoyo |

### Acentos opcionales

| Token | Hex | Uso |
|---|---|---|
| `pink-lavender` | `#E7C6FF` | Highlights suaves, tags premium |
| `gold-soft` | `#E8C77A` | Badges de logro, metricas destacadas |

### Degradados (reservados a logo, CTAs y elementos importantes)

- **Main:** `linear-gradient(135deg, #D8C9FF 0%, #B79CFF 25%, #7B6CF6 50%, #4B3DBD 75%, #1F1A4D 100%)`
- **Soft:** `linear-gradient(135deg, #F7F5FB 0%, #D8C9FF 100%)`
- **Button:** `linear-gradient(135deg, #7B6CF6 0%, #4B3DBD 100%)`

Disponibles como `gradients.main | soft | button` (arrays para `expo-linear-gradient` + string CSS para web).

### Regla visual

Usa `#1F1A4D` para titulos y texto principal, `#4B3DBD` y `#7B6CF6` para botones y elementos activos, `#D8C9FF` y `#B79CFF` para fondos suaves, tarjetas y detalles. Reserva los degradados para logo, CTAs y elementos importantes. Evita saturar la interfaz con morado; mantener predominio de blanco y espacios amplios.

### CSS variables (para WordlishWeb)

```css
:root {
  /* Brand */
  --wordlish-lavender-100: #D8C9FF;
  --wordlish-lavender-300: #B79CFF;
  --wordlish-violet-500: #7B6CF6;
  --wordlish-violet-700: #4B3DBD;
  --wordlish-indigo-900: #1F1A4D;

  /* Neutrals */
  --wordlish-white: #FFFFFF;
  --wordlish-bg-soft: #F7F5FB;
  --wordlish-text-secondary: #6E6A7A;

  /* Optional accents */
  --wordlish-pink-lavender: #E7C6FF;
  --wordlish-gold-soft: #E8C77A;

  /* Gradients */
  --wordlish-gradient-main: linear-gradient(135deg, #D8C9FF 0%, #B79CFF 25%, #7B6CF6 50%, #4B3DBD 75%, #1F1A4D 100%);
  --wordlish-gradient-soft: linear-gradient(135deg, #F7F5FB 0%, #D8C9FF 100%);
  --wordlish-gradient-button: linear-gradient(135deg, #7B6CF6 0%, #4B3DBD 100%);
}
```

---

## 5. Assets

- **Logo oficial:** `assets/brand/wordlish-logo.png` (aspect ratio ~3:2).
- **Componente unico:** `components/ui/WordlishLogo.tsx`. Prop `width` controla el tamano. Alto se calcula automaticamente.

Todas las pantallas de marca deben consumir `WordlishLogo`. Prohibido reintroducir placeholders ni renderizar la imagen directamente.

---

## 6. Puntos actuales de aparicion

- `app/login.tsx` · paso `type` (280 px) y paso `credentials` (150 px).
- `components/ui/WebSidebar.tsx` · header (168 px) + footer con nombre y tagline.

Cualquier pantalla nueva que necesite marca debe reutilizar el mismo componente.

---

## 7. Alcance de esta actualizacion

**Se toca:**
- Nuevo componente `WordlishLogo`.
- Reemplazo de dos placeholders de texto en `app/login.tsx`.
- Refresh visual del header y footer de `components/ui/WebSidebar.tsx`.
- Paleta v2 aplicada a `constants/theme.ts` (tokens brand + `gradients`).
- Doc `docs/BRAND_IDENTITY_V2.md`.

**No se toca:**
- Autenticacion, roles, RLS, tablas, edge functions, rutas, servicios, repositorios, contextos, hooks.
- Ningun flujo de reservas, clases, pagos, reportes, materiales, screenshots o nomina.
- Alias existentes del theme (`colors.primary`, `colors.background`, etc.), solo cambian los valores subyacentes.

---

## 8. Ampliacion futura recomendada (fuera de alcance actual)

- Extraer variante SVG del logotipo (icono-only y monocromo) para favicon y push icons.
- Anadir tagline "Aprende. Conecta. Aplica." al header movil cuando exista un slot narrativo.
- Sincronizar la landing publica de WordlishWeb con el mismo asset y componente conceptual.
