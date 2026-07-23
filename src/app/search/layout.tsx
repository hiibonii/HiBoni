import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description: "Cari artikel dan cerita di HiBoni.",
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
