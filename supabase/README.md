# CanGrants + Supabase

This schema was designed using the **Supabase Cursor plugin** skills:

- RLS enabled on every `public` table
- Foreign-key columns indexed (Postgres does not auto-index FKs)
- GIN indexes on `text[]` columns used for filtering
- Separate SELECT + UPDATE policies (Postgres RLS requires SELECT to update)
- Wishlist table allows public insert but not public read (anti-scraping)
- `security definer` trigger lives in a controlled function with fixed `search_path`

## Next steps

1. **Authenticate the Supabase MCP server** in Cursor: Settings → Tools & MCP → Supabase → Connect
2. Create a Supabase project (or link an existing one)
3. Run the migration via MCP `apply_migration` or `supabase db push`
4. Seed grants: run `supabase/seed/grants_seed.sql` via MCP `execute_sql` (48 grants, auto-generated from `src/data/grants.ts`)
5. Wire the app with `@supabase/supabase-js` + TanStack Query (already in package.json)
6. Use `src/types/database.types.ts` for typed queries (regenerate via MCP `generate_typescript_types` after schema changes)

## What MCP unlocks after auth

| Tool | Use for CanGrants |
|------|-------------------|
| `list_tables` | Verify schema deployed |
| `execute_sql` | Seed 48 grants, test RLS |
| `get_advisors` | Catch missing RLS or unindexed FKs |
| `generate_typescript_types` | Replace hand-written interfaces |
| `get_publishable_keys` | Fill `.env` for Vite |
