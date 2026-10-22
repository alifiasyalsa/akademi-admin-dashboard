# 🗺️ Technical Architecture & Project Context Map: QuranBest Akademi Admin Dashboard

Dokumentasi ini adalah **Single Source of Truth (SSOT)** arsitektur, konteks bisnis, status fitur riil, dan navigasi file untuk developer maupun AI agent di masa depan. 

---

## 1. Konteks & Latar Belakang Proyek

### Apa Itu Akademi Admin Dashboard?
Aplikasi ini adalah **Operational Workbench & CRM** berbasis web untuk tim Admin program Akademi QuranBest (pembelajaran Al-Qur'an & Tahsin). Dashboard ini dirancang untuk mempermudah admin memantau ratusan hingga ribuan santri per batch secara cepat dan mengeksekusi follow-up via WhatsApp dalam satu klik.

### Dua Pilar / Domain Utama Aplikasi:
1. **Tab Monitoring (Peserta Kelas Aktif)**:
   - Memantau presensi santri pada sesi pekan berjalan (Pekan 1 sampai Pekan 8/num_of_meetings).
   - Memantau kepatuhan komitmen infaq santri (target akumulasi = `komitmen_pekanan * pekan_berjalan`).
   - Memberikan tombol aksi cepat untuk follow-up WA (tunggakan infaq atau ketidakhadiran presensi).
   - Melacak riwayat dot kehadiran 8 pekan secara visual (`MemberRow.jsx`).
2. **Tab Registrasi (Santri Baru & Lanjutan)**:
   - Mengelola santri pendaftar batch baru yang berstatus `wait` (sudah daftar tapi belum memilih kelas/jadwal), `pending` (menunggu pembayaran), atau `not_confirm` (melewati tenggat konfirmasi).
   - Mengirimkan pengingat pemilihan kelas / pembayaran via WhatsApp dengan template yang dapat diedit langsung di modal UI.

### Integrasi Eksternal:
1. **Backend CMS QuranBest (`https://plus-api.quranbest.com/v1`)**:
   - Sumber data utama: master batch, tipe kelas, jadwal kelas, santri komitmen, presensi pekanan, dan registrasi santri.
   - Komunikasi via Bearer token admin yang disimpan di `localStorage` / `.env.local`.
2. **Supabase Database (Backend Pelengkap)**:
   - **Tabel `reminder_logs`**: Menyimpan histori pengingat WA santri (siapa yang sudah diingatkan, kapan terakhir diingatkan, berapa kali pengingat terkirim) sehingga multi-admin tidak melakukan follow-up ganda.
   - **Tabel `message_templates`**: Menyimpan template pesan WhatsApp kustom yang bisa diatur per kategori (registrasi / monitoring) langsung dari modal dashboard, dengan fallback ke `DEFAULT_TEMPLATES`.
3. **WhatsApp Web / App (`wa.me`)**:
   - Integrasi langsung membuka tautan `https://wa.me/62...` dengan teks template yang sudah terisi nama santri, rekomendasi kelas, atau rincian infaq.

---

## 2. Tech Stack & Arsitektur Sistem

* **Frontend Framework**: React 18 (`react`, `react-dom`)
* **Bundler & Tooling**: Vite 5 (`vite`, `@vitejs/plugin-react`)
* **Styling**: Tailwind CSS 3 (dengan custom design tokens di `tailwind.config.js`) + Google Material Symbols Outlined
* **Hosting & CDN**: **Vercel** (Production deployment dengan SPA rewrite di `vercel.json`)
* **CI/CD Pipeline**: GitHub Actions (`.github/workflows/deploy.yml`) + Vercel Git Integration (Auto deploy saat push ke branch `main`)
* **Arsitektur State**:
  - Unidirectional Data Flow: `useWorkbenchData.js` mengelola state filter batch/kelas/pekan, memanggil API, dan mengalirkan `viewModel` ke komponen presentasional.
  - Server-side pagination & in-memory caching di `src/api/cmsEndpoints.js` (TTL 5 menit) untuk performa cepat tanpa overload server CMS.
  - Fallback aman: Jika token CMS kosong/invalid, aplikasi tetap berjalan dalam **Mode Prototipe** menggunakan data mock di `src/data/stitchMock.js` dan `src/data/registrationMock.js`.

---

## 3. Struktur Direktori Proyek (Kondisi Aktual)

```
/
├── .env.example                     # Template variabel lingkungan (API URL, Supabase keys)
├── .env.local                       # Kredensial aktif lokal (DIABAIKAN OLEH GIT)
├── .gitignore                       # Menjaga .env.local, node_modules, dan dist tidak ter-push
├── .github/workflows/deploy.yml     # Konfigurasi CI/CD GitHub Actions & Vercel
├── vercel.json                      # Rule SPA routing rewrite (mencegah 404 saat refresh)
├── DESIGN.md                        # Panduan warna, tipografi, dan tema Stitch/Material
├── PANDUAN_UNTUK_KAK_DAI.md         # Panduan non-teknikal langkah demi langkah untuk admin/developer pemula
├── map.md                           # Peta teknis & arsitektur proyek (file ini)
├── index.html                       # Entry point HTML (memuat font Plus Jakarta Sans & Material Symbols)
├── package.json                     # Daftar dependensi & skrip Vite (dev, build, preview)
├── tailwind.config.js               # Konfigurasi token warna, font, dan spacing Tailwind
├── vite.config.js                   # Konfigurasi bundler Vite
└── src/
    ├── main.jsx                     # Entry React (ReactDOM.createRoot)
    ├── App.jsx                      # Root container, layout orchestration, sinkronisasi badge tab, modal handler
    ├── index.css                    # Tailwind directives & global styling scrollbar
    ├── api/
    │   ├── client.js                # Fetch wrapper: auto inject token, 401 interceptor, refresh queue
    │   ├── cmsEndpoints.js          # In-memory caching, parallel paging, pemanggil API CMS QuranBest
    │   └── tokenManager.js          # Pengelola persistensi token (localStorage & env) + pub/sub event
    ├── data/
    │   ├── registrationMock.js      # Mock data pendaftar & ringkasan untuk tab Registrasi
    │   └── stitchMock.js            # Mock data presensi & infaq untuk tab Monitoring
    ├── hooks/
    │   └── useWorkbenchData.js      # Hook sentral state: fetch batch, kelas, presensi, agregasi viewModel
    ├── services/
    │   ├── formatters.js            # Utility format rupiah, normalisasi nomor HP, inisial nama, tanggal
    │   ├── registrasiService.js     # Agregasi & filter view model untuk tab Registrasi
    │   ├── reminderTrackingService.js # Koneksi Supabase REST untuk tabel reminder_logs
    │   ├── templateService.js       # Koneksi Supabase REST untuk tabel message_templates & template interpolation
    │   ├── waService.js             # Pembuat teks WhatsApp & fungsi pembuka tautan wa.me
    │   └── workbenchService.js      # Logika komputasi presensi 8 pekan, infaq komitmen, deduplikasi santri
    └── components/
        ├── MaterialIcon.jsx         # Render ikon Google Material Symbols
        ├── feedback/
        │   └── Toast.jsx            # Notifikasi pop-up feedback (kirim WA, sinkronisasi data)
        ├── filters/
        │   ├── GlobalFilterBar.jsx  # Toolbar filter Batch, Kelas, dan Pekan
        │   └── SearchableSelect.jsx # Custom dropdown interaktif dengan fitur pencarian real-time
        ├── guidance/
        │   └── AdminGuidance.jsx    # Card informasi panduan SOP penagihan/follow-up admin
        ├── layout/
        │   ├── AppHeader.jsx        # Header atas: Logo, status sinkronisasi/auth, profil admin
        │   └── AppFooter.jsx        # Footer bawah: Copyright, status koneksi
        ├── navigation/
        │   └── MainNavigationTabs.jsx # Navigasi 2 tab utama (Monitoring vs Registrasi) + badge count
        ├── summary/
        │   ├── AttendanceCard.jsx   # Kartu metrik kehadiran santri pekan ini
        │   ├── InfaqCard.jsx        # Kartu metrik capaian infaq komitmen pekan ini
        │   ├── PromotedCard.jsx     # Kartu metrik santri yang belum memilih kelas
        │   └── SummaryGrid.jsx      # Grid pembungkus 3 kartu ringkasan di tab Monitoring
        ├── table/
        │   ├── MemberRow.jsx        # Baris santri di tabel monitoring (dot presensi 8 pekan, status infaq, tombol WA)
        │   ├── TablePagination.jsx  # Kontrol paginasi tabel
        │   ├── TableToolbar.jsx     # Filter status tab (Semua, Menunggak, Belum Kelas, dll) & kolom search
        │   └── WorkbenchTable.jsx   # Container tabel data santri tab Monitoring
        └── registrasi/
            ├── MessageTemplateModal.jsx           # Modal pengeditan template pesan WA (Supabase backed)
            ├── NeedFollowupCard.jsx               # Kartu ringkasan santri butuh follow-up (> 3 hari)
            ├── RegistrasiGuidance.jsx             # Card panduan SOP registrasi
            ├── RegistrasiRow.jsx                  # Baris santri registrasi dengan tombol aksi & tracking info
            ├── RegistrasiStatusDistributionChart.jsx # Visualisasi distribusi status pendaftar
            ├── RegistrasiSummaryGrid.jsx          # Grid kartu metrik registrasi
            ├── RegistrasiTable.jsx                # Tabel pendaftar santri status wait/pending/not_confirm
            ├── RegistrasiView.jsx                 # Kontainer utama tab Registrasi (fetch, filter, state)
            ├── ReminderConfirmModal.jsx           # Modal konfirmasi pencatatan pengingat ke Supabase
            └── UnselectedClassCard.jsx            # Kartu ringkasan santri belum pilih kelas
```

---

## 4. Status Riil Fitur (Fakta Kode Saat Ini)

Agar AI tidak berasumsi salah, berikut status aktual setiap fitur:

| Fitur | Status Riil | Penjelasan Teknis |
| :--- | :---: | :--- |
| **Integrasi CMS Live** | ✅ **Aktif** | Berjalan via `cmsEndpoints.js`. Mengambil batch, kelas, kehadiran mingguan, kehadiran 8 pekan, komitmen, dan registrasi. |
| **Dot Presensi 8 Pekan** | ✅ **Aktif** | Mengonsumsi endpoint `/v1/classes/{classId}/attendance`, dipetakan menjadi dot visual di `MemberRow.jsx`. |
| **Tracking Pengingat Supabase** | ✅ **Aktif** | Menggunakan REST API Supabase ke tabel `reminder_logs` melalui `reminderTrackingService.js`. |
| **Kustomisasi Template WA** | ✅ **Aktif** | Modal `MessageTemplateModal.jsx` terhubung ke tabel `message_templates` di Supabase dengan fallback lokal. |
| **Routing & Hosting Vercel** | ✅ **Aktif** | Sukses di-deploy ke Vercel dengan SPA fallback di `vercel.json`. |
| **Ekspor CSV** | ❌ **BELUM ADA** | *Belum diimplementasikan sama sekali*. Tidak ada file `csvExportService.js` dan belum ada tombol export di `TableToolbar.jsx` maupun `RegistrasiTable.jsx`. |
| **Validasi Nomor HP WA** | ⚠️ **BELUM AMAN** | `formatWaPhone` di `formatters.js` belum memvalidasi apakah nomor valid/kosong. Jika nomor kosong, sistem tetap membuka `wa.me/62` dan status tombol tetap berubah menjadi terkirim (*false success*). |
| **Mobile Responsive** | ⚠️ **DESKTOP-FIRST** | Tampilan saat ini dirancang optimal untuk layar laptop/desktop. Penyesuaian ke mobile membutuhkan desain antarmuka baru (misal via Stitch) terutama untuk penyajian data tabel agar nyaman dibaca di layar HP. |

---

## 5. Indeks Navigasi Cepat: "Jika Mau Mengubah X, Buka File Y"

| Kebutuhan Perubahan | File Utama | File Terkait / Pendukung |
| :--- | :--- | :--- |
| **Mengubah / Menambah Endpoint API CMS** | `src/api/cmsEndpoints.js` | `src/api/client.js` |
| **Mengubah Token Autentikasi / Refresh Flow** | `src/api/tokenManager.js` | `src/api/client.js`, `.env.local` |
| **Mengubah Filter Dropdown (Batch, Kelas, Pekan)** | `src/components/filters/GlobalFilterBar.jsx` | `src/hooks/useWorkbenchData.js`, `SearchableSelect.jsx` |
| **Mengubah Logika & Rumus Infaq / Presensi** | `src/services/workbenchService.js` | `src/services/formatters.js` |
| **Mengubah Baris Tabel Monitoring & Tombol WA** | `src/components/table/MemberRow.jsx` | `src/services/waService.js`, `WorkbenchTable.jsx` |
| **Mengubah Baris Tabel Registrasi & Konfirmasi WA**| `src/components/registrasi/RegistrasiRow.jsx` | `ReminderConfirmModal.jsx`, `RegistrasiTable.jsx` |
| **Mengubah Template Teks WhatsApp Bawaan** | `src/services/templateService.js` | `src/services/waService.js`, `App.jsx` |
| **Mengubah Tabel Supabase / Tracking Pengingat** | `src/services/reminderTrackingService.js` | `src/services/templateService.js` |
| **Memperbaiki Validasi Nomor HP WA** | `src/services/formatters.js`, `src/services/waService.js` | `MemberRow.jsx`, `RegistrasiRow.jsx` |
| **Mengubah Tema Warna, Font, atau Design Token** | `tailwind.config.js`, `src/index.css` | `DESIGN.md` |

