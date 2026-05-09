const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_IwK4JaqTAD0x@ep-rapid-pine-aqyzqinf-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
});
pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'").then(res => { console.log(res.rows); process.exit(0); }).catch(err => { console.error(err); process.exit(1); });
