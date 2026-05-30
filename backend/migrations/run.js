require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.sql'))
      .sort();
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      await client.query(sql);
      console.log(`✓ ${file}`);
    }

    // Create default admin account
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@adwat-altajer.sa';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2026';
    const adminName = 'المدير';

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (!existing.rows[0]) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await client.query(
        'INSERT INTO users (email, password_hash, name, is_admin) VALUES ($1,$2,$3,$4)',
        [adminEmail, hash, adminName, true]
      );
      console.log(`✓ Admin account created: ${adminEmail} / ${adminPassword}`);
    } else {
      console.log(`✓ Admin account already exists: ${adminEmail}`);
    }

    console.log('\n✅ Migration complete. Backend is ready.');
    console.log(`   Admin: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
