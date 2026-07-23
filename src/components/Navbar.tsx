"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { FiSearch, FiBell, FiUser, FiPlus, FiMenu, FiX } from "react-icons/fi";
import { useAuth } from "@/lib/useAuth";

const SORT_LINKS = [
  { href: "/", label: "Discover", sort: "discover" },
  { href: "/?sort=latest", label: "Latest", sort: "latest" },
  { href: "/?sort=trending", label: "Trending", sort: "trending" },
];

function NavLinks({
  mobileOpen,
  onLinkClick,
}: {
  mobileOpen: boolean;
  onLinkClick: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = pathname === "/" ? searchParams.get("sort") || "discover" : null;

  return (
    <>
      {/* Desktop */}
      <nav className="hidden md:flex gap-8 text-sm font-medium">
        {SORT_LINKS.map((l) => (
          <Link
            key={l.sort}
            href={l.href}
            className={currentSort === l.sort ? "underline underline-offset-4" : ""}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Mobile dropdown panel */}
      {mobileOpen && (
        <nav className="md:hidden absolute top-full left-0 right-0 bg-paper border-b border-black/10 flex flex-col text-sm font-medium z-20">
          {SORT_LINKS.map((l) => (
            <Link
              key={l.sort}
              href={l.href}
              onClick={onLinkClick}
              className={`px-6 py-4 border-t border-black/5 ${
                currentSort === l.sort ? "bg-black/5 font-bold" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

export default function Navbar() {
  const router = useRouter();
  const { user, canWriteStories, profile } = useAuth();
  const [term, setTerm] = useState("");
  const [logoError, setLogoError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileSearchOpen) mobileSearchInputRef.current?.focus();
  }, [mobileSearchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (term.trim()) {
      router.push(`/search?q=${encodeURIComponent(term.trim())}`);
      setMobileSearchOpen(false);
    }
  };

  return (
    <header className="relative border-b border-black/10 bg-paper">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setMobileMenuOpen((v) => !v);
              setMobileSearchOpen(false);
            }}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="md:hidden -ml-1 p-1"
          >
            {mobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
          <Link href="/" className="flex items-center gap-2">
            {!logoError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/Logo.svg"
                alt="HiBoni"
                className="h-8 w-auto"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-xl font-bold tracking-widest">
                Hi <span className="text-xs align-super">Boni</span>
              </span>
            )}
          </Link>
        </div>
        <Suspense fallback={<nav className="hidden md:flex gap-8 text-sm font-medium" />}>
          <NavLinks mobileOpen={mobileMenuOpen} onLinkClick={() => setMobileMenuOpen(false)} />
        </Suspense>
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="hidden sm:block">
            <input
              id="site-search-desktop"
              name="q"
              type="search"
              autoComplete="off"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search..."
              className="border border-black/10 bg-white px-3 py-1.5 text-sm rounded-sm"
            />
          </form>
          <button
            onClick={() => {
              setMobileSearchOpen((v) => !v);
              setMobileMenuOpen(false);
            }}
            aria-label={mobileSearchOpen ? "Close search" : "Open search"}
            className="sm:hidden"
          >
            {mobileSearchOpen ? <FiX size={20} /> : <FiSearch size={20} />}
          </button>
          <FiBell className="hidden sm:block" />
          {user && canWriteStories && (
            <Link
              href="/dashboard/create"
              aria-label="Create Story"
              title="Create Story"
              className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shrink-0 hover:bg-black/80"
            >
              <FiPlus />
            </Link>
          )}
          <Link
            href={canWriteStories ? "/dashboard" : "/login"}
            className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center overflow-hidden shrink-0"
          >
            {user && profile.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photoURL}
                alt={profile.displayName || "Profile"}
                className="w-full h-full object-cover"
              />
            ) : (
              <FiUser />
            )}
          </Link>
        </div>
      </div>

      {mobileSearchOpen && (
        <form
          onSubmit={handleSearch}
          className="sm:hidden absolute top-full left-0 right-0 bg-paper border-b border-black/10 px-6 py-4 z-20 flex gap-2"
        >
          <input
            ref={mobileSearchInputRef}
            id="site-search-mobile"
            name="q"
            type="search"
            autoComplete="off"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search..."
            className="flex-1 border border-black/10 bg-white px-3 py-2 text-base rounded-sm"
          />
          <button type="submit" className="btn-primary text-sm px-4">
            Go
          </button>
        </form>
      )}
    </header>
  );
}