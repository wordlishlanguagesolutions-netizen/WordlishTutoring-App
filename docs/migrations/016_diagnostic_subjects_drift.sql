-- ============================================================================
-- Wordlish · Diagnóstico de drift entre catálogo Cloud y fallback local.
--
-- Propósito:
--   Compara `public.subjects` (donde active = true) contra la lista literal
--   `SUBJECTS_CATALOG` declarada en `services/mockData.ts` (fallback de UI
--   cuando Cloud no responde). Detecta cuatro tipos de drift:
--
--     1. missing_in_local  -> materia activa en Cloud sin entrada en el
--                             fallback local. Riesgo: si Cloud cae, la UI
--                             no la mostrará.
--     2. missing_in_cloud  -> materia listada en el fallback local que ya
--                             no existe (o fue desactivada) en Cloud.
--                             Riesgo: código muerto / UI ofrece opción no
--                             reservable.
--     3. count_mismatch    -> Cloud y local tienen distinto conteo total.
--     4. verdict           -> resumen accionable para el release checklist.
--
-- Fuente única de verdad del catálogo oficial: docs/BETA_SUBJECTS.md.
--
-- Uso:
--   - Ejecutar antes de cada release beta / cada vez que se agregue,
--     renombre o desactive una materia en Cloud.
--   - No modifica datos (solo SELECT). Seguro para producción.
--   - Si el verdict devuelve DRIFT, hay dos rutas:
--       a) Backend desactualizado -> ajustar `subjects` en Cloud.
--       b) Local desactualizado  -> editar `SUBJECTS_CATALOG`,
--          `SUBJECT_LEVELS`, `SUBJECT_META` en `services/mockData.ts` y
--          bump versión de docs/BETA_SUBJECTS.md.
--
-- Convención de sincronización con TypeScript:
--   El bloque `local_catalog(name)` debe ser copia exacta de la constante
--   SUBJECTS_CATALOG en services/mockData.ts. Si se agrega/quita una
--   materia allá, actualizar aquí el mismo día. Un pre-commit hook futuro
--   puede generar este bloque automáticamente desde el TS para eliminar
--   drift entre el diagnóstico y el propio catálogo.
-- ============================================================================

-- ─── Paso 1 · Materias con drift (una fila por diferencia) ─────────────────
with local_catalog(name) as (
  values
    -- COPIA EXACTA de SUBJECTS_CATALOG en services/mockData.ts
    ('Inglés'),
    ('Francés'),
    ('Portugués'),
    ('Español'),
    ('Matemáticas'),
    ('Física'),
    ('Química'),
    ('Ciencias'),
    ('Historia'),
    ('Sociales')
),
cloud_catalog as (
  select name
  from public.subjects
  where active = true
),
diff as (
  select
    'missing_in_local' as issue,
    c.name
  from cloud_catalog c
  left join local_catalog l on l.name = c.name
  where l.name is null

  union all

  select
    'missing_in_cloud' as issue,
    l.name
  from local_catalog l
  left join cloud_catalog c on c.name = l.name
  where c.name is null
)
select
  issue,
  name,
  case issue
    when 'missing_in_local' then
      'Agregar a SUBJECTS_CATALOG / SUBJECT_LEVELS / SUBJECT_META en services/mockData.ts'
    when 'missing_in_cloud' then
      'Quitar de SUBJECTS_CATALOG o insertar/activar en public.subjects'
  end as action_required
from diff
order by issue, name;

-- ─── Paso 2 · Resumen ejecutivo con verdict ────────────────────────────────
with local_catalog(name) as (
  values
    ('Inglés'),('Francés'),('Portugués'),('Español'),
    ('Matemáticas'),('Física'),('Química'),
    ('Ciencias'),('Historia'),('Sociales')
),
cloud_catalog as (
  select name from public.subjects where active = true
),
counts as (
  select
    (select count(*) from cloud_catalog) as cloud_active,
    (select count(*) from local_catalog) as local_count,
    (select count(*) from cloud_catalog c
       left join local_catalog l on l.name = c.name
       where l.name is null) as missing_in_local,
    (select count(*) from local_catalog l
       left join cloud_catalog c on c.name = l.name
       where c.name is null) as missing_in_cloud
)
select
  cloud_active,
  local_count,
  missing_in_local,
  missing_in_cloud,
  case
    when missing_in_local = 0
     and missing_in_cloud = 0
     and cloud_active = local_count
      then 'OK · paridad total'
    else 'DRIFT · revisar SUBJECTS_CATALOG en services/mockData.ts y docs/BETA_SUBJECTS.md'
  end as verdict
from counts;

-- ─── Paso 3 · Snapshot completo Cloud (para copiar/pegar si hay que ────────
-- ─── regenerar el fallback local) ─────────────────────────────────────────
select
  row_number() over (order by name) as pos,
  name,
  code,
  active
from public.subjects
where active = true
order by name;
