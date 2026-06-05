import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '#services', label: 'Services' },
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#apps', label: 'Get the app' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass-card py-3 shadow-sm' : 'bg-transparent py-5'
      }`}
    >
      <div className="container-narrow flex items-center justify-between px-5 md:px-8 lg:px-12">
        <a href="#" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#662D8C] to-[#ED1E79] text-sm font-extrabold text-white shadow-lg shadow-[#ED1E79]/20">
            SE
          </div>
          <span className="text-lg font-bold tracking-tight text-[#15157d]">StaffEra</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#464652] transition-colors hover:text-[#15157d]"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#apps"
            className="rounded-xl bg-gradient-to-r from-[#662D8C] to-[#ED1E79] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#ED1E79]/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Get started
          </a>
        </nav>

        <button
          type="button"
          className="rounded-lg p-2 text-[#15157d] md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/60 bg-white/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-[#464652] hover:bg-[#f5f2fb]"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#apps"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-xl bg-gradient-to-r from-[#662D8C] to-[#ED1E79] px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Get started
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
