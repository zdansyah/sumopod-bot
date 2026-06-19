// ============================================================
//  SUMOPOD BOT - DOMAIN API
// ============================================================

const axios = require('axios');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const cfg = require('./config');
const { solveTurnstile } = require('./captcha');

// ── Domain API axios instance ────────────────────────────────
function makeDomainClient(accessToken) {
    return axios.create({
        baseURL: cfg.DOMAIN_API_URL,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'Origin': 'https://sumopod.com',
            'Referer': 'https://sumopod.com/',
            'User-Agent': cfg.USER_AGENT,
            'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
        },
        timeout: 30000,
    });
}

// ── Ekstrak keyword dari input (hapus ekstensi jika ada) ──────
function extractKeyword(input) {
    // Jika user input "streadku.web.id" → ambil bagian pertama "streadku"
    // Jika sudah keyword "streadku" → langsung pakai
    const parts = input.trim().split('.');
    return parts[0].toLowerCase();
}

// ── Cek ketersediaan domain (GET get-availability) ────────────
// Sumopod menggunakan async background check: request pertama memicu pengecekan
// di server, hasil baru tersedia setelah beberapa detik (sering kosong di awal).
async function checkDomainAvailability(keyword, accessToken, display) {
    display.info(`Mencari domain untuk keyword: ${chalk.cyan(keyword)}`);

    const client = makeDomainClient(accessToken);
    let domains = [];
    const maxRetries = 8;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const res = await client.get('/webhook/sumopod/domain/get-availability', {
            params: { name: keyword },
        });

        domains = res.data;

        // Cek apakah data sudah tersedia (array berisi item)
        const isEmpty = domains === '' || !domains || (Array.isArray(domains) && domains.length === 0);

        if (!isEmpty) {
            // Data berhasil didapat, keluar dari loop
            break;
        }

        if (attempt < maxRetries) {
            // Server masih memproses background check — beri tahu user dan tunggu
            const delay = attempt === 1 ? 3000 : 5000;
            display.info(`Server sedang memproses... menunggu (${attempt}/${maxRetries - 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        } else {
            // Sudah habis semua retry, tetap kosong
            domains = [];
        }
    }

    // Pastikan data adalah array
    if (!Array.isArray(domains)) {
        if (Array.isArray(domains?.data)) {
            domains = domains.data;
        } else {
            // Log raw response untuk debug
            display.warn('Response mentah: ' + JSON.stringify(domains).slice(0, 300));
            throw new Error('Format respons API tidak dikenal');
        }
    }

    const available = domains.filter(d => d.is_available);
    return { all: domains, available };
}

// ── Sinkronisasi Profil User ──────────────────────────────────
async function syncUserProfile(session, display) {
    const accessToken = session.access_token;
    const userId = session.user?.id;
    const r = cfg.REGISTRANT;

    // Supabase REST client
    const supabaseClient = axios.create({
        baseURL: cfg.SUPABASE_URL,
        headers: {
            'apikey': cfg.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'x-client-info': cfg.X_CLIENT_INFO,
            'x-supabase-api-version': cfg.SUPABASE_API_VERSION,
        },
    });

    try {
        // 1. Update user metadata
        await supabaseClient.put('/auth/v1/user', {
            data: { company: r.company },
            code_challenge: null,
            code_challenge_method: null
        });

        // 2. Update profile table
        if (userId) {
            await supabaseClient.patch(`/rest/v1/profiles?id=eq.${userId}&select=*`, {
                company: r.company
            });
        }
    } catch (err) {
        display.warn(`[!] Gagal sinkronisasi profil Supabase, eksekusi dilanjutkan...`);
    }
}

// ── Beli satu domain (dengan auto-retry) ─────────────────────
async function purchaseDomain(domainName, session, display) {
    display.info(`Memproses pembelian: ${chalk.cyan(domainName)}`);

    // Sinkronisasi profilenya sebelum pembelian
    await syncUserProfile(session, display);

    const r = cfg.REGISTRANT;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (attempt > 1) {
            display.info(`Retry ke-${attempt}/${maxRetries}: menunggu 3 detik lalu coba lagi dengan token baru...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Solve Turnstile baru di setiap percobaan (token lama mungkin sudah basi)
        const turnstileToken = await solveTurnstile(display);

        // Buat client dengan x-turnstile-token header tambahan
        const client = axios.create({
            baseURL: cfg.DOMAIN_API_URL,
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'Origin': 'https://sumopod.com',
                'Referer': 'https://sumopod.com/',
                'User-Agent': cfg.USER_AGENT,
                'x-turnstile-token': turnstileToken,
                'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
            },
            timeout: 30000,
        });

        let data;
        try {
            const res = await client.post('/webhook/sumopod/domain/create', {
                domain: domainName,
                name: r.name,
                company: r.company,
                address: r.address,
                city: r.city,
                province: r.province,
                country: r.country,
                postal_code: r.postal_code,
                phone_country_code: r.phone_country_code,
                phone_number: r.phone_number,
                mobile_country_code: r.mobile_country_code,
                mobile_number: r.mobile_number,
            });
            data = res.data;
        } catch (httpErr) {
            // HTTP error (4xx/5xx) — jangan retry, langsung lempar
            throw httpErr;
        }

        // Sukses jika ada data dengan message: 'ok'
        if (data && (data.message === 'ok' || (data.message === undefined && data !== ''))) {
            return data;
        }

        // Jika ada message error yang jelas, langsung lempar (jangan retry)
        if (data && data.message !== undefined && data.message !== 'ok') {
            const errMsg = data.message || JSON.stringify(data);
            throw new Error(`API error: ${errMsg}`);
        }

        // Response kosong ("") → kemungkinan token basi atau server lag → retry
        if (attempt < maxRetries) {
            display.warn(`[!] Response kosong dari server (attempt ${attempt}/${maxRetries}), akan coba ulang...`);
        } else {
            throw new Error(`Gagal setelah ${maxRetries} percobaan: backend Sumopod menolak pembelian tanpa error jelas (kemungkinan limit promo "IDR 1" habis, atau API mereka bermasalah).`);
        }
    }
}


// ── Menu 3: Beli Domain (interaktif) ─────────────────────────
async function buyDomainMenu(session, display) {
    display.section('BELI DOMAIN');

    // 1. Input keyword atau nama domain
    const rawInput = readlineSync.question(
        '  Masukkan keyword domain yang dicari\n' +
        '  (contoh: streadku  atau  streadku.web.id)\n' +
        '  > ',
        { trim: true }
    ).trim();

    if (!rawInput) {
        display.error('Input tidak boleh kosong.');
        return;
    }

    // Ekstrak keyword (hapus ekstensi jika user input nama lengkap)
    const keyword = extractKeyword(rawInput);
    if (rawInput.includes('.')) {
        display.info(`Mendeteksi nama domain lengkap → menggunakan keyword: ${chalk.cyan(keyword)}`);
    }

    display.divider();

    // 2. Cek ketersediaan
    let result;
    try {
        result = await checkDomainAvailability(keyword, session.access_token, display);
    } catch (err) {
        const detail = err.response?.data
            ? JSON.stringify(err.response.data).slice(0, 300)
            : err.message;
        display.error('Gagal cek ketersediaan domain: ' + detail);
        return;
    }

    const { all, available } = result;

    if (!all || all.length === 0) {
        display.warn('Tidak ada hasil ditemukan untuk keyword tersebut.');
        return;
    }

    // 3. Tampilkan tabel
    display.domainTable(all);

    if (available.length === 0) {
        display.warn('Semua domain untuk keyword ini sudah tidak tersedia.');
        return;
    }

    // 4. Input pilihan (multi, pisahkan koma)
    display.info(`${chalk.green(available.length)} domain tersedia. Pilih lebih dari satu: pisahkan koma.`);
    const choiceStr = readlineSync.question(
        '  Pilih nomor (contoh: 1,3) atau nama domain langsung\n  > ',
        { trim: true }
    ).trim();

    if (!choiceStr) {
        display.warn('Tidak ada pilihan dimasukkan. Batal.');
        return;
    }

    // 5. Parse pilihan
    let selectedDomains = [];
    const parts = choiceStr.split(',').map(s => s.trim()).filter(Boolean);

    for (const part of parts) {
        if (/^\d+$/.test(part)) {
            const idx = parseInt(part, 10) - 1;
            if (idx < 0 || idx >= all.length) {
                display.warn(`Nomor ${part} tidak valid, dilewati.`);
                continue;
            }
            const dom = all[idx];
            if (!dom.is_available) {
                display.warn(`Domain ${dom.name} tidak tersedia, dilewati.`);
                continue;
            }
            selectedDomains.push(dom);
        } else {
            // Bisa input nama lengkap (mis: streadku.web.id) atau nama lainnya
            const search = part.toLowerCase();
            const dom = available.find(d => d.name.toLowerCase() === search);
            if (!dom) {
                display.warn(`Domain "${part}" tidak ditemukan atau tidak tersedia, dilewati.`);
                continue;
            }
            selectedDomains.push(dom);
        }
    }

    // Deduplikasi
    selectedDomains = [...new Map(selectedDomains.map(d => [d.name, d])).values()];

    if (selectedDomains.length === 0) {
        display.warn('Tidak ada domain valid yang dipilih. Batal.');
        return;
    }

    // 6. Konfirmasi
    display.divider();
    display.info('Domain yang akan dibeli:');
    selectedDomains.forEach((d, i) => {
        const price = d.price_in_idr === 1
            ? chalk.bold.green('IDR 1 (GRATIS!)')
            : `IDR ${d.price_in_idr.toLocaleString('id-ID')}`;
        display.step(`  ${i + 1}. ${d.name}`, price);
    });
    console.log();

    const confirm = readlineSync.keyInYNStrict('  Lanjutkan pembelian? ');
    if (!confirm) {
        display.warn('Pembelian dibatalkan.');
        return;
    }

    display.divider();

    // 7. Eksekusi pembelian
    for (const dom of selectedDomains) {
        try {
            const res = await purchaseDomain(dom.name, session, display);
            display.success(`Berhasil membeli: ${chalk.bold(dom.name)}`);
            if (res && typeof res === 'object') {
                const info = JSON.stringify(res, null, 2);
                if (info.length < 400) {
                    console.log(chalk.gray('     ' + info.replace(/\n/g, '\n     ')));
                }
            }
        } catch (err) {
            // Tampilkan info lengkap untuk debugging
            const httpStatus = err.response?.status;
            const respData = err.response?.data;

            let msg;
            if (err.message && !err.response) {
                // Error non-HTTP (network, dll)
                msg = err.message;
            } else if (respData && typeof respData === 'object') {
                const detail = respData.message || respData.error || JSON.stringify(respData);
                msg = detail
                    ? detail
                    : '(pesan kosong — kemungkinan: saldo tidak cukup, domain sudah ada, atau akun perlu verifikasi)';
                if (httpStatus) msg = `[HTTP ${httpStatus}] ${msg}`;
            } else {
                msg = err.message;
            }
            display.error(`Gagal membeli ${dom.name}: ${msg}`);
        }
    }
}

// ── Ambil daftar domain milik user ──────────────────────────
async function listDomains(accessToken, display) {
    const client = makeDomainClient(accessToken);
    const res = await client.post('/webhook/sumopod/domain/list');
    const data = res.data;
    if (!Array.isArray(data)) {
        throw new Error('Format respons domain list tidak dikenal: ' + JSON.stringify(data).slice(0, 200));
    }
    return data;
}

// ── Ambil nameserver domain berdasarkan ID ────────────────
async function listNameservers(domainId, accessToken, display) {
    const client = makeDomainClient(accessToken);
    const res = await client.post('/webhook/sumopod/domain/list-nameserver', { id: domainId });
    const data = res.data;
    if (!Array.isArray(data)) {
        throw new Error('Format respons nameserver tidak dikenal: ' + JSON.stringify(data).slice(0, 200));
    }
    return data;
}

// ── Update nameserver domain ──────────────────────────────
async function updateNameservers(domainId, nameservers, accessToken, display) {
    const client = makeDomainClient(accessToken);
    const res = await client.post('/webhook/sumopod/domain/update-nameserver', {
        id: domainId,
        nameservers,
    });
    return res.data;
}

// ── Menu 4: Ubah Nameserver ───────────────────────────────
async function editNameserverMenu(session, display) {
    display.section('UBAH NAMESERVER DOMAIN');

    // 1. Ambil daftar domain
    display.info('Mengambil daftar domain Anda...');
    let domains;
    try {
        domains = await listDomains(session.access_token, display);
    } catch (err) {
        const detail = err.response?.data
            ? JSON.stringify(err.response.data).slice(0, 300)
            : err.message;
        display.error('Gagal mengambil daftar domain: ' + detail);
        return;
    }

    if (!domains || domains.length === 0) {
        display.warn('Anda belum memiliki domain. Silakan beli domain terlebih dahulu (Menu 3).');
        return;
    }

    // 2. Tampilkan daftar domain
    console.log();
    console.log(chalk.bold.white('   No  Domain Name                    Status'));
    console.log(chalk.gray('   --  ----------------------------   ------'));
    domains.forEach((d, i) => {
        const idx = String(i + 1).padEnd(4);
        const name = d.domain_name.padEnd(30);
        const status = d.status || 'unknown';
        const statusColor = d.status === 'active' ? chalk.green(status) : chalk.yellow(status);
        console.log(chalk.cyan('   ' + idx) + chalk.white(name) + '  ' + statusColor);
    });
    console.log();

    // 3. Pilih domain
    const choiceRaw = readlineSync.question(
        '  Pilih nomor domain yang ingin diubah nameserver-nya\n  > ',
        { trim: true }
    ).trim();

    if (!choiceRaw || !/^\d+$/.test(choiceRaw)) {
        display.error('Pilihan tidak valid.');
        return;
    }

    const domainIdx = parseInt(choiceRaw, 10) - 1;
    if (domainIdx < 0 || domainIdx >= domains.length) {
        display.error('Nomor tidak valid.');
        return;
    }

    const selectedDomain = domains[domainIdx];
    display.divider();
    display.info('Domain dipilih: ' + chalk.cyan(selectedDomain.domain_name));

    // 4. Tampilkan nameserver saat ini
    display.info('Mengambil nameserver saat ini...');
    try {
        const currentNs = await listNameservers(selectedDomain.id, session.access_token, display);
        if (currentNs.length > 0) {
            display.info('Nameserver saat ini:');
            currentNs.forEach((ns, i) => {
                display.step('  NS' + (i + 1), ns);
            });
        } else {
            display.warn('Belum ada nameserver yang terdaftar.');
        }
    } catch (err) {
        display.warn('Tidak dapat mengambil nameserver saat ini: ' + err.message);
    }

    console.log();

    // 5. Input nameserver baru
    display.info('Masukkan nameserver baru (minimal 2, pisahkan Enter per NS)');
    display.info('Ketik nameserver lalu tekan Enter. Ketik "selesai" jika sudah.');
    console.log();

    const newNameservers = [];
    let nsCount = 1;
    while (true) {
        const ns = readlineSync.question(
            chalk.gray('  NS' + nsCount + ' > '),
            { trim: true }
        ).trim().toLowerCase();

        if (ns === 'selesai' || ns === '') {
            if (newNameservers.length < 2) {
                display.warn('Harus memasukkan minimal 2 nameserver. Lanjutkan...');
                continue;
            }
            break;
        }
        if (ns) {
            newNameservers.push(ns);
            nsCount++;
        }
    }

    // 6. Konfirmasi
    display.divider();
    display.info('Nameserver baru yang akan diset:');
    newNameservers.forEach((ns, i) => {
        display.step('  NS' + (i + 1), ns);
    });
    console.log();

    const confirm = readlineSync.keyInYNStrict(
        '  Update nameserver untuk ' + chalk.cyan(selectedDomain.domain_name) + '? '
    );
    if (!confirm) {
        display.warn('Dibatalkan.');
        return;
    }

    // 7. Eksekusi update
    display.divider();
    display.info('Mengupdate nameserver...');
    try {
        const result = await updateNameservers(selectedDomain.id, newNameservers, session.access_token, display);
        if (result && result.message === 'ok') {
            display.success('Nameserver berhasil diupdate untuk: ' + chalk.bold(selectedDomain.domain_name));
        } else {
            display.success('Nameserver berhasil diupdate!');
            if (result) {
                console.log(chalk.gray('     ' + JSON.stringify(result)));
            }
        }
        // Verifikasi
        await new Promise(r => setTimeout(r, 1000));
        const verified = await listNameservers(selectedDomain.id, session.access_token, display);
        display.info('Nameserver aktif sekarang:');
        verified.forEach((ns, i) => {
            display.step('  NS' + (i + 1), ns);
        });
    } catch (err) {
        const detail = err.response?.data
            ? JSON.stringify(err.response.data).slice(0, 300)
            : err.message;
        display.error('Gagal update nameserver: ' + detail);
    }
}

// ── Menu 5: Cek Domain & Nameserver ──────────────────────
async function checkDomainNsMenu(session, display) {
    display.section('CEK DOMAIN & NAMESERVER');

    // 1. Ambil daftar domain
    display.info('Mengambil daftar domain Anda...');
    let domains;
    try {
        domains = await listDomains(session.access_token, display);
    } catch (err) {
        const detail = err.response?.data
            ? JSON.stringify(err.response.data).slice(0, 300)
            : err.message;
        display.error('Gagal mengambil daftar domain: ' + detail);
        return;
    }

    if (!domains || domains.length === 0) {
        display.warn('Anda belum memiliki domain. Silakan beli domain terlebih dahulu (Menu 3).');
        return;
    }

    // 2. Tampilkan daftar domain
    console.log();
    console.log(chalk.bold.white('   No  Domain Name                    Status      Expired'));
    console.log(chalk.gray('   --  ----------------------------   --------    ----------'));
    domains.forEach((d, i) => {
        const idx = String(i + 1).padEnd(4);
        const name = d.domain_name.padEnd(30);
        const status = (d.status || 'unknown').padEnd(12);
        const expiry = chalk.gray(d.expired_at || '-');
        const statusColor = d.status === 'active' ? chalk.green(status) : chalk.yellow(status);
        console.log(chalk.cyan('   ' + idx) + chalk.white(name) + '  ' + statusColor + expiry);
    });
    console.log();

    // 3. Pilih domain (atau semua)
    display.info('Ketik nomor domain untuk cek NS, atau ketik "semua" untuk cek semua domain.');
    const choiceRaw = readlineSync.question(
        '  Pilih (contoh: 1  atau  semua)\n  > ',
        { trim: true }
    ).trim().toLowerCase();

    let targetDomains = [];
    if (choiceRaw === 'semua') {
        targetDomains = domains;
    } else if (/^\d+$/.test(choiceRaw)) {
        const idx = parseInt(choiceRaw, 10) - 1;
        if (idx < 0 || idx >= domains.length) {
            display.error('Nomor tidak valid.');
            return;
        }
        targetDomains = [domains[idx]];
    } else {
        display.error('Pilihan tidak valid.');
        return;
    }

    // 4. Cek NS untuk setiap domain
    display.divider();
    for (const domain of targetDomains) {
        console.log();
        console.log(chalk.bold.white('  ▶ ' + domain.domain_name));
        display.step('    Status', domain.status || '-');
        display.step('    Expired', domain.expired_at || '-');
        display.step('    Register Price', 'IDR ' + (domain.register_price || 0).toLocaleString('id-ID'));

        try {
            const nameservers = await listNameservers(domain.id, session.access_token, display);
            if (nameservers.length === 0) {
                display.warn('    Belum ada nameserver terdaftar.');
            } else {
                display.info('    Nameserver:');
                nameservers.forEach((ns, i) => {
                    display.step('      NS' + (i + 1), ns);
                });
            }
        } catch (err) {
            display.error('    Gagal cek NS: ' + err.message);
        }
    }
    console.log();
    display.success('Selesai mengecek ' + targetDomains.length + ' domain.');
}

// ── Menu 6: Tampilkan Daftar Domain ──────────────────────
async function showDomainListMenu(session, display) {
    display.section('DAFTAR DOMAIN SAYA');

    display.info('Mengambil daftar domain dari server...');
    let domains;
    try {
        domains = await listDomains(session.access_token, display);
    } catch (err) {
        const detail = err.response?.data
            ? JSON.stringify(err.response.data).slice(0, 300)
            : err.message;
        display.error('Gagal mengambil daftar domain: ' + detail);
        return;
    }

    if (!domains || domains.length === 0) {
        display.warn('Anda belum memiliki domain.');
        display.info('Silakan beli domain terlebih dahulu menggunakan Menu 3.');
        return;
    }

    console.log();
    console.log(chalk.bold.white('   No  Domain Name                    Status      Expired        Harga Beli'));
    console.log(chalk.gray('   --  ----------------------------   --------    ----------     ----------'));

    domains.forEach((d, i) => {
        const idx = String(i + 1).padEnd(4);
        const name = (d.domain_name || '-').padEnd(30);
        const status = (d.status || '-').padEnd(12);
        const expiry = (d.expired_at || '-').padEnd(15);
        const price = d.register_price === 1
            ? chalk.bold.green('IDR 1')
            : chalk.white('IDR ' + (d.register_price || 0).toLocaleString('id-ID'));
        const statusColor = d.status === 'active' ? chalk.green(status) : chalk.yellow(status);

        console.log(
            chalk.cyan('   ' + idx) +
            chalk.white(name) + '  ' +
            statusColor +
            chalk.gray(expiry) +
            price
        );
    });

    console.log();
    display.success('Total domain: ' + chalk.bold.cyan(domains.length) + ' domain ditemukan.');
}

module.exports = {
    buyDomainMenu,
    checkDomainAvailability,
    purchaseDomain,
    listDomains,
    editNameserverMenu,
    checkDomainNsMenu,
    showDomainListMenu,
};
