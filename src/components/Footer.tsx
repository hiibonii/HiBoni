import { FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="border-t border-black/10 mt-20">
      <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between flex-wrap gap-4">
        <p className="text-sm text-black/50">
          © 2026 HiBoni. All rights reserved.
        </p>
        <a
          href="https://instagram.com/hiiboniii"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="text-black/50 hover:text-black transition-colors"
        >
          <FaInstagram size={20} />
        </a>
      </div>
    </footer>
  );
}
