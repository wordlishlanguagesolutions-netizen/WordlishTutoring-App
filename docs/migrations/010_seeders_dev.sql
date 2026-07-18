-- Migración 010 · Seeders mínimos de desarrollo (idempotentes)
-- Solo cataloga materias; NO crea usuarios reales ni datos financieros.

insert into public.subjects (code, name, active) values
  ('math','Matemáticas', true),
  ('spanish','Español', true),
  ('english','Inglés', true),
  ('science','Ciencias', true),
  ('social','Sociales', true),
  ('physics','Física', true),
  ('chemistry','Química', true),
  ('biology','Biología', true)
on conflict (code) do nothing;
