import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, MapPin, Shield } from 'lucide-react';
import { copy } from '@/theme/tokens';

const floatingCards = [
  { icon: BadgeCheck, label: 'Verified', sub: 'Agent-checked ID', delay: 0, className: 'top-8 -left-4 md:left-0' },
  { icon: MapPin, label: 'Live tracking', sub: 'GPS on the way', delay: 0.2, className: 'top-1/3 -right-2 md:right-0' },
  { icon: Shield, label: 'Secure', sub: 'Encrypted data', delay: 0.4, className: 'bottom-12 left-4 md:left-8' },
];

export function Hero() {
  return (
    <section className="hero-mesh relative min-h-screen overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#7d44a4]/10 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none absolute right-0 top-1/4 h-72 w-72 rounded-full bg-[#ED1E79]/10 blur-3xl" />

      <div className="container-narrow relative grid items-center gap-12 px-5 md:px-8 lg:grid-cols-2 lg:gap-16 lg:px-12">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#7d44a4]/20 bg-white/70 px-4 py-1.5 text-sm font-medium text-[#7d44a4] backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0d9488] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0d9488]" />
            </span>
            India's trusted home-staffing marketplace
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-extrabold leading-[1.1] tracking-tight text-[#1b1b21] md:text-5xl lg:text-6xl"
          >
            Verified home help,{' '}
            <span className="gradient-text">booked in minutes</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-lg text-lg leading-relaxed text-[#464652]"
          >
            StaffEra connects house owners with agent-verified servants for cooking,
            cleaning, childcare, and more — with live tracking, transparent ₹ pricing,
            and reviews you can trust.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-3 text-sm font-medium text-[#7d44a4]"
          >
            {copy.tagline}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <a
              href="#apps"
              className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#662D8C] to-[#ED1E79] px-7 py-4 text-base font-semibold text-white shadow-xl shadow-[#ED1E79]/30 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-[#ED1E79]/35 active:scale-[0.98]"
            >
              Open the apps
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#c7c5d4] bg-white/80 px-7 py-4 text-base font-semibold text-[#15157d] backdrop-blur-sm transition-all hover:border-[#7d44a4]/40 hover:bg-white"
            >
              See how it works
            </a>
          </motion.div>
        </div>

        <div className="relative mx-auto h-[420px] w-full max-w-md lg:max-w-none lg:h-[480px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="relative h-[380px] w-[280px] rounded-[2.5rem] border-[6px] border-[#1b1b21] bg-[#1b1b21] shadow-2xl shadow-[#15157d]/30 md:h-[420px] md:w-[300px]">
              <div className="absolute left-1/2 top-3 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1b1b21]" />
              <div className="h-full overflow-hidden rounded-[2rem] bg-[#fcf8ff]">
                <div className="bg-gradient-to-br from-[#662D8C] to-[#ED1E79] p-6 pb-16">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Welcome offer
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">Book verified help</p>
                  <p className="mt-1 text-sm text-white/85">Background-checked staff</p>
                  <div className="mt-4 inline-block rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#7d44a4]">
                    Browse now
                  </div>
                </div>
                <div className="relative -mt-10 px-4">
                  <div className="glass-card rounded-2xl p-4">
                    <p className="text-xs font-semibold text-[#464652]">Upcoming visit</p>
                    <p className="mt-1 font-bold text-[#1b1b21]">Priya S. · Cooking</p>
                    <span className="mt-2 inline-block rounded-full bg-[rgba(13,148,136,0.12)] px-2.5 py-0.5 text-xs font-semibold text-[#0d9488]">
                      CONFIRMED
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {['🧹', '👨‍🍳', '👶'].map((emoji) => (
                      <div
                        key={emoji}
                        className="flex h-14 items-center justify-center rounded-xl bg-[#f0ecf5] text-xl"
                      >
                        {emoji}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {floatingCards.map(({ icon: Icon, label, sub, delay, className }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + delay, duration: 0.5 }}
              className={`absolute ${className} animate-float glass-card rounded-2xl px-4 py-3`}
              style={{ animationDelay: `${delay}s` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e1e0ff] text-[#15157d]">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1b1b21]">{label}</p>
                  <p className="text-xs text-[#464652]">{sub}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
