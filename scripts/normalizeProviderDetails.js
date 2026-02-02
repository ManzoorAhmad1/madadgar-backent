import pool from '../config/database.js';

async function run() {
  try {
    console.log('🔄 Normalizing provider_details for providers...');

    const [rows] = await pool.execute(
      "SELECT id, provider_details FROM users WHERE role = 'provider' AND (provider_details IS NULL OR provider_details = '' OR provider_details = 'null')"
    );

    if (!rows || rows.length === 0) {
      console.log('✅ No provider records required normalization.');
      process.exit(0);
    }

    for (const row of rows) {
      const id = row.id;
      const empty = JSON.stringify({});
      await pool.execute('UPDATE users SET provider_details = ? WHERE id = ?', [empty, id]);
      console.log(`   ✅ Updated provider id=${id}`);
    }

    console.log(`🎉 Normalization complete. Updated ${rows.length} providers.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Normalization failed:', err.message || err);
    process.exit(1);
  }
}

run();
