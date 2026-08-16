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

## 4. Assets

- **Logo oficial:** `assets/brand/wordlish-logo.png` (aspect ratio ~3:2).
- **Componente unico:** `components/ui/WordlishLogo.tsx`. Prop `width` controla el tamano. Alto se calcula automaticamente.

Todas las pantallas de marca deben consumir `WordlishLogo`. Prohibido reintroducir placeholders ni renderizar la imagen directamente.

---

## 5. Puntos actuales de aparicion

- `app/login.tsx` · paso `type` (280 px) y paso `credentials` (150 px).
- `components/ui/WebSidebar.tsx` · header (168 px) + footer con nombre y tagline.

Cualquier pantalla nueva que necesite marca debe reutilizar el mismo componente.

---

## 6. Alcance de esta actualizacion

**Se toca:**
- Nuevo componente `WordlishLogo`.
- Reemplazo de dos placeholders de texto en `app/login.tsx`.
- Refresh visual del header y footer de `components/ui/WebSidebar.tsx`.
- Doc `docs/BRAND_IDENTITY_V2.md`.

**No se toca:**
- Autenticacion, roles, RLS, tablas, edge functions, rutas, servicios, repositorios, contextos, hooks.
- Ningun flujo de reservas, clases, pagos, reportes, materiales, screenshots o nomina.
- `constants/theme.ts` ni tokens de diseno (paleta lavanda / violeta / azul profundo ya vigente).

---

## 7. Ampliacion futura recomendada (fuera de alcance actual)

- Extraer variante SVG del logotipo (icono-only y monocromo) para favicon y push icons.
- Anadir tagline "Aprende. Conecta. Aplica." al header movil cuando exista un slot narrativo.
- Sincronizar la landing publica de WordlishWeb con el mismo asset y componente conceptual.
