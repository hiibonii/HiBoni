// Kategori sekarang dikelola secara dinamis lewat Firestore (lihat
// src/lib/categoriesStore.ts) dan bisa diubah admin di halaman
// /dashboard/settings — TIDAK perlu lagi edit file ini untuk
// tambah/ubah/hapus kategori.
//
// Array di bawah ini HANYA dipakai sebagai data awal (seed) yang otomatis
// ditulis ke Firestore satu kali saja, kalau koleksi "categories" masih
// kosong (misalnya saat pertama kali setup project).

export const DEFAULT_CATEGORIES = [
  { value: "technology", label: "Technology" },
  { value: "design", label: "Design" },
  { value: "culture", label: "Culture" },
  { value: "philosophy", label: "Philosophy" },
];
