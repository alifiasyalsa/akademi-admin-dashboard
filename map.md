# Technical Architecture & Project Map: QuranBest Akademi Admin Dashboard

Dokumentasi navigasi teknis ini memetakan arsitektur, alur data, integrasi API, dan keterkaitan antarfile kode agar developer maupun AI agent dapat langsung menemukan titik perubahan yang tepat tanpa harus menelusuri ulang seluruh codebase dari awal.

---

## 1. Ringkasan Arsitektur & Prinsip Desain

Proyek ini adalah **Single Page Application (SPA)** berbasis **React 18** dan **Vite 5**, dengan styling **Tailwind CSS 3** (menggunakan design token Material/Stitch kustom di `tailwind.config.js`).

### Paradigma & Pola Arsitektur
1. **Unidirectional Data Flow**: Seluruh state induk (filter aktif, data hasil fetch, status autentikasi) dikelola di custom hook `useWorkbenchData.js` dan dialirkan ke `App.jsx`, kemudian diteruskan ke subkomponen presentasional (`GlobalFilterBar`, `SummaryGrid`, `WorkbenchTable`, `RegistrasiView`).
2. **Aggregator & ViewModel Normalizer**: Data mentah dari backend CMS tidak langsung dipakai di komponen UI. Komponen UI mengonsumsi objek terpadu (`viewModel`) yang dibangun oleh:
   - `src/services/workbenchService.js`: Agregasi presensi mingguan, komitmen infaq, dan presensi 8 pekan untuk tab Monitoring.
   - `src/services/registrasiService.js`: Pemetaan baris santri pendaftar status `wait` dan ringkasan metrik untuk tab Registrasi.
3. **Smart In-Memory Caching & Parallel Paging**:
   - `src/api/cmsEndpoints.js` mengimplementasikan cache in-memory TTL 5 menit (`cached`) dengan *in-flight deduplication* (mencegah request ganda identik).
   - Menggunakan *Two-Phase Parallel Paging* (`fetchAllPages`) untuk komitmen batch penuh dan *Server-Side Datatable Query* (`limit`, `offset`, `query`, `status`) untuk registrasi.
4. **Decoupled Tabs (Monitoring vs Registrasi)**:
   - Monitoring hanya memuat data presensi mingguan dan komitmen kelas aktif. Beban registrasi telah dipisahkan.
   - Tab Registrasi bekerja secara independen dengan pagination server-side murni (10/20/50/100 baris per halaman) dan pencarian ter-debounce.
   - Badge tab Registrasi di `App.jsx` disinkronkan di background via endpoint super-ringan (`limit: 1`) tanpa memblokir tab Monitoring.
5. **Graceful Fallback / Dual Mode**: Jika token autentikasi belum ada di `.env.local` atau `localStorage`, aplikasi otomatis fallback ke `src/data/stitchMock.js` dan `src/data/registrationMock.js` (Mode Prototipe).
6. **Resilient Single-Flight Auth**: Fetcher HTTP kustom di `src/api/client.js` menangani penambahan Bearer Token secara otomatis, deteksi error 401, antrean promise single-flight refresh token (`performTokenRefresh`), dan mekanisme auto-logout ketika sesi habis.

---

## 2. Struktur Direktori Proyek

```
/
├── .env.example                     # Template variabel lingkungan (API base URL & token)
├── .env.local                       # File konfigurasi lokal aktif (termasuk VITE_ACCESS_TOKEN)
├── DESIGN.md                        # Desain token dan sistem tema
├── index.html                       # Entry point HTML (memuat Google Fonts & Material Symbols)
├── package.json                     # Definisi dependensi & skrip Vite
├── tailwind.config.js               # Konfigurasi custom theme token (colors, radius, typography)
├── vite.config.js                   # Konfigurasi bundler Vite
├── src/
│   ├── main.jsx                     # Titik mula React (ReactDOM.createRoot)
│   ├── App.jsx                      # Root container, layout orchestration, sinkronisasi badge, & handler WA/Toast
│   ├── index.css                    # Directive Tailwind & styling scrollbar
│   ├── api/
│   │   ├── client.js                # Custom fetch wrapper, auto-auth, 401 interceptor, refresh queue
│   │   ├── cmsEndpoints.js          # In-memory caching, parallel paging, & pemanggil API CMS QuranBest
│   │   └── tokenManager.js          # Pengelola persistensi token (localStorage & env) + pub/sub event
│   ├── components/
│   │   ├── MaterialIcon.jsx         # Helper render ikon Google Material Symbols Outlined
│   │   ├── feedback/
│   │   │   └── Toast.jsx            # Komponen notifikasi mengambang saat aksi WA / Sinkronisasi
│   │   ├── filters/
│   │   │   ├── GlobalFilterBar.jsx  # Bar seleksi Batch, Kelas, dan Pekan
│   │   │   └── SearchableSelect.jsx # Dropdown interaktif dengan input pencarian real-time
│   │   ├── guidance/
│   │   │   └── AdminGuidance.jsx    # Card informasi SOP penagihan/follow-up H+1 review
│   │   ├── layout/
│   │   │   ├── AppHeader.jsx        # Header atas: Logo, status sinkronisasi, & profil admin
│   │   │   └── AppFooter.jsx        # Footer bawah: Hak cipta, status server, & versi
│   │   ├── navigation/
│   │   │   └── MainNavigationTabs.jsx # Navigasi 2 tab utama (Monitoring vs Registrasi) + counter real-time
│   │   ├── summary/
│   │   │   ├── SummaryGrid.jsx      # Grid ringkasan metrik tab Monitoring (Presensi & Infaq)
│   │   │   ├── AttendanceCard.jsx   # Metrik tingkat kehadiran & bar perbandingan hadir/absen
│   │   │   └── InfaqCard.jsx        # Metrik capaian infaq, nominal tertunggak, & progress bar
│   │   ├── registrasi/
│   │   │   ├── RegistrasiView.jsx   # Kontainer utama tab Registrasi (server pagination, debounce search)
│   │   │   ├── RegistrasiSummaryGrid.jsx # Grid ringkasan metrik Registrasi (2 kartu)
│   │   │   ├── UnselectedClassCard.jsx   # Metrik santri wait belum menentukan kelas
│   │   │   ├── NeedFollowupCard.jsx      # Metrik santri mendesak perlu follow-up (>3 hari)
│   │   │   ├── RegistrasiTable.jsx  # Tabel pendaftar dengan server-side pagination windowed & per-page selector
│   │   │   ├── RegistrasiRow.jsx    # Baris data santri pendaftar & trigger modal reminder
│   │   │   ├── RegistrasiGuidance.jsx # Informasi SOP reminder pendaftaran santri
│   │   │   └── ReminderConfirmModal.jsx # Modal dialog verifikasi pencatatan pengingat WA
│   │   └── table/
│   │       ├── WorkbenchTable.jsx   # Kontainer tabel santri monitoring & windowed pagination
│   │       ├── TableToolbar.jsx     # Filter tab kategori monitoring, search, refresh, & ekspor
│   │       └── MemberRow.jsx        # Baris santri individual (identitas, badge presensi/infaq, tombol WA)
│   ├── data/
│   │   ├── getWorkbenchData.js      # Utility accessor (legacy wrapper ke stitchMock)
│   │   ├── stitchMock.js            # Mock data referensi UI monitoring (fallback prototipe)
│   │   └── registrationMock.js      # Mock data referensi UI registrasi (fallback prototipe)
│   ├── hooks/
│   │   └── useWorkbenchData.js      # Custom hook inti pengelola state monitoring & batch class loader
│   └── services/
│       ├── formatters.js            # Format mata uang IDR, nomor HP (lokal/internasional), & inisial
│       ├── waService.js             # Generator teks template pesan WhatsApp & helper wa.me
│       ├── workbenchService.js      # Engine normalisasi & agregasi tab Monitoring
│       └── registrasiService.js     # Engine normalisasi & view model tab Registrasi
```

---

## 3. Routing & Navigasi

- **Pola Routing**: Aplikasi berupa Single Page Dashboard dengan tab navigasi tingkat atas (`MainNavigationTabs.jsx`):
  1. **Tab 1: Monitoring Kelas & Infaq** (`activeTab === 'monitoring'`)
     - Fokus pada absensi pekan aktif, riwayat 8 pekan, dan status komitmen infaq per kelas.
  2. **Tab 2: Registrasi** (`activeTab === 'registrasi'`)
     - Fokus pada santri berstatus `wait` (belum memilih kelas), pengingat WA, dan follow-up > 3 hari.
     - Membawa badge counter dinamis yang tersinkronisasi langsung dengan total santri `wait` dari CMS.
- **Navigasi State**:
  - **Hierarki Seleksi Filter Monitoring**: `Batch` → `Kelas` → `Pekan`.
  - **Paginasi**:
    - Monitoring: Client-side pagination dari roster kelas aktif.
    - Registrasi: Server-side pagination langsung ke endpoint CMS datatable (`limit`, `offset`, `query`, `status=wait`).

---

## 4. Pola Pengelolaan State, Autentikasi & Penanganan Error

### 4.1. Aliran Autentikasi & Token (`src/api/tokenManager.js` & `src/api/client.js`)
- **Penyimpanan Token**: `localStorage` (kunci: `qb_akademi_access_token`, `qb_akademi_refresh_token`, `qb_akademi_token_expiry`) dengan fallback ke `import.meta.env.VITE_ACCESS_TOKEN` / `VITE_REFRESH_TOKEN`.
- **Event Pub/Sub**: `tokenManager.subscribe()` memberi tahu komponen (`useWorkbenchData.js`) jika terjadi peristiwa `TOKEN_UPDATED` atau `SESSION_EXPIRED`.
- **Single-Flight Refresh Queue**: Ketika terjadi respon HTTP `401 Unauthorized`, `apiClient` menahan request lain yang masuk ke antrean `refreshQueue` selagi fungsi `performTokenRefresh` mencoba memperbarui token via `/auth/refresh` atau `/refresh`. Jika berhasil, semua request di antrean diulang dengan token baru. Jika gagal hingga batas maksimal (`MAX_CONSECUTIVE_REFRESH_ATTEMPTS = 2`), token dihapus dan status sesi ditandai kadaluwarsa (`isExpired: true`).

### 4.2. Penanganan Error & Fallback
- Jika API gagal diakses atau token belum terpasang, `useWorkbenchData.js` tidak melempar error tak tertangani ke layar, melainkan memasang `setViewModel(stitchMock)` agar interface tetap tampil utuh untuk keperluan demonstrasi atau pengujian UI.
- Notifikasi kegagalan atau kadaluwarsa token ditampilkan di badge status header (`AppHeader.jsx`) berupa teks `"Sesi Berakhir (401)"` atau `"Mode Prototipe"`.

---

## 5. Pemetaan Fitur Utama (Deep Dive)

---

### FITUR 1: Autentikasi & Konektivitas API CMS
- **Deskripsi**: Menangani pembacaan token JWT, request header `Authorization: Bearer <token>`, interceptor 401, auto-refresh token, dan indikator status live pada header aplikasi.
- **Lokasi Kode**:
  - `src/api/tokenManager.js`
  - `src/api/client.js`
  - `src/components/layout/AppHeader.jsx`
- **Entry Point**: Inisialisasi hook `useWorkbenchData.js` memanggil `tokenManager.hasValidAuth()` dan berlangganan ke `tokenManager.subscribe()`.
- **Alur Data**:
  1. Token dibaca dari `localStorage` atau variabel lingkungan `.env.local`.
  2. `apiClient` menyematkan header `Authorization: Bearer <token>` pada setiap panggilan HTTP ke backend.
  3. `AppHeader` menerima objek status `authStatus` untuk menampilkan badge status:
     - `Live CMS Terhubung` (Hijau/Biru pulse) jika token valid.
     - `Sesi Berakhir (401)` jika token expired.
     - `Mode Prototipe` jika tidak ada token.
- **API dan Backend**:
  - Endpoint refresh resmi: `POST /v1/admin/refresh-token` (fallback: `/v1/auth/refresh`, `/v1/refresh`).
- **Relasi Antarfile**: `client.js` mengimpor `tokenManager.js`; `useWorkbenchData.js` dan `App.jsx` membaca `tokenManager`.
- **Panduan Perubahan**:
  - Jika format response login/refresh CMS berubah: periksa `performTokenRefresh()` di `src/api/client.js:72-86`.
  - Jika ingin menambah mekanisme input token manual via UI modal: gunakan method `tokenManager.setTokens({ accessToken, refreshToken })`.
- **Dampak Perubahan**: Berdampak pada seluruh pemanggilan endpoint CMS di aplikasi saat token access kadaluwarsa (401).
- **Status Endpoint**: Endpoint refresh token aktif menggunakan `https://plus-api.quranbest.com/v1/admin/refresh-token` dengan payload JSON `{ refresh_token, refreshToken }` serta header Authorization Bearer token.

---

### FITUR 2: Filter Global & Seleksi Hierarkis (Batch → Kelas → Pekan)
- **Deskripsi**: Bar kontrol pemilihan Batch, Kelas binaan, dan nomor Pekan berjalan, yang secara otomatis memicu pemuatan ulang data terkait.
- **Lokasi Kode**:
  - `src/components/filters/GlobalFilterBar.jsx`
  - `src/components/filters/SearchableSelect.jsx`
  - `src/hooks/useWorkbenchData.js`
  - `src/api/cmsEndpoints.js`
- **Entry Point**: Komponen `GlobalFilterBar` dirender di `src/App.jsx:119` dan menerima callback `onSelectionChange`.
- **Alur Data**:
  1. Saat aplikasi mount: `useWorkbenchData` memanggil `cmsApi.getBatches()`.
  2. Batch aktif (flag `is_active === true`) otomatis dipilih.
  3. Perubahan Batch memicu `cmsApi.getClasses({ batch })`, lalu kelas pertama otomatis dipilih.
  4. Perubahan Kelas atau Pekan memicu `fetchWorkbenchDetail()` untuk mengambil data spesifik kelas tersebut.
  5. UI dropdown di-render oleh `SearchableSelect` dengan fitur pencarian teks real-time di sisi client.
- **API dan Backend**:
  - `GET /v1/batches` (Daftar semua batch).
  - `GET /v1/classes/datatable?batch=&limit=100` (Daftar kelas dalam batch).
- **Relasi Antarfile**:
  - `GlobalFilterBar.jsx` → `SearchableSelect.jsx`.
  - `useWorkbenchData.js` mendistribusikan `filters` dan `selectedFilters` ke `GlobalFilterBar.jsx`.
- **Panduan Perubahan**:
  - Jika ingin menambah filter baru (misalnya filter gender `ikhwan/akhwat` atau tipe kelas):
    1. Tambahkan state dan callback di `useWorkbenchData.js`.
    2. Tambahkan komponen dropdown di `GlobalFilterBar.jsx`.
    3. Teruskan parameter filter ke fungsi fetcher di `cmsApi.getClasses()` atau query agregasi.
- **Dampak Perubahan**: Mengubah filter ini memicu re-fetch seluruh data santri, tabel, dan 3 kartu summary.
- **Ketidakpastian**: Batasan parameter `limit=100` pada `getClasses` mungkin tidak mengambil semua kelas jika satu batch memiliki lebih dari 100 kelas.

---

### FITUR 3: Presensi Mingguan & Histori Dot Kehadiran Santri
- **Deskripsi**: Menghitung rasio kehadiran kelas pada pekan berjalan, merender status kehadiran santri (Hadir / Tidak Hadir), dan menampilkan riwayat indikator titik (dots) kehadiran.
- **Lokasi Kode**:
  - `src/api/cmsEndpoints.js` (method `getWeeklyAttendance`)
  - `src/services/workbenchService.js` (bagian normalisasi presensi baris 101–146, dan summary card 287–307)
  - `src/components/summary/AttendanceCard.jsx`
  - `src/components/table/MemberRow.jsx` (fungsi `PresenceBadge` & render dot presensi)
  - `src/components/table/WorkbenchTable.jsx` (header kolom tabel `Presensi Pekan X`)
- **Entry Point**:
  - UI Metrik: `AttendanceCard.jsx`
  - UI Tabel: Kolom kedua di `MemberRow.jsx`
- **Alur Data**:
  1. `useWorkbenchData.js` memanggil `cmsApi.getWeeklyAttendance({ batch_id, class_id, week_num })`.
  2. Backend mengembalikan daftar santri yang hadir/absen pada pekan tersebut.
  3. `workbenchService.js` mengiterasi setiap item:
     - Jika `item.attend` bernilai `true`: dihitung sebagai `countHadir`, badge `Hadir` (biru).
     - Jika `false` / tidak hadir: dihitung sebagai `countTidakHadir`, badge `Tidak Hadir` (amber).
  4. Objek `history` dibuat:
     - Berisi `title`, `score`, dan array status `dots: ["hadir", ...]`.
  5. `AttendanceCard` menghitung persentase: `(countHadir / totalStudents) * 100`.
- **API dan Backend**:
  - `GET /v1/classes/attendance/weekly?batch_id=&class_id=&week_num=&limit=500&offset=0&data_type=admin` (Daftar santri & presensi pekan aktif).
  - `GET /v1/classes/{class_id}/attendance` (Detail lengkap 8 pertemuan kelas dengan `attendance_list`, mendeteksi hadir per `member_list` vs pekan belum berjalan jika `member_list === null`).
- **Relasi Antarfile**:
  - `cmsEndpoints.js` (`getClassAttendance`) → `useWorkbenchData.js` → `workbenchService.js` → `AttendanceCard.jsx`, `WorkbenchTable.jsx`, & `MemberRow.jsx`.
- **Implementasi Dot Presensi 8 Pekan**:
  - Di `cmsEndpoints.js`: method `getClassAttendance(classId)`.
  - Di `useWorkbenchData.js`: dipanggil paralel saat pemilihan kelas dan hasilnya dioper ke `buildWorkbenchViewModel`.
  - Di `workbenchService.js`: mengolah array `attendanceMeetings`. Untuk setiap pertemuan:
    - Jika `member_list === null`: status `"belumBerjalan"` (dot abu-abu `bg-slate-200 border border-slate-300`).
    - Jika `member_list.includes(memberId)`: status `"hadir"` (dot biru `bg-[#0284c7]`).
    - Jika memberId tidak ada di `member_list`: status `"tidakHadir"` (dot amber `bg-amber-400`).
    - Menghitung `score` rasio (misal `2/3` kehadiran dari pekan yang sudah berjalan).
  - Di `MemberRow.jsx`: merender loop 8 dot dengan tooltip interaktif per pekan dan score kehadiran.

---

### FITUR 4: Monitoring Finansial & Infaq Komitmen
- **Deskripsi**: Menghitung kewajiban infaq santri berdasarkan komitmen pekanan dikalikan pekan berjalan, mencocokkan dengan data pembayaran valid yang tercatat di backend, dan menentukan status lunas/tercecer/advance.
- **Lokasi Kode**:
  - `src/api/cmsEndpoints.js` (method `getMemberCommitments`)
  - `src/services/workbenchService.js` (baris 58–71 index komitmen, baris 148–180 kalkulasi santri, dan baris 309–323 summary infaq)
  - `src/components/summary/InfaqCard.jsx`
  - `src/components/table/MemberRow.jsx` (kolom Kewajiban & Valid Masuk)
- **Entry Point**:
  - Metrik: `InfaqCard.jsx`
  - Kolom Tabel: Kolom ke-3 & ke-4 di `MemberRow.jsx`
- **Alur Data**:
  1. `cmsApi.getMemberCommitments({ batch, fetchAll: true })` mengambil seluruh data komitmen pada batch tersebut (dengan mekanisme auto-pagination `while offset < total`).
  2. `workbenchService.js` membuat Hash Map index pencocokan 3 lapis: `commitmentsByMemberId`, `commitmentsByPhone`, dan `commitmentsByName`.
  3. Santri dicocokkan dengan data komitmen:
     - `targetObligation = weeklyCommitment * currentWeek`
     - `validInfaqAmount = commitmentData.infaq_amount`
  4. Klasifikasi status:
     - `paid`: Lunas atau Bebas Biaya (jika komitmen 0).
     - `advance`: Bayar lebih dari target pekan ini (`Advance +X Pk`).
     - `overdue`: Bayar kurang dari target (`Kurang Rp X (Y Pk)`).
     - `none`: Belum setor sama sekali.
- **API dan Backend**:
  - `GET /v1/members/commitments?batch=&draw=1&limit=1000&offset=0&query=`
- **Relasi Antarfile**:
  - Menggunakan formatter mata uang `formatRupiah` dan nomor telepon `normalizePhone` dari `src/services/formatters.js`.
- **Panduan Perubahan**:
  - Jika logika perhitungan toleransi infaq berubah: ubah baris 161–180 di `src/services/workbenchService.js`.
  - Jika format nominal atau mata uang berubah: sesuaikan di `src/services/formatters.js`.
- **Dampak Perubahan**: Mempengaruhi kartu `InfaqCard`, tab filter `overdue`, klasifikasi `attention`, dan tombol aksi penagihan WhatsApp.
- **Ketidakpastian**: Data komitmen di-fetch pada level batch (`batch`), bukan per kelas. Hal ini dilakukan karena beberapa santri terdaftar di kelas berbeda namun terikat komitmen batch yang sama.

---

### FITUR 5: Registrasi Santri & Reminder Pemilihan Kelas (Server-Side Datatable)
- **Deskripsi**: Melacak santri yang status pendaftarannya masih menunggu verifikasi/pemilihan kelas (`status: "wait"`) dan memerlukan pengingat atau follow-up pemilihan kelas via WhatsApp. Data diambil secara murni via server-side datatable pagination (`limit`, `offset`, `query`, `status`) tanpa filter manual di frontend.
- **Lokasi Kode**:
  - `src/components/registrasi/RegistrasiView.jsx` (kontainer utama tab, state pagination, debounced search 350ms, data-fetching)
  - `src/components/registrasi/RegistrasiTable.jsx` & `RegistrasiRow.jsx` (tabel dengan windowed pagination & per-page selector)
  - `src/components/registrasi/RegistrasiSummaryGrid.jsx` (`UnselectedClassCard.jsx`, `NeedFollowupCard.jsx`)
  - `src/services/registrasiService.js` (normalisasi pendaftar dari format CMS `registers` ke format `participants`, ringkasan metrik)
  - `src/components/navigation/MainNavigationTabs.jsx` & `src/App.jsx` (badge counter real-time terisolasi via background preflight)
  - `src/data/registrationMock.js` (fallback mock offline)
- **Entry Point**: Tab utama *"Registrasi"* pada `MainNavigationTabs.jsx`.
- **Alur Data**:
  1. Tab Monitoring tidak memuat data registrasi (decoupled untuk menjamin kecepatan load awal).
  2. Sinkronisasi Badge: `App.jsx` memanggil `cmsApi.getClassRegisters({ batch, limit: 1, offset: 0, status: 'wait' })` secara ringan di background. Angka badge counter tab Registrasi langsung mengambil `response.recordsFiltered`.
  3. Saat membuka tab Registrasi: `RegistrasiView.jsx` memanggil `cmsApi.getClassRegisters` dengan parameter:
     `{ batch, limit, offset, query, status: 'wait' }` secara paralel dengan riwayat Supabase `reminderTrackingService.fetchBatchReminders(batch, 'registrasi')`.
  4. Backend CMS memfilter santri berstatus `wait` secara server-side dan mengembalikan `{ recordsFiltered, recordsTotal, data }`.
  5. `registrasiService.js` menormalisasi pendaftar dan menghitung status pengingat real-time: Belum Diingatkan, Diingatkan, dan Follow-up Mendesak (> 3 hari).
  6. **Aksi 1-Klik Instan**: Klik tombol pengingat langsung membuka WhatsApp resmi (`wa.me`), mencatat event pengingat ke database Supabase, memunculkan Toast, dan memperbarui status tombol baris secara reaktif tanpa modal konfirmasi (persis seperti alur di tab Monitoring).

- **API dan Backend**:
  - `GET /v1/classes/registers/datatable?batch=&class_id=&class_type_id=&draw=&form_type_id=&gender=&limit=10&offset=0&query=&status=wait`
  - Struktur Response Resmi:
    ```json
    {
      "code": 200,
      "message": "success",
      "data": {
        "draw": 1,
        "recordsTotal": 1587,
        "recordsFiltered": 25,
        "data": [ ... ]
      }
    }
    ```


---

### FITUR 6: Tabel Santri Interaktif (Tab Filter, Pencarian, & Paginasi)
- **Deskripsi**: Tabel data utama yang menyajikan daftar santri dengan pemfilteran multi-kategori, pencarian fuzzy lokal (nama dan nomor telepon), dan pagination dinamis.
- **Lokasi Kode**:
  - `src/components/table/WorkbenchTable.jsx`
  - `src/components/table/TableToolbar.jsx`
  - `src/components/table/MemberRow.jsx`
- **Entry Point**: `WorkbenchTable` dipanggil di `src/App.jsx:129`.
- **Alur Data**:
  1. `data.table.students` diterima dari `useWorkbenchData`.
  2. `matchesFilters()` menyaring data berdasarkan tab aktif (`activeTab`) dan string pencarian (`searchQuery`).
  3. `useMemo` menghitung santri yang lolos filter (`visibleStudents`), total halaman (`totalPages`), dan memotong data per halaman (`pagedStudents`).
  4. Komponen `MemberRow` merender setiap baris santri.
- **Relasi Antarfile**:
  - `WorkbenchTable.jsx` → `TableToolbar.jsx` (tab & input pencarian).
  - `WorkbenchTable.jsx` → `MemberRow.jsx` (isi baris per santri).
- **Panduan Perubahan**:
  - **Mengubah jumlah opsi baris per halaman**: ubah `<select>` di `src/components/table/WorkbenchTable.jsx:127-130`.
  - **Menambah kolom baru di tabel**:
    1. Tambahkan `<th>` di `WorkbenchTable.jsx:78-85`.
    2. Tambahkan `<td>` yang bersesuaian di `MemberRow.jsx:136-165`.
    3. Sesuaikan `colSpan` baris kosong di `WorkbenchTable.jsx:90`.
- **Dampak Perubahan**: Perubahan lebar kolom dapat mempengaruhi responsivitas horizontal di layar tablet/mobile.
- **Ketidakpastian**: Tombol "Ekspor Rekap CSV" di toolbar (`TableToolbar.jsx:53`) saat ini baru berupa placeholder UI tanpa handler ekspor aktif.

---

### FITUR 7: Tindakan WhatsApp Mandiri & Follow-Up Generator
- **Deskripsi**: Otomasi pembuatan pesan WhatsApp resmi QuranBest yang disesuaikan dengan kebutuhan santri (tagihan infaq tertunggak atau ajakan memilih kelas lanjutan), lalu membuka tautan `wa.me` langsung.
- **Lokasi Kode**:
  - `src/services/waService.js`
  - `src/services/formatters.js`
  - `src/App.jsx` (fungsi `handleSendWa` baris 74–110)
  - `src/components/feedback/Toast.jsx`
  - `src/components/table/MemberRow.jsx` (komponen `ActionCell`)
- **Entry Point**: Tombol aksi di kolom terakhir `MemberRow.jsx` memicu `onSendWa(student, action)`.
- **Alur Data**:
  1. `workbenchService.js` mengevaluasi status santri dan menghasilkan array `actions`:
     - Jika menunggak infaq DAN belum pilih kelas: menghasilkan dua tombol (`WA Infaq` & `WA Kelas`).
     - Jika hanya menunggak infaq: tombol `Kirim WA Infaq` (primer biru).
     - Jika hanya belum pilih kelas: tombol `Kirim WA Pilih Kelas` (indigo).
     - Jika tuntas: label `Tuntas` (hijau centang, tidak dapat diklik).
  2. Saat tombol diklik, `handleSendWa` di `App.jsx` dipanggil.
  3. `buildWaMessage()` di `waService.js` merakit template pesan dengan nama santri, batch aktif, dan link terkait.
  4. `openWhatsAppDirectly()` memformat nomor HP internasional (misal `0812...` menjadi `62812...`) dan membuka URL `https://wa.me/{phone}?text=...` pada tab baru.
  5. `Toast.jsx` menampilkan konfirmasi pop-up selama 3 detik.
- **API dan Backend**: Tidak menembak API backend; menggunakan protokol URL browser publik `https://wa.me/`.
- **Relasi Antarfile**: `MemberRow.jsx` → `App.jsx` → `waService.js` → `formatters.js` → `Toast.jsx`.
- **Panduan Perubahan**:
  - **Mengubah redaksi pesan WhatsApp**: edit fungsi `buildWaMessage` di `src/services/waService.js:7-48`.
  - **Mengubah nomor kontak admin penanggung jawab**: ubah nomor `wa.me/628976408712` di `src/services/waService.js:31, 47`.
- **Dampak Perubahan**: Perubahan template langsung berdampak pada seluruh pesan yang dibuka admin.
- **Ketidakpastian**: Jika nomor HP santri di database CMS tidak memiliki digit yang valid, toast peringatan error akan muncul dan `window.open` dibatalkan.

---

### FITUR 8: Sistem Pencatatan & Tracking Pengingat (Reminder Lifecycle & Action Tracking)
- **Deskripsi**: Transformasi dari sekadar dashboard analitik pasif menjadi **Sistem Manajemen Aksi & Pencatatan Interaksi Admin-ke-Santri**. Sistem ini melacak siapa yang perlu diingatkan, siapa yang sudah diingatkan, siapa yang stagnan > 3 hari tanpa aksi perbaikan, dan siapa yang sudah tuntas di seluruh 3 domain operasional.
- **3 Domain Pengingat**:
  1. **Absensi / Presensi**: Santri yang tidak hadir pada pekan aktif atau memiliki kehadiran rendah (< 50%).
  2. **Infaq Komitmen**: Santri dengan status `overdue` (menunggak infaq > 0 atau terlambat beberapa pekan).
  3. **Pilih Kelas / Registrasi**: Santri dengan status pendaftaran `wait` yang belum menentukan kelas pilihan.
- **4 Siklus Status Pengingat (Reminder Lifecycle)**:
  - **1. Perlu Diingatkan / Belum Diingatkan (`unreminded`)**: Santri memenuhi kriteria perhatian (absen, nunggak infaq, atau registrasi `wait`), tetapi belum ada catatan pengingat yang terkirim. Tombol aksi berstatus aktif primer (misal: *"Kirim WA"*).
  - **2. Sudah Diingatkan (`reminded`)**: Admin telah mengirimkan pesan pengingat WA. Sistem mencatat:
    - `lastRemindedAt`: Waktu ISO pengingat terakhir dikirim.
    - `reminderCount`: Jumlah kali pengingat dikirim.
    - `status`: Ditandai sebagai sudah diingatkan.
    - Tampilan tombol berubah menjadi informatif (misal: *"Diingatkan 1 hr lalu"*) dengan opsi follow-up lanjutan jika dibutuhkan.
  - **3. Perlu Follow-up / Stagnan > 3 Hari (`followup_needed`)**: Santri sudah diingatkan, namun setelah 3 hari (72 jam) belum ada aksi penyelesaian dari santri (belum hadir pekan berikutnya, belum membayar tunggakan infaq, atau status pendaftaran masih `wait`).
    - Tombol aksi bertransformasi menjadi status peringatan prioritas (Amber/Orange: *"Follow-up Mendesak"*).
    - Metrik diakumulasikan ke kartu metrik perhatian (misal: `NeedFollowupCard`).
  - **4. Tuntas / Selesai (`resolved`)**: Kewajiban atau kondisi telah diselesaikan oleh santri (kehadiran tercatat, infaq lunas/bebas, atau pendaftaran disetujui / status bukan `wait`).
    - Tombol otomatis menjadi status non-aktif hijau *"Tuntas"* (tanda centang).
- **Arsitektur Penyimpanan & Integrasi**:
  - **Penyimpanan Lokal / Client State**: Menggunakan `localStorage` dengan skema terpadu (kunci: `qb_reminder_logs_v1`) yang mencatat log per santri dan domain (`presensi`, `infaq`, `registrasi`).
    ```json
    {
      "trackingKey": "registrasi:14947:batch_38",
      "memberId": 14947,
      "domain": "registrasi",
      "batchId": 38,
      "classId": null,
      "lastRemindedAt": "2026-10-18T10:00:00.000Z",
      "reminderCount": 1,
      "status": "reminded",
      "history": [
        { "timestamp": "2026-10-18T10:00:00.000Z", "channel": "whatsapp", "action": "pilih_kelas" }
      ]
    }
    ```
  - **Integrasi Backend CMS (Roadmap)**: Blueprint endpoint API untuk sinkronisasi riwayat follow-up multi-admin terpusat di CMS.
- **Lokasi Kode Terkait**:
  - `src/services/waService.js` (pembuat teks template & pemicu wa.me)
  - `src/components/registrasi/ReminderConfirmModal.jsx` (dialog verifikasi pencatatan tanggal & waktu pengingat)
  - `src/components/table/MemberRow.jsx` (tombol aksi monitoring presensi & infaq)
  - `src/components/registrasi/RegistrasiRow.jsx` (tombol aksi registrasi kelas)
  - `src/components/registrasi/NeedFollowupCard.jsx` (kartu metrik tindak lanjut > 3 hari)

---

## 6. Lokasi Aturan Bisnis Penting (Business Rules Reference)

| Aturan Bisnis | Deskripsi Logika | Lokasi Implementasi |
| :--- | :--- | :--- |
| **Deduplikasi Santri** | Mencegah santri yang sama muncul ganda dengan memeriksa `memberId` → `normalizedPhone` → `normalizedName`. | `src/services/workbenchService.js:89-114` |
| **Pencocokan Multi-kunci** | Mencocokkan data presensi dengan komitmen & registrasi via fallback: ID Member, nomor HP, lalu nama. | `src/services/workbenchService.js:116-128` |
| **Kalkulasi Kewajiban Infaq** | `targetObligation = weeklyCommitment * currentWeek`. Jika valid >= target, santri dianggap Lunas/Advance. | `src/services/workbenchService.js:150-180` |
| **Penyaringan Registrasi `status: wait`** | Data santri registrasi difilter langsung di backend CMS dengan parameter `status=wait` (bukan manual di frontend). | `src/api/cmsEndpoints.js:189-220`, `src/services/registrasiService.js:7-35` |
| **Ambang Batas Follow-up 3 Hari** | Santri yang telah diingatkan namun tidak ada progres selama > 3 hari (72 jam) dikategorikan `followup_needed`. | `src/services/registrasiService.js:27-33`, `src/components/registrasi/NeedFollowupCard.jsx` |
| **Pengkategorian Tab Monitoring** | Santri dikelompokkan ke kategori `overdue`, `unselected-class`, `attention`, dan `completed`. | `src/services/workbenchService.js:214-224` |
| **Otomasi Tombol WA** | Menentukan apakah santri perlu tombol tunggal infaq, tombol tunggal kelas, tombol ganda, atau status tuntas. | `src/services/workbenchService.js:225-264` |
| **Format Internasional WA** | Mengubah awalan `0` atau non-62 menjadi format standar internasional `62...`. | `src/services/formatters.js:26-35` |

---

## 7. Indeks Cepat: "Jika Ingin Mengubah X, Buka File Y"

| Kebutuhan Perubahan / Fitur | File Utama yang Perlu Diperiksa | File Pendukung / Terkait |
| :--- | :--- | :--- |
| **Mengubah / Menambah Endpoint API CMS** | `src/api/cmsEndpoints.js` | `src/api/client.js` |
| **Mengubah Token Autentikasi / Refresh Flow** | `src/api/tokenManager.js`, `src/api/client.js` | `.env.local`, `src/hooks/useWorkbenchData.js` |
| **Mengubah Pemanggilan Data / State Induk** | `src/hooks/useWorkbenchData.js` | `src/App.jsx` |
| **Mengubah Rumus Infaq / Presensi / Promoted** | `src/services/workbenchService.js` | `src/services/formatters.js` |
| **Mengubah Paging / Query Registrasi (`wait`)** | `src/components/registrasi/RegistrasiView.jsx` | `src/services/registrasiService.js`, `src/api/cmsEndpoints.js` |
| **Mengubah Dot Presensi / Riwayat Pertemuan** | `src/services/workbenchService.js`, `src/components/table/MemberRow.jsx` | `src/api/cmsEndpoints.js`, `src/components/summary/AttendanceCard.jsx` |
| **Mengubah Sistem Tracking / Log Pengingat** | `src/components/registrasi/ReminderConfirmModal.jsx` | `src/services/waService.js`, `src/components/registrasi/RegistrasiRow.jsx` |
| **Mengubah Teks Template WhatsApp** | `src/services/waService.js` | `src/App.jsx` |
| **Mengubah Dropdown / Filter Bar** | `src/components/filters/GlobalFilterBar.jsx` | `src/components/filters/SearchableSelect.jsx` |
| **Mengubah Tampilan Kartu Summary** | `src/components/summary/AttendanceCard.jsx`, `InfaqCard.jsx`, `PromotedCard.jsx` | `src/components/summary/SummaryGrid.jsx` |
| **Mengubah Kolom Tabel / Paginasi Monitoring** | `src/components/table/WorkbenchTable.jsx` | `src/components/table/MemberRow.jsx`, `TableToolbar.jsx` |
| **Mengubah Kolom Tabel / Paginasi Registrasi** | `src/components/registrasi/RegistrasiTable.jsx` | `src/components/registrasi/RegistrasiRow.jsx` |
| **Mengubah Desain Warna / Theme Token** | `tailwind.config.js`, `src/index.css` | `DESIGN.md` |
| **Mengubah Data Dummy / Fallback Mock** | `src/data/stitchMock.js`, `src/data/registrationMock.js` | `src/data/getWorkbenchData.js` |

---

## 8. Catatan Ketidakpastian & Hal yang Perlu Diverifikasi Saat Pengerjaan

1. **Endpoint Spesifik `/v1/classes/{classId}/attendance`**:
   - *Status*: **Sudah Diimplementasikan dan Terintegrasi**. Method `cmsApi.getClassAttendance(classId)` aktif memanggil endpoint ini, diproses di `workbenchService.js` untuk menghasilkan 8 dot presensi per santri, dan dirender di kolom `Historis (8 Pk)` pada `MemberRow.jsx`.
2. **Server-Side Filtering Registrasi `status: wait`**:
   - *Status*: **Sudah Terintegrasi Penuh**. Endpoint `/v1/classes/registers/datatable` dipanggil dengan parameter `status=wait`, mengembalikan total dan filtered yang akurat tanpa perlu komputasi manual di browser.
3. **Pencatatan Log Pengingat Multi-Admin**:
   - *Status*: Saat ini baru mencakup pencatatan lokal di tab Registrasi melalui modal konfirmasi `ReminderConfirmModal.jsx`. Roadmap berikutnya adalah menyatukan sistem pencatatan ini ke tab Monitoring (Presensi & Infaq) serta menghubungkannya ke API log backend jika endpoint CMS tersedia.
4. **Fitur Ekspor CSV**:
   - *Status*: **Sudah Diimplementasikan Penuh**. Menggunakan `src/services/csvExportService.js` dengan encoding UTF-8 BOM dan sanitasi nomor HP. Tombol ekspor aktif di toolbar tab Monitoring (`TableToolbar.jsx`) dan tab Registrasi (`RegistrasiTable.jsx`).
5. **Maksimal Limit Data Kelas**:
   - *Status*: `cmsApi.getClasses` saat ini memakai `limit: 100`. Jika suatu batch memiliki lebih dari 100 kelas, perlu ditambahkan mekanisme auto-pagination serupa dengan yang ada di `getMemberCommitments`.

