import { motion } from 'framer-motion';
import { Lock, Users, Zap } from 'lucide-react';
import { copy } from '@/theme/tokens';
import { AnimatedSection } from './AnimatedSection';

const trustPoints = [
  {
    icon: Users,
    title: 'Three-sided marketplace',
    text: 'House owners book, servants work, and agents verify — each role has a dedicated app built for their workflow.',
  },
  {
    icon: Lock,
    title: 'Privacy by design',
    text: copy.trustLine,
  },
  {
    icon: Zap,
    title: 'Real-time updates',
    text: 'Push notifications for booking status, clock-in events, and arrival tracking keep everyone in sync.',
  },
];

export function TrustSection() {
  return (
    <AnimatedSection className="section-padding">
      <div className="container-narrow">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#f0ecf5] to-[#e1e0ff] p-8 md:p-12 lg:p-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-[#7d44a4]">
                Our promise
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#1b1b21] md:text-4xl">
                Premium service logic for Indian households
              </h2>
              <p className="mt-4 leading-relaxed text-[#464652]">
                StaffEra is not another classifieds board. It is a verified marketplace
                where agents onboard servants with ID proofs, house owners see only
                VERIFIED profiles, and reviews unlock only after completed visits.
              </p>
              <motion.a
                href="#apps"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-8 inline-block rounded-2xl bg-[#15157d] px-7 py-4 text-sm font-bold text-white shadow-lg shadow-[#15157d]/25"
              >
                Start with StaffEra today
              </motion.a>
            </div>

            <div className="flex flex-col gap-5">
              {trustPoints.map((point, i) => (
                <motion.div
                  key={point.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card flex gap-4 rounded-2xl p-5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#15157d] text-white">
                    <point.icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1b1b21]">{point.title}</h3>
                    <p className="mt-1 text-sm text-[#464652]">{point.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
