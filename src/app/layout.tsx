import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/useAuth";
import SWRegister from "@/components/SWRegister";

// next/font otomatis meng-host file font-nya sendiri (bukan fetch ke Google
// saat runtime), jadi tetap cepat dan tidak bergantung koneksi ke Google saat
// dipakai sebagai PWA. --font-space-grotesk didaftarkan sebagai default font
// "sans" di tailwind.config.ts sehingga berlaku ke seluruh teks di aplikasi.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hi-boni.vercel.app/";
const SITE_NAME = "HiBoni";
const SITE_DESCRIPTION =
  "HiBoni — The Written Word, Refined.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Blog & Story Platform`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Blog & Story Platform`,
    description: SITE_DESCRIPTION,
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Blog & Story Platform`,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: "/icons/Logo.png", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/Logo.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={spaceGrotesk.variable}>
      <body className="min-h-screen">
        <AuthProvider>
          {children}
          <SWRegister />
        </AuthProvider>
      </body>
    </html>
  );
}
