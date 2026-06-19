// ============================================================
//  SUMOPOD BOT - AUTHENTICATION (Supabase OTP)
// ============================================================

const axios = require('axios');
const readlineSync = require('readline-sync');
const cfg = require('./config');
const { solveTurnstile } = require('./captcha');
const { saveSession, clearSession } = require('./session');

// ── Supabase axios instance ──────────────────────────────────
function makeSupabaseClient(accessToken = null) {
    const headers = {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'x-client-info': cfg.X_CLIENT_INFO,
        'x-supabase-api-version': cfg.SUPABASE_API_VERSION,
        'Content-Type': 'application/json;charset=UTF-8',
        'Accept': '*/*',
        'Origin': 'https://sumopod.com',
        'Referer': 'https://sumopod.com/',
        'User-Agent': cfg.USER_AGENT,
        'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return axios.create({
        baseURL: cfg.SUPABASE_URL,
        headers,
        timeout: 30000,
    });
}

// ── Step 1: Kirim OTP via Email ──────────────────────────────
async function sendOTP(email, captchaToken, display) {
    display.info(`Mengirim OTP ke ${email}...`);

    const client = makeSupabaseClient();
    const res = await client.post('/auth/v1/otp', {
        email,
        data: {},
        create_user: true,
        gotrue_meta_security: {
            captcha_token: captchaToken,
        },
        code_challenge: null,
        code_challenge_method: null,
    });

    // Supabase OTP send returns 200 with empty body or minimal data
    display.success('OTP berhasil dikirim ke email!');
    return res;
}

// ── Step 2: Verify OTP ──────────────────────────────────────
async function verifyOTP(email, otp, display) {
    display.info('Memverifikasi OTP...');

    const client = makeSupabaseClient();
    const res = await client.post('/auth/v1/verify', {
        type: 'email',
        email,
        token: otp,
        gotrue_meta_security: {},
    });

    const data = res.data;

    if (!data.access_token) {
        throw new Error('Verifikasi gagal – tidak ada access_token dalam respons');
    }

    return data;
}

// ── Main: Login Flow ─────────────────────────────────────────
async function login(display) {
    display.section('LOGIN - AMBIL SESSION');

    // 1. Ambil email dari .env (LOGIN_EMAIL)
    const email = cfg.LOGIN_EMAIL;
    if (!email) {
        display.error('LOGIN_EMAIL belum diset di file .env!');
        display.info('Buka file .env dan isi: LOGIN_EMAIL=emailkamu@example.com');
        return false;
    }
    display.info(`Menggunakan email: ${email}`);

    display.divider();

    // 2. Solve Turnstile
    display.info('Mempersiapkan Cloudflare Turnstile...');
    let captchaToken;
    try {
        captchaToken = await solveTurnstile(display);
    } catch (err) {
        display.error('Gagal menyelesaikan captcha: ' + err.message);
        return false;
    }

    display.divider();

    // 3. Kirim OTP
    try {
        await sendOTP(email, captchaToken, display);
    } catch (err) {
        const msg = err.response?.data?.msg || err.response?.data?.message || err.message;
        display.error('Gagal mengirim OTP: ' + msg);
        return false;
    }

    display.divider();

    // 4. Input OTP dari user
    const otpRaw = readlineSync.question(
        '  Masukkan OTP yang dikirim ke email Anda: ',
        { limit: /^\d{4,8}$/, limitMessage: '  OTP harus 4-8 digit angka: ' }
    );

    display.divider();

    // 5. Verify OTP
    let sessionData;
    try {
        sessionData = await verifyOTP(email, otpRaw.trim(), display);
    } catch (err) {
        const msg = err.response?.data?.msg || err.response?.data?.message || err.message;
        display.error('Verifikasi OTP gagal: ' + msg);
        return false;
    }

    // 6. Simpan session
    const toSave = {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        token_type: sessionData.token_type || 'bearer',
        expires_at: sessionData.expires_at
            || Math.floor(Date.now() / 1000) + (sessionData.expires_in || 3600),
        user: {
            id: sessionData.user?.id,
            email: sessionData.user?.email,
        },
        saved_at: new Date().toISOString(),
    };

    saveSession(toSave);

    display.success('Login berhasil!');
    display.step('Email', toSave.user.email);
    display.step('User ID', toSave.user.id);
    display.step('Expires', new Date(toSave.expires_at * 1000).toLocaleString('id-ID'));

    return true;
}

// ── Check Session ─────────────────────────────────────────────
async function checkSession(session, display) {
    try {
        const client = makeSupabaseClient(session.access_token);
        const res = await client.get('/auth/v1/user');
        return res.data;
    } catch (err) {
        if (err.response?.status === 401) return null;
        throw err;
    }
}

module.exports = { login, checkSession, makeSupabaseClient };
