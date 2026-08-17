# Wordlish Beta · Catálogo Oficial de Materias

Version 1.0 · 2026-08-17

Fuente única de verdad para el catálogo de materias del beta. Sincronizado con
`public.subjects` en Cloud (backend compartido App + Web).

---

## Total: 10 materias activas

Todas las materias listadas están marcadas `active = true` en Cloud y se
sirven a ambos clientes (Wordlish app + WordlishWeb) via el mismo query:

```sql
select id, name, code, active
from public.subjects
where active = true
order by name;
```

RLS: `authenticated_select_subjects` permite lectura a cualquier usuario
autenticado (`to authenticated using (true)`).

---

## Lista consolidada (10)

| # | Nombre       | Code       | Área      | Niveles/programas típicos                                   |
|---|--------------|------------|-----------|-------------------------------------------------------------|
| 1 | Ciencias     | science    | Ciencias  | Primaria, Premedia, Secundaria, Universidad                 |
| 2 | Español      | spanish    | Idiomas   | Primaria, Secundaria, Universidad                           |
| 3 | Francés      | french     | Idiomas   | Básico, Intermedio, Avanzado                                |
| 4 | Física       | physics    | Ciencias  | Secundaria, Universidad                                     |
| 5 | Historia     | HIS        | Sociales  | Primaria, Premedia, Secundaria, Universidad                 |
| 6 | Inglés       | english    | Idiomas   | Básico, Intermedio, Avanzado, Conversación, Business, Preparación de exámenes |
| 7 | Matemáticas  | math       | Exactas   | Primaria, Premedia, Secundaria, Universidad                 |
| 8 | Portugués    | portuguese | Idiomas   | Básico, Intermedio, Avanzado                                |
| 9 | Química      | chemistry  | Ciencias  | Secundaria, Universidad                                     |
| 10| Sociales     | social     | Sociales  | Primaria, Premedia, Secundaria, Universidad                 |

Los códigos (`science`, `HIS`, `social`, etc.) son estables y no deben
renombrarse; son la clave usada por la UI y el fallback local.

---

## Materias por profesor en el beta

Estado actual `teacher_subjects` en Cloud (5 profesores, 11 mapeos):

| Profesor  | Materias asignadas             |
|-----------|--------------------------------|
| Doroty O. | Francés, Inglés, Español       |
| Dani G.   | Ciencias, Química              |
| Juli Q.   | Química, Matemáticas           |
| Jose M.   | Matemáticas, Física            |
| Cami F.   | Matemáticas, Química           |

Materias activas sin profesor asignado en beta: **Historia**, **Sociales**,
**Portugués**. Se mantienen activas para que el catálogo esté completo; si
un estudiante intenta reservarlas verá "sin profesores disponibles"
(mensaje ya manejado por `bookingService`).

---

## Paridad App / Web

- **Fuente única:** tabla `public.subjects`.
- **Cliente app:** `services/subjectsService.ts` hidrata desde Cloud
  (invocado en `app/booking/new.tsx` y `components/booking/BookingWizard.tsx`).
- **Cliente web (WordlishWeb):** debe usar el mismo query supabase, sin
  listas hardcodeadas. Individual y grupal comparten catálogo.
- **Fallback local:** `SUBJECTS_CATALOG` en `services/mockData.ts` sincronizado
  con las 10 materias oficiales para evitar drift si Cloud no responde.
- **Cache invalidation:** `hydrateSubjects(true)` fuerza refetch tras
  cambios administrativos.

---

## Reglas para modificar el catálogo

1. **Agregar** materia:
   - `insert into public.subjects (name, code, active) values (?, ?, true);`
   - Actualizar `SUBJECTS_CATALOG`, `SUBJECT_LEVELS`, `SUBJECT_META` en
     `services/mockData.ts`.
   - Bump versión de este documento.

2. **Desactivar** materia:
   - `update public.subjects set active=false where code = ?;`
   - No borrar la fila (rompe FK con `teacher_subjects`).

3. **Renombrar** materia:
   - Cambiar solo `name`; mantener `code` estable.

4. **Asignar profesor a una materia:**
   - `insert into public.teacher_subjects (teacher_id, subject_id) values (?, ?);`

---

## Verificación rápida (SQL)

```sql
-- Confirmar 10 materias activas
select count(*) from public.subjects where active = true;

-- Ver materias sin profesor asignado
select s.name
from public.subjects s
left join public.teacher_subjects ts on ts.subject_id = s.id
where s.active = true and ts.teacher_id is null
order by s.name;

-- Ver profesores por materia
select s.name as materia, count(ts.teacher_id) as profesores
from public.subjects s
left join public.teacher_subjects ts on ts.subject_id = s.id
where s.active = true
group by s.name
order by s.name;
```

---

## Diagnóstico automático de drift Backend ↔ Fallback local

Script: `docs/migrations/016_diagnostic_subjects_drift.sql`

Compara `public.subjects` (Cloud, `active = true`) contra `SUBJECTS_CATALOG`
en `services/mockData.ts`. Devuelve tres bloques:

1. **Diferencias fila por fila** (`missing_in_local`, `missing_in_cloud`) con
   la acción exacta a tomar.
2. **Resumen ejecutivo** con conteos + verdict `OK · paridad total` /
   `DRIFT · revisar SUBJECTS_CATALOG`.
3. **Snapshot completo Cloud** listo para copiar/pegar si hay que regenerar
   el fallback local desde cero.

Uso recomendado:

- Ejecutar antes de cada release beta.
- Ejecutar cada vez que se agregue, renombre o desactive una materia en
  Cloud.
- Si el verdict es `DRIFT`, aplicar la acción indicada por fila y volver a
  correr hasta ver `OK · paridad total`.

> Nota: el script es solo lectura, seguro para producción. El bloque
> `local_catalog(name)` es una copia literal de `SUBJECTS_CATALOG`; cuando se
> modifique el TS, actualizar el SQL el mismo día para que el diagnóstico
> siga siendo confiable.

---

## Historial

- 1.0 (2026-08-17): Catálogo oficial con 10 materias, alineado con backend
  y con fallback local en `services/mockData.ts` actualizado en paralelo.
  Se descarta el escenario previo de 7 materias.
