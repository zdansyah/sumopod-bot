// ============================================================
//  SUMOPOD BOT - 2CAPTCHA SOLVER
// ============================================================

const axios = require('axios');
const cfg = require('./config');

const TWOCAPTCHA_BASE = 'https://2captcha.com';

/**
 * Solves Cloudflare Turnstile using 2Captcha API.
 * Returns the captcha_token string on success.
 */
async function solveTurnstile(display) {
    display.info('Mengirim Turnstile challenge ke 2Captcha...');

    // Step 1: Submit task
    const submitRes = await axios.post(`${TWOCAPTCHA_BASE}/in.php`, null, {
        params: {
            key: cfg.CAPTCHA_API_KEY,
            method: 'turnstile',
            sitekey: cfg.CF_TURNSTILE_SITE_KEY,
            pageurl: cfg.CF_TURNSTILE_PAGE_URL,
            useragent: cfg.USER_AGENT,
            action: 'checkout', // Optional fallback
            json: 1,
        },
        timeout: 30000,
    });

    if (submitRes.data.status !== 1) {
        throw new Error(`2Captcha submit gagal: ${submitRes.data.error_text || submitRes.data.request}`);
    }

    const taskId = submitRes.data.request;
    display.step('Task ID', taskId);

    // Step 2: Poll for result (max 120 detik)
    display.info('Memproses Turnstile... (tunggu ~30-60 detik)');
    const maxAttempts = 24;
    const pollInterval = 5000; // 5 detik

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await sleep(pollInterval);
        display.info(`Cek hasil [${attempt}/${maxAttempts}]...`);

        const resultRes = await axios.get(`${TWOCAPTCHA_BASE}/res.php`, {
            params: {
                key: cfg.CAPTCHA_API_KEY,
                action: 'get',
                id: taskId,
                json: 1,
            },
            timeout: 15000,
        });

        if (resultRes.data.status === 1) {
            const token = resultRes.data.request;
            display.success('Turnstile berhasil diselesaikan!');
            return token;
        }

        if (resultRes.data.request !== 'CAPCHA_NOT_READY') {
            throw new Error(`2Captcha error: ${resultRes.data.request}`);
        }
    }

    throw new Error('2Captcha timeout – captcha tidak selesai dalam 120 detik');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { solveTurnstile };
