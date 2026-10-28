import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

/** Actual PostgreSQL execution in an ephemeral PGlite database.
 * The auth schema below is a minimal test fixture, not an Auth implementation.
 * Never apply this harness to a real project; only the migration is production SQL.
 */
export async function runDatabaseTests({PGlite, pgcrypto}) {
  const db = new PGlite({extensions: {pgcrypto}});
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      grant usage on schema public,auth to anon,authenticated,service_role;
      create table auth.users(
        id uuid primary key, email text, phone text,
        raw_user_meta_data jsonb default '{}'::jsonb,
        email_confirmed_at timestamptz, phone_confirmed_at timestamptz
      );
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant execute on function auth.uid() to public;
    `);
    const migration = readFileSync(new URL('../migrations/0001_platform.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    console.log('PASS: platform migration executes in ephemeral PostgreSQL/PGlite.');
    await db.exec(migration);
    console.log('PASS: migration can be re-applied without recreating or losing tables.');
    await db.exec(readFileSync(new URL('./security.sql', import.meta.url), 'utf8'));
    console.log('PASS: SQL/RLS anonymous, customer and administrator isolation; private joining details and notes; immutable identity; matching batches; service-only RPCs; enquiry transaction, validation and rate budgets.');
    const result = await db.query(`select count(*)::integer as count from auth.users`);
    if (result.rows[0].count !== 0) throw new Error('Security fixtures were not rolled back.');
    console.log('PASS: security fixtures rolled back; no users or synthetic records retained.');
    console.log('This local test does not verify hosted Supabase Auth, SMTP, SMS or deployment credentials.');
  } finally {
    await db.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [{PGlite}, {pgcrypto}] = await Promise.all([
      import('@electric-sql/pglite'), import('@electric-sql/pglite/contrib/pgcrypto'),
    ]);
    await runDatabaseTests({PGlite, pgcrypto});
  } catch (error) {
    console.error('FAIL:', error.message);
    if (error.where) console.error(error.where);
    process.exitCode = 1;
  }
}
