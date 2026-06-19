# 🤖 Sumopod Domain Bot

> **Automation CLI bot untuk manajemen domain di platform [Sumopod](https://sumopod.com) — login, beli domain, ubah nameserver, dan cek status domain, semuanya dari terminal.**

---

## ✨ Fitur

| Menu | Deskripsi |
|------|-----------|
| `1` Ambil Session Login | Login ke akun Sumopod via OTP email + bypass Cloudflare Turnstile otomatis |
| `2` Cek Status Session | Validasi apakah session aktif masih dapat digunakan |
| `3` Beli Domain | Proses pembelian domain baru dengan data registrant dari `.env` |
| `4` Ubah Nameserver | Ganti nameserver domain yang sudah dimiliki |
| `5` Cek Domain & NS | Cek detail domain beserta nameserver yang terpasang |
| `6` Tampilkan Domain List | Lihat seluruh daftar domain yang terdaftar di akun |

---

## 📋 Persyaratan

- **Node.js** `>= 18.0.0`
- **npm** `>= 8.0.0`
- Akun **[Sumopod](https://sumopod.com)** yang aktif
- API Key **[2Captcha](https://2captcha.com)** (untuk bypass Cloudflare Turnstile)

---

## 🚀 Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/zdansyah/sumopod-bot.git
cd sumopod-bot
```

### 2. Install Dependensi

```bash
npm install
```

### 3. Konfigurasi `.env`

Salin file contoh dan isi sesuai data Anda:

```bash
cp .env.example .env
```

Lalu edit file `.env`:

```env
# Email login akun Sumopod
LOGIN_EMAIL=email@kamu.com

# API Key dari 2Captcha (https://2captcha.com)
CAPTCHA_API_KEY=your_2captcha_api_key_here

# Data Registrant Domain
REGISTRANT_NAME=Nama Lengkap
REGISTRANT_COMPANY=Nama Perusahaan
REGISTRANT_ADDRESS=Alamat Lengkap
REGISTRANT_CITY=Kota
REGISTRANT_PROVINCE=Provinsi
REGISTRANT_COUNTRY=Indonesia
REGISTRANT_POSTAL_CODE=12345
REGISTRANT_PHONE_CC=+62
REGISTRANT_PHONE=8xxxxxxxxx
REGISTRANT_MOBILE_CC=+62
REGISTRANT_MOBILE=
```

### 4. Jalankan Bot

```bash
npm start
```

Atau untuk Windows, jalankan:

```
run.bat
```

---

## 📁 Struktur Proyek

```
sumopod-bot/
├── src/
│   ├── auth.js        # Login, OTP, dan manajemen session
│   ├── captcha.js     # Integrasi 2Captcha untuk Cloudflare Turnstile
│   ├── config.js      # Konfigurasi global (baca dari .env)
│   ├── display.js     # Tampilan CLI (banner, menu, log)
│   ├── domain.js      # Semua operasi domain (beli, NS, cek, list)
│   └── session.js     # Simpan & muat file session.json
├── index.js           # Entry point utama
├── .env               # Konfigurasi sensitif (JANGAN di-commit)
├── .env.example       # Template konfigurasi
├── package.json
└── run.bat            # Shortcut jalankan bot (Windows)
```

---

## ⚙️ Cara Kerja

```
Login via Email OTP
        │
        ▼
Cloudflare Turnstile → 2Captcha API → Token
        │
        ▼
Session Tersimpan di session.json
        │
        ▼
Pilih Menu → Beli Domain / Ubah NS / Cek Domain / List Domain
```

1. **Login** — Bot meminta OTP yang dikirim ke email Sumopod. Cloudflare Turnstile di-bypass otomatis menggunakan 2Captcha.
2. **Session** — Setelah login berhasil, session disimpan secara lokal di `session.json`.
3. **Operasi Domain** — Semua operasi menggunakan session yang tersimpan sehingga tidak perlu login ulang setiap saat.

---

## 🔒 Keamanan

> [!WARNING]
> File `.env` dan `session.json` mengandung data sensitif. Pastikan file ini **TIDAK** pernah di-commit ke repository.

Tambahkan ke `.gitignore`:

```gitignore
.env
session.json
node_modules/
```

---

## 📦 Dependensi

| Package | Versi | Fungsi |
|---------|-------|--------|
| `axios` | ^1.7.9 | HTTP client untuk request API |
| `chalk` | ^4.1.2 | Styling output terminal berwarna |
| `dotenv` | ^17.4.2 | Membaca konfigurasi dari `.env` |
| `readline-sync` | ^1.4.10 | Input interaktif dari terminal |

---

## 🤝 Kontribusi

Kontribusi sangat disambut! Silakan:

1. Fork repository ini
2. Buat branch fitur: `git checkout -b feat/nama-fitur`
3. Commit perubahan: `git commit -m "feat: tambah fitur X"`
4. Push ke branch: `git push origin feat/nama-fitur`
5. Buat Pull Request

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **MIT License** — lihat file [LICENSE](LICENSE) untuk detail lengkap.

---

## 👤 Author

**Zdansyah**

- GitHub: [@zdansyah](https://github.com/zdansyah)

---

<p align="center">
  Made with ❤️ by <strong>Zdansyah</strong>
</p>
