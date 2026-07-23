# HiBoni — Tutorial Setup & Instalasi (VS Code)

Proyek ini adalah PWA Next.js (App Router) untuk blog/story CMS bernama **HiBoni**,
dengan Firebase (Auth + Firestore) sebagai database dan Cloudinary sebagai image hosting,
dan BlockNote sebagai rich-text editor di dashboard CMS.

---

## 1. Prasyarat

Install dulu di komputer kamu:

1. **Node.js versi 18.18 atau lebih baru** (disarankan v20 LTS) → https://nodejs.org
   Cek dengan:
   ```
   node -v
   npm -v
   ```
2. **Visual Studio Code** → https://code.visualstudio.com
3. **Git** → https://git-scm.com
4. Akun **GitHub** dan **Vercel** (untuk deploy nanti)

---

## 2. Buka Project di VS Code

1. Extract file zip `hiboni.zip` yang saya berikan ke folder pilihan kamu.
2. Buka VS Code → `File > Open Folder...` → pilih folder `hiboni`.
3. Buka terminal bawaan VS Code: menu `Terminal > New Terminal` (atau `Ctrl+`` `).

---

## 3. Install Dependencies

Di terminal VS Code (pastikan posisi folder di root project `hiboni`), jalankan:

```bash
npm install
```

Perintah ini akan otomatis meng-install Next.js, Tailwind CSS, Firebase SDK, dan
BlockNote (`@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`) beserta
peer dependency-nya (`@mantine/core`, `@mantine/hooks`, `@mantine/utils`) — semua
sudah tercantum di `package.json`, kamu tinggal jalankan `npm install` sekali saja.

> Kalau nanti kamu mau install Tailwind dari nol di proyek lain, caranya:
> `npm install -D tailwindcss postcss autoprefixer` lalu `npx tailwindcss init -p`.
> Tapi di proyek HiBoni ini konfigurasinya (`tailwind.config.ts`, `postcss.config.mjs`,
> `globals.css`) sudah saya siapkan, jadi tidak perlu diulang.

---

## 4. Setup Environment Variables

1. Duplikat file `.env.local.example` menjadi `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
   (Di Windows PowerShell: `copy .env.local.example .env.local`)

2. File `.env.local` sudah saya isi otomatis dengan kredensial Firebase & Cloudinary
   yang kamu berikan. Silakan cek isinya, biasanya tidak perlu diubah lagi.

3. **Jangan pernah commit file `.env.local` ke GitHub** — file ini sudah masuk
   `.gitignore` secara otomatis.

---

## 5. Setup Firebase

### a. Aktifkan Authentication
1. Buka [Firebase Console](https://console.firebase.google.com) → project **cms-boni**.
2. Menu **Authentication > Sign-in method** → aktifkan provider **Email/Password**.
3. Menu **Authentication > Users** → klik **Add user**, buat akun admin (email + password)
   yang akan kamu pakai untuk login ke dashboard CMS HiBoni.

### b. Aktifkan Firestore Database
1. Menu **Firestore Database** → **Create database** → pilih mode **production**.
2. Pilih lokasi server (misalnya `asia-southeast2` untuk Indonesia).

### c. Pasang Security Rules
1. Buka tab **Rules** di Firestore Database.
2. Copy-paste isi file `firestore.rules` (ada di root project) ke sana, lalu **Publish**.

Ringkasan rules ini:
- Siapa saja boleh membaca cerita/blog yang **published**.
- Hanya user yang **login** (admin) yang boleh membuat, mengedit, atau menghapus.
- Pengunjung publik tetap boleh menaikkan angka **views** saat membuka halaman detail,
  tanpa perlu login.

---

## 6. Setup Cloudinary

Preset `ml_default` yang kamu berikan harus berstatus **Unsigned**, supaya bisa
diakses langsung dari browser tanpa API secret.

1. Buka [Cloudinary Console](https://console.cloudinary.com) → **Settings > Upload**.
2. Cari preset `ml_default`. Jika belum ada, buat preset baru dengan nama itu.
3. Pastikan **Signing Mode = Unsigned**, lalu Save.

---

## 7. Jalankan Secara Lokal

```bash
npm run dev
```

Buka browser ke **http://localhost:3000**.

- Halaman utama (`/`) menampilkan daftar blog/cerita published.
- Login admin di **`/login`** menggunakan akun yang kamu buat di langkah 5a.
- Setelah login, kamu diarahkan ke **`/dashboard`** untuk mengelola cerita.
- Klik **Create Story** untuk membuat konten baru:
  - Pilih tipe **Blog** (cover + judul + isi BlockNote) atau
  - Pilih tipe **Story** (cover + judul + ringkasan → lalu klik **Save Draft**
    supaya cerita tersimpan dan kamu bisa mulai menambah **Chapter** dan **Part**
    di dalamnya, masing-masing dengan editor BlockNote sendiri).
- Klik ikon pensil di tabel dashboard untuk **Edit**, atau ikon tempat sampah untuk **Delete**.

---

## 8. Icon PWA

Folder `public/icons/` sudah disiapkan tapi masih kosong. Tambahkan dua file:
- `public/icons/icon-192.png` (192×192 px)
- `public/icons/icon-512.png` (512×512 px)

Logo HiBoni kamu sendiri, format PNG, background solid disarankan supaya terlihat
bagus saat PWA di-"Add to Home Screen".

---

## 9. Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit - HiBoni"
git branch -M main
git remote add origin https://github.com/USERNAME/hiboni.git
git push -u origin main
```

Ganti `USERNAME` dengan username GitHub kamu, dan buat dulu repository kosong
bernama `hiboni` di github.com sebelum push.

---

## 10. Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New Project** → import repo `hiboni` dari GitHub.
2. Di step **Environment Variables**, masukkan semua variabel yang ada di file
   `.env.local` kamu (copy satu per satu: key dan value).
3. Klik **Deploy**. Setelah selesai, Vercel akan memberi URL seperti
   `https://hiboni.vercel.app`.
4. Setiap kali kamu `git push` ke branch `main`, Vercel otomatis build & deploy ulang.

---

## 11. Struktur Data Firestore

```
stories (collection)
  {storyId}
    type: "blog" | "story"
    title, slug, category, summary, coverImage, status, views
    content: [...]         ← hanya untuk type "blog" (BlockNote JSON)
    createdAt, updatedAt, searchKeywords

    chapters (subcollection)     ← hanya untuk type "story"
      {chapterId}
        title, order
        parts (subcollection)
          {partId}
            title, content (BlockNote JSON), order
```

---

## 12. Catatan & Batasan (penting dibaca)

- **Search** saat ini bekerja dengan mencocokkan kata utuh pada judul (bukan
  substring/fuzzy search). Untuk pencarian yang lebih canggih di production,
  pertimbangkan integrasi Algolia atau Typesense.
- **Login** hanya untuk 1 role (admin/editor) — semua user yang berhasil login
  punya akses penuh ke dashboard. Tambahkan Firebase Custom Claims kalau nanti
  butuh multi-role (misalnya admin vs kontributor).
- Struktur halaman story detail memakai URL `/story/[slug]?chapter=0&part=0`.
- Semua kredensial di `.env.local` (Firebase client config & Cloudinary unsigned
  preset) memang didesain aman untuk terekspos di frontend — bukan secret key.

Selamat membangun HiBoni! 🚀
