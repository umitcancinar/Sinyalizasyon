const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => console.log('[DB] PostgreSQL bağlantısı OK (Neon.tech)'));
pool.on('error', (err) => console.error('[DB] Beklenmeyen hata:', err.message));

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      -- =============================================
      -- TRAFIK SINYAL SİSTEMİ TABLOLARI
      -- =============================================

      CREATE TABLE IF NOT EXISTS signal_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        preferred_lang VARCHAR(2) DEFAULT 'tr',
        preferred_theme VARCHAR(10) DEFAULT 'light',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS traffic_lights (
        id SERIAL PRIMARY KEY,
        osm_node_id BIGINT UNIQUE,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        city VARCHAR(100) DEFAULT 'unknown',
        intersection_name VARCHAR(300),
        -- Yön bilgisi: her ışığın baktığı yön (0-360°)
        -- Örn: kuzey yönüne giden trafiği durduran ışık → heading=0
        approach_heading DECIMAL(6,2),
        -- Gerçekçi döngü süreleri (saniye)
        cycle_duration INT DEFAULT 90,
        green_duration INT DEFAULT 35,
        yellow_duration INT DEFAULT 5,
        last_synced TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stop_events (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES signal_users(id) ON DELETE CASCADE,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        heading DECIMAL(6,2),
        turn_signal VARCHAR(10) DEFAULT 'straight',
        traffic_light_id INT REFERENCES traffic_lights(id),
        stopped_at TIMESTAMP DEFAULT NOW(),
        duration_seconds INT
      );

      CREATE TABLE IF NOT EXISTS signal_game_scores (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES signal_users(id) ON DELETE CASCADE,
        game_type VARCHAR(50) NOT NULL,
        score INT NOT NULL,
        played_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS info_cards (
        id SERIAL PRIMARY KEY,
        title_tr TEXT NOT NULL,
        title_en TEXT NOT NULL,
        content_tr TEXT NOT NULL,
        content_en TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        emoji VARCHAR(10) DEFAULT '💡',
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS quick_contacts (
        id SERIAL PRIMARY KEY,
        name_tr VARCHAR(200) NOT NULL,
        name_en VARCHAR(200) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        category VARCHAR(50) DEFAULT 'emergency',
        icon VARCHAR(10) DEFAULT '📞',
        sort_order INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS message_templates (
        id SERIAL PRIMARY KEY,
        content_tr TEXT NOT NULL,
        content_en TEXT NOT NULL,
        emoji VARCHAR(10) DEFAULT '💬',
        sort_order INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS chatbot_knowledge (
        id SERIAL PRIMARY KEY,
        topic VARCHAR(200),
        content TEXT NOT NULL,
        language VARCHAR(2) DEFAULT 'tr',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('[DB] Tüm tablolar hazır.');
    return true;
  } catch (err) {
    console.error('[DB] Tablo oluşturma hatası:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };
