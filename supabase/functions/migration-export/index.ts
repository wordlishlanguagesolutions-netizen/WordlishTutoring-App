// migration-export — FUNCIÓN TEMPORAL DE SOLO LECTURA para migrar fuera de OnSpace.
// - Solo responde a una cuenta con rol "admin" en user_profiles.
// - Corre dentro de una transacción READ ONLY: no puede escribir nada.
// - Borrar esta función en cuanto termine la exportación.
import postgres from "npm:postgres@3.4.5";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

// Consultas de solo lectura sobre el catálogo de PostgreSQL.
// Ninguna escribe, crea ni modifica nada.
export const SCHEMA_QUERIES: Record<string, string> = {
  extensions: `
    select e.extname, e.extversion, n.nspname as schema
    from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    order by 1`,

  enums: `
    select n.nspname as schema, t.typname as name,
           array_agg(e.enumlabel order by e.enumsortorder) as labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by 1, 2 order by 2`,

  tables: `
    select c.relname as name, c.relkind as kind,
           c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
           obj_description(c.oid, 'pg_class') as comment
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
    order by 1`,

  columns: `
    select c.relname as table_name, a.attnum as position, a.attname as name,
           format_type(a.atttypid, a.atttypmod) as type,
           a.attnotnull as not_null,
           pg_get_expr(d.adbin, d.adrelid) as default_expr,
           a.attidentity as identity, a.attgenerated as generated,
           col_description(c.oid, a.attnum) as comment
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
      and a.attnum > 0 and not a.attisdropped
    order by 1, 2`,

  constraints: `
    select c.relname as table_name, k.conname as name, k.contype as type,
           pg_get_constraintdef(k.oid, true) as definition
    from pg_constraint k
    join pg_class c on c.oid = k.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
    order by 1, case k.contype when 'p' then 0 when 'u' then 1 when 'c' then 2 when 'f' then 3 else 4 end, 2`,

  indexes: `
    select ct.relname as table_name, ci.relname as name,
           pg_get_indexdef(i.indexrelid) as definition,
           exists (select 1 from pg_constraint k where k.conindid = i.indexrelid) as backs_constraint
    from pg_index i
    join pg_class ci on ci.oid = i.indexrelid
    join pg_class ct on ct.oid = i.indrelid
    join pg_namespace n on n.oid = ct.relnamespace
    where n.nspname = 'public'
    order by 1, 2`,

  views: `
    select c.relname as name, c.relkind as kind, c.reloptions as options,
           pg_get_viewdef(c.oid, true) as definition
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('v', 'm')
    order by 1`,

  functions: `
    select p.proname as name, pg_get_function_identity_arguments(p.oid) as args,
           p.prokind as kind, p.prosecdef as security_definer,
           pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind in ('f', 'p')
      and not exists (select 1 from pg_depend d
                      where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
    order by 1, 2`,

  triggers: `
    select n.nspname as schema, c.relname as table_name, t.tgname as name,
           t.tgenabled as enabled, pg_get_triggerdef(t.oid, true) as definition,
           pn.nspname || '.' || p.proname as function_name
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace pn on pn.oid = p.pronamespace
    where not t.tgisinternal
      and (n.nspname = 'public' or pn.nspname = 'public')
    order by 1, 2, 3`,

  policies: `
    select schemaname as schema, tablename as table_name, policyname as name,
           permissive, roles, cmd, qual as using_expr, with_check as check_expr
    from pg_policies
    where schemaname in ('public', 'storage')
    order by 1, 2, 3`,

  table_grants: `
    select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as privileges
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
    group by 1, 2 order by 1, 2`,

  column_grants: `
    select table_name, column_name, grantee, privilege_type
    from information_schema.role_column_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')
    order by 1, 2, 3, 4`,

  function_grants: `
    select p.proname as name, pg_get_function_identity_arguments(p.oid) as args,
           coalesce(array_to_string(p.proacl, ','), '(default)') as acl
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind in ('f', 'p')
      and not exists (select 1 from pg_depend d
                      where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
    order by 1, 2`,

  sequences: `
    select schemaname as schema, sequencename as name, data_type::text, start_value, increment_by, last_value
    from pg_sequences where schemaname = 'public' order by 2`,

  publications: `
    select pubname, schemaname as schema, tablename as table_name
    from pg_publication_tables order by 1, 2, 3`,

  row_counts: `
    select c.relname as table_name, c.reltuples::bigint as estimated_rows
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
    order by 1`,
};

// Consultas que dependen de esquemas propios de Supabase (pueden no existir).
export const PLATFORM_QUERIES: Record<string, string> = {
  storage_buckets: `
    select id, name, public, file_size_limit, allowed_mime_types, created_at
    from storage.buckets order by 1`,
  storage_objects: `
    select bucket_id, name, metadata->>'size' as size, metadata->>'mimetype' as mimetype, created_at
    from storage.objects order by 1, 2`,
  auth_users: `
    select id, email, created_at, last_sign_in_at, email_confirmed_at,
           raw_app_meta_data, raw_user_meta_data
    from auth.users order by created_at`,
  cron_jobs: `select jobid, schedule, command, active from cron.job order by 1`,
};

export const LIST_DATA_TABLES = `
  select c.relname as name
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
  order by 1`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const redact = (v: string) => v.replace(/postgres(?:ql)?:\/\/\S+/g, "[conexión oculta]");
const json = (body: unknown, status = 200) =>
  new Response(redact(JSON.stringify(body)), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function requireAdmin(req: Request): Promise<string | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return "missing token";
  const host = new URL(req.url).host;
  const url = Deno.env.get("AUTH_SOURCE_URL") || Deno.env.get("SUPABASE_URL") || `https://${host}`;
  const anon = Deno.env.get("AUTH_SOURCE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || req.headers.get("apikey") || "";
  if (!anon) return "no anon key available";
  const client = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return "invalid token";
  const { data: profile } = await client.from("user_profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return "admin role required";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    return await handle(req);
  } catch (e) {
    return json({ error: "unhandled", detail: String(e), env: {
      SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"), SUPABASE_ANON_KEY: !!Deno.env.get("SUPABASE_ANON_KEY"),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), SUPABASE_DB_URL: !!Deno.env.get("SUPABASE_DB_URL"),
      AUTH_SOURCE_URL: !!Deno.env.get("AUTH_SOURCE_URL") } }, 500);
  }
});

async function handle(req: Request): Promise<Response> {
  const denied = await requireAdmin(req);
  if (denied) return json({ error: denied }, 403);

  const part = new URL(req.url).searchParams.get("part") ?? "schema";
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) return json({ error: "SUPABASE_DB_URL not available" }, 500);
  const m = dbUrl.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^@:\/]+)(?::(\d+))?\/([^?]+)/);
  const sql = m
    ? postgres({ username: decodeURIComponent(m[1]), password: m[2], host: m[3], port: Number(m[4] ?? 5432), database: m[5], prepare: false, max: 1 })
    : postgres(dbUrl, { prepare: false, max: 1 });
  const out: Record<string, unknown> = { part, exported_at: new Date().toISOString(), errors: {} };
  const errors = out.errors as Record<string, string>;
  try {
    await sql.begin("read only", async (tx) => {
      if (part === "schema") {
        for (const [key, q] of Object.entries(SCHEMA_QUERIES)) {
          try { await tx.unsafe("savepoint s"); out[key] = await tx.unsafe(q); await tx.unsafe("release savepoint s"); }
          catch (e) { errors[key] = String(e); await tx.unsafe("rollback to savepoint s"); }
        }
        for (const [key, q] of Object.entries(PLATFORM_QUERIES)) {
          try { await tx.unsafe("savepoint p"); out[key] = await tx.unsafe(q); await tx.unsafe("release savepoint p"); }
          catch (e) { errors[key] = String(e); await tx.unsafe("rollback to savepoint p"); }
        }
      } else if (part === "data") {
        const tables = await tx.unsafe(LIST_DATA_TABLES);
        out.tables = tables.map((t: { name: string }) => t.name);
      } else {
        throw new Error("part must be schema or data");
      }
    });
  } catch (e) {
    errors._fatal = String(e);
  } finally {
    await sql.end({ timeout: 5 });
  }
  if (part === "data") {
    const admin = createClient(Deno.env.get("SUPABASE_URL") || `https://${new URL(req.url).host}`, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
    const data: Record<string, unknown> = {};
    for (const name of (out.tables as string[]) ?? []) {
      const rows: unknown[] = [];
      let expected: number | null = null;
      try {
        for (let from = 0; ; from += 1000) {
          const { data: page, error, count } = await admin.from(name).select("*", { count: "exact" }).range(from, from + 999);
          if (error) throw new Error(error.message);
          if (expected === null) expected = count ?? null;
          rows.push(...(page ?? []));
          if (!page || page.length < 1000) break;
        }
        data[name] = { count: expected, exported: rows.length, rows };
      } catch (e) { errors[name] = String(e); }
    }
    out.data = data;
    try {
      const { data: buckets, error } = await admin.storage.listBuckets();
      if (error) throw new Error(error.message);
      const files: Record<string, unknown> = {};
      for (const b of buckets ?? []) {
        const { data: list } = await admin.storage.from(b.id).list("", { limit: 1000 });
        files[b.id] = list ?? [];
      }
      out.storage = { buckets, files };
    } catch (e) { errors.storage = String(e); }
  }
  return json(out);
}
