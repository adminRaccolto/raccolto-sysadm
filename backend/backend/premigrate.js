// Runs before prisma db push to handle type migrations that Prisma cannot do automatically.
// Specifically: converting the EtapaCrm enum column to TEXT in OportunidadeCrm.
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();

    // Convert OportunidadeCrm.etapa from enum to TEXT (Prisma cannot auto-cast enums)
    await client.query(
      'ALTER TABLE "OportunidadeCrm" ALTER COLUMN "etapa" TYPE TEXT USING "etapa"::TEXT',
    );
    console.log('[premigrate] OportunidadeCrm.etapa converted to TEXT');
  } catch (e) {
    // Column is already TEXT or some other benign condition — proceed
    console.log('[premigrate] skipped (', e.message.slice(0, 120), ')');
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error('[premigrate] fatal:', e.message);
  process.exit(1);
});
