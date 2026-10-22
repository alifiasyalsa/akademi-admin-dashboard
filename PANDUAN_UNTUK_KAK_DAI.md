# 🚀 Panduan Santai Buat Kak Dai: Cara Ngembangin Website Ini Bareng AI

Halo Kak Dai! 👋  
Website ini adalah **Admin Dashboard Akademi QuranBest**. Tenang aja walau Kak Dai bukan orang IT, project ini sudah disiapin biar Kak Dai bisa **ngembangin fitur baru dengan mudah cukup dibantu sama AI (Cursor / Windsurf / ChatGPT / Claude)**.

---

## 📌 Yang Perlu Kak Dai Tahu Dulu

1. **Website ini hosting-nya di mana?**  
   Website ini live di **Vercel** dan pencatatan riwayat pengingatnya pakai **Supabase**.
2. **Ada kendala server / database?**  
   Kalau ada error aneh soal server, database Supabase, token API, atau Vercel, **langsung hubungi aku aja ya**, biar Kak Dai fokus ke perubahan tampilan & fitur websitenya aja!
3. **Ada CI/CD Otomatis:**  
   Kak Dai **nggak perlu pusing mikirin cara upload ke server**. Setiap kali Kak Dai selesai ngedit kode dan kirim ke GitHub (`git push`), websitenya bakal **otomatis ter-update sendiri dalam 1 menit**!

---

## 🛠️ Langkah Awal: Cara Pasang di Laptop Kak Dai (Sekali Aja)

### 1. Download Tools Dasar
Pastikan di laptop Kak Dai sudah terpasang:
* **Node.js** (download versi LTS di [nodejs.org](https://nodejs.org/))
* **Git** (download di [git-scm.com](https://git-scm.com/))
* Code Editor AI favorit Kak Dai (misal **VS Code**, **Cursor**, atau sejenisnya).

### 2. Ambil Kodenya (Clone)
Buka terminal / Command Prompt di laptop, lalu ketik:
```bash
git clone https://github.com/alifiasyalsa/akademi-admin-dashboard.git
```
Lalu buka folder project tersebut di editor AI Kak Dai.

### 3. Minta File Kunci Rahasia (`.env.local`)
Sebelum dijalankan, **minta isi file `.env.local` ke aku ya**.  
Nanti buat file baru bernama `.env.local` di folder paling luar project ini, lalu paste isinya ke situ.

### 4. Nyalakan di Laptop (Run Local)
Buka terminal di editor Kak Dai, ketik 2 perintah ini:
```bash
npm install
npm run dev
```
Buka browser di alamat: `http://localhost:5173`.  
Website sudah nyala di laptop Kak Dai! Setiap ada kode yang diedit, tampilannya langsung berubah otomatis di browser.

---

## 🤖 Rahasia Sukses Ngobrol Bareng AI

Biar AI yang bantuin Kak Dai langsung pintar dan paham konteks project ini dari detik pertama, **selalu ketik kalimat sakti ini di awal chat**:

> *"Hai AI, tolong baca dulu file `map.md` dan `DESIGN.md` ya supaya kamu paham arsitektur, warna tema, dan struktur file project ini sebelum kita mulai coding."*

Dengan begitu, AI nggak akan ngawur dan langsung tahu file mana yang harus dia edit!

---

## 📋 Daftar Tugas yang Bisa Kak Dai Mulai Kembangkan (Next Plan)

Ini beberapa hal prioritas yang bisa langsung Kak Dai coba kerjain bareng AI:

1. 📱 **Bikin Tampilan Rapi di HP (Responsive Mobile — Desain di Stitch Dulu)**  
   * *Catatan Penting:* Tampilan mobile ini **bukan sekadar ngecilin ukuran layout**, karena tabel santri yang lebar kalau cuma dipaksa kecil bakal gepeng dan sulit dibaca.
   * *Cara Kerjanya:* Kak Dai bisa buat rancangan tampilan mobile barunya di **Stitch** dulu. Misalnya: di HP, data santri jangan bentuk tabel lebar, tapi diubah jadi bentuk kartu ringkas (*Card View*) per santri agar infonya tetap jelas dan tombol WA-nya gampang dipencet jempol.  
   * *Setelah ada desain Stitch:* Tinggal minta AI: *"Tolong bantu buatkan tampilan mobile seperti desain Stitch ini ya."*

2. ⚠️ **Benerin Validasi Nomor HP Peserta (Bug Fix)**  
   * *Problem Saat Ini:* Kalau nomor peserta salah/kosong/acak, tombol WhatsApp tetap berubah hijau seolah sukses terkirim.  
   * *Tujuan:* Minta AI: *"Tolong validasi nomor HP-nya dulu. Kalau bukan format nomor HP yang benar (misal tidak diawali 08), tombol jangan berubah hijau dan munculkan peringatan 'Nomor WhatsApp tidak valid'."*

3. ✅ **Fitur To-Do List Harian Berdasarkan Data**  
   * *Tujuan:* Buat widget/kotak checklist tugas harian admin di atas dashboard (misal: otomatis mengumpulkan santri yang belum pilih kelas > 3 hari atau nunggak infaq yang harus di-follow up hari ini).

4. 📊 **Bikin Fitur Ekspor CSV (Excel)**  
   * *Tujuan:* Bikin tombol "Download CSV" di tabel agar data santri yang sedang difilter bisa langsung diunduh ke file Excel untuk laporan operasional.

---

## 🌐 Cara Nampilin Hasil Editan ke Website Asli (Live)

Kalau Kak Dai sudah selesai ngedit bareng AI dan sudah dites di laptop hasilnya bagus:

Cukup jalankan 3 baris ini di terminal:
```bash
git add .
git commit -m "update fitur oleh kak dai"
git push origin main
```

**Beres!** Tunggu sekitar 1 menit, sistem CI/CD akan otomatis nge-build dan langsung memunculkan hasil kerjaan Kak Dai di link website aslinya di Vercel! 🎉
