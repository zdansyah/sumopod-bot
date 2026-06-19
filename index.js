// ============================================================
//  SUMOPOD BOT - MAIN ENTRY POINT
// ============================================================

'use strict';

const readlineSync = require('readline-sync');
const chalk = require('chalk');

const display = require('./src/display');
const { login, checkSession } = require('./src/auth');
const { loadSession, hasSession } = require('./src/session');
const { buyDomainMenu, editNameserverMenu, checkDomainNsMenu, showDomainListMenu } = require('./src/domain');

// ── Main Loop ────────────────────────────────────────────────
async function main() {
    while (true) {
        display.banner();
        display.menu();

        const choice = readlineSync.question(chalk.white('  Pilih menu → '), {
            limit: ['0', '1', '2', '3', '4', '5', '6'],
            limitMessage: chalk.red('  Pilihan tidak valid. Masukkan 0-6: '),
        });

        console.log();

        if (choice === '0') {
            display.info('Keluar dari bot. Sampai jumpa!');
            console.log();
            process.exit(0);
        }

        // ── Menu 1: Ambil Session Login ───────────────────────────
        if (choice === '1') {
            try {
                await login(display);
            } catch (err) {
                display.error('Error tidak terduga: ' + err.message);
            }
        }

        // ── Menu 2: Cek Status Session ────────────────────────────
        else if (choice === '2') {
            display.section('CEK STATUS SESSION');

            if (!hasSession()) {
                display.warn('Tidak ada session tersimpan.');
                display.info('Silakan gunakan Menu 1 untuk login terlebih dahulu.');
            } else {
                const session = loadSession();
                display.info('Session ditemukan, memvalidasi ke server...');

                try {
                    const user = await checkSession(session, display);

                    if (user) {
                        display.success('Session AKTIF!');
                        display.step('Email', user.email || session.user?.email);
                        display.step('User ID', user.id || session.user?.id);
                        display.step('Terakhir Login', user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleString('id-ID')
                            : '-');
                        display.step('Token Expires', session.expires_at
                            ? new Date(session.expires_at * 1000).toLocaleString('id-ID')
                            : '-');
                    } else {
                        display.error('Session TIDAK AKTIF / sudah kadaluarsa.');
                        display.info('Silakan login ulang menggunakan Menu 1.');
                    }
                } catch (err) {
                    display.error('Gagal memverifikasi session: ' + err.message);
                }
            }
        }

        // ── Menu 3: Beli Domain ────────────────────────────────────
        else if (choice === '3') {
            if (!hasSession()) {
                display.warn('Anda belum login.');
                display.info('Silakan gunakan Menu 1 untuk login terlebih dahulu.');
            } else {
                const session = loadSession();
                try {
                    await buyDomainMenu(session, display);
                } catch (err) {
                    display.error('Error tidak terduga: ' + err.message);
                }
            }
        }

        // ── Menu 4: Ubah Nameserver ────────────────────────────────
        else if (choice === '4') {
            if (!hasSession()) {
                display.warn('Anda belum login.');
                display.info('Silakan gunakan Menu 1 untuk login terlebih dahulu.');
            } else {
                const session = loadSession();
                try {
                    await editNameserverMenu(session, display);
                } catch (err) {
                    display.error('Error tidak terduga: ' + err.message);
                }
            }
        }

        // ── Menu 5: Cek Domain & Nameserver ───────────────────────
        else if (choice === '5') {
            if (!hasSession()) {
                display.warn('Anda belum login.');
                display.info('Silakan gunakan Menu 1 untuk login terlebih dahulu.');
            } else {
                const session = loadSession();
                try {
                    await checkDomainNsMenu(session, display);
                } catch (err) {
                    display.error('Error tidak terduga: ' + err.message);
                }
            }
        }

        // ── Menu 6: Tampilkan Domain List ───────────────────────
        else if (choice === '6') {
            if (!hasSession()) {
                display.warn('Anda belum login.');
                display.info('Silakan gunakan Menu 1 untuk login terlebih dahulu.');
            } else {
                const session = loadSession();
                try {
                    await showDomainListMenu(session, display);
                } catch (err) {
                    display.error('Error tidak terduga: ' + err.message);
                }
            }
        }

        // Pause sebelum kembali ke menu
        console.log();
        readlineSync.question(
            chalk.gray('  Tekan Enter untuk kembali ke menu...'),
            { hideEchoBack: true, mask: '' }
        );
    }
}

// ── Start ─────────────────────────────────────────────────────
main().catch(err => {
    console.error(chalk.red('\n[FATAL] ' + err.message));
    process.exit(1);
});
