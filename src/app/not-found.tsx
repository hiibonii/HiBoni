import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-24 text-center flex-1 w-full">
        <h1 className="text-6xl font-bold text-black/10">404</h1>
        <h2 className="text-2xl font-bold mt-2 mb-2">Cerita tidak ditemukan</h2>
        <p className="text-black/60 mb-8">
          Halaman yang Anda cari mungkin telah dihapus, berganti nama, atau
          sedang tidak tersedia untuk sementara waktu.
        </p>
        <Link href="/" className="btn-primary inline-block">
          ← Back to Home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
