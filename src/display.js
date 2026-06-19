// ============================================================
//  SUMOPOD BOT - DISPLAY UTILITIES
// ============================================================

const chalk = require('chalk');

const display = {
    // ── Banner ──────────────────────────────────────────────
    banner() {
        // Clear screen + scroll buffer (Windows-compatible)
        process.stdout.write('\x1Bc');
        console.log(chalk.bold.cyan('  STREAD STORE DOMAIN AUTOMATION BOT'));
        console.log(chalk.gray('  Powered by 2Captcha & Supabase'));
        console.log();
    },

    // ── Menu ────────────────────────────────────────────────
    menu() {
        console.log(chalk.bold('  MAIN MENU'));
        console.log(chalk.cyan('  1 ') + chalk.white('Ambil Session Login'));
        console.log(chalk.cyan('  2 ') + chalk.white('Cek Status Session'));
        console.log(chalk.cyan('  3 ') + chalk.white('Beli Domain'));
        console.log(chalk.cyan('  4 ') + chalk.white('Ubah Nameserver Domain'));
        console.log(chalk.cyan('  5 ') + chalk.white('Cek Domain & Nameserver'));
        console.log(chalk.cyan('  6 ') + chalk.white('Tampilkan Domain List'));
        console.log(chalk.cyan('  0 ') + chalk.white('Keluar'));
        console.log();
    },

    // ── Status Messages ─────────────────────────────────────
    info(msg) {
        console.log(chalk.white('  [·] ') + chalk.gray(msg));
    },

    success(msg) {
        console.log(chalk.green('  [✓] ') + chalk.white(msg));
    },

    error(msg) {
        console.log(chalk.red('  [✗] ') + chalk.white(msg));
    },

    warn(msg) {
        console.log(chalk.yellow('  [!] ') + chalk.white(msg));
    },

    step(label, value) {
        console.log(chalk.gray('  [→] ') + chalk.white(label + ': ') + chalk.cyan(value));
    },

    divider() {
        console.log(chalk.gray('  ─────────────────────────────────────'));
    },

    // ── Domain Table ─────────────────────────────────────────
    domainTable(domains) {
        console.log();
        console.log(chalk.bold.white('   No  Domain Name                    Harga Beli      Harga Renew'));
        console.log(chalk.gray('   --  ----------------------------   -------------   -----------'));

        domains.forEach((d, i) => {
            const idx = String(i + 1).padEnd(4);
            const name = d.name.padEnd(30);
            const price = d.price_in_idr === 1
                ? chalk.bold.green('IDR 1'.padEnd(15))
                : chalk.white(('IDR ' + d.price_in_idr.toLocaleString('id-ID')).padEnd(15));
            const renew = chalk.gray('IDR ' + d.renew_price_in_idr.toLocaleString('id-ID'));
            const avail = d.is_available ? '' : chalk.red('  [TAKEN]');

            console.log(
                chalk.cyan('   ' + idx) +
                chalk.white(name) + '  ' +
                price +
                renew + avail
            );
        });

        console.log();
    },

    // ── Section Header ───────────────────────────────────────
    section(title) {
        console.log();
        console.log(chalk.white('  ╔══ ') + chalk.bold.white(title) + chalk.white(' ══'));
        console.log();
    },
};

module.exports = display;
