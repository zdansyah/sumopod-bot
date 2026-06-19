// ============================================================
//  SUMOPOD BOT - CONFIGURATION
//  Semua nilai sensitif diambil dari file .env
// ============================================================

require('dotenv').config();

module.exports = {
    // Supabase (dari HAR analysis)
    SUPABASE_URL: 'https://dhsrwbufpdvuptdzeieo.supabase.co',
    SUPABASE_ANON_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoc3J3YnVmcGR2dXB0ZHplaWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ4NTUsImV4cCI6MjA2MjAzMDg1NX0.7dhHHFZZArMOQgFwehICyjY-QKehZ9gvrVt8hOXTJX0',

    // Sumopod Domain API (dari HAR analysis)
    DOMAIN_API_URL: 'https://api-gate-domain-v2.sumopod.com',

    // Cloudflare Turnstile (site key dari HAR)
    CF_TURNSTILE_SITE_KEY: '0x4AAAAAABebRjbP6mmA0Kor',
    CF_TURNSTILE_PAGE_URL: 'https://sumopod.com',

    // 2Captcha API Key — dari .env
    CAPTCHA_API_KEY: process.env.CAPTCHA_API_KEY || '789a17721ea830d8a3043d69ac3fec43',

    // Email login — dari .env (ganti di sana, bukan di sini)
    LOGIN_EMAIL: process.env.LOGIN_EMAIL || '',

    // Session file path
    SESSION_FILE: './session.json',

    // ── Data Registrant Domain ─────────────────────────────
    // Ubah di file .env, bukan di sini
    REGISTRANT: {
        name: process.env.REGISTRANT_NAME || 'Fikri Zidansyah',
        company: process.env.REGISTRANT_COMPANY || 'streadstore',
        address: process.env.REGISTRANT_ADDRESS || 'Jl Elang Laut 2 No 1',
        city: process.env.REGISTRANT_CITY || 'Penjaringan',
        province: process.env.REGISTRANT_PROVINCE || 'Jakarta',
        country: process.env.REGISTRANT_COUNTRY || 'Indonesia',
        postal_code: process.env.REGISTRANT_POSTAL_CODE || '14470',
        phone_country_code: process.env.REGISTRANT_PHONE_CC || '+62',
        phone_number: process.env.REGISTRANT_PHONE || '85159710544',
        mobile_country_code: process.env.REGISTRANT_MOBILE_CC || '+62',
        mobile_number: process.env.REGISTRANT_MOBILE || '',
    },

    // Request headers
    USER_AGENT:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    X_CLIENT_INFO: 'supabase-js-web/2.95.3',
    SUPABASE_API_VERSION: '2024-01-01',
};
