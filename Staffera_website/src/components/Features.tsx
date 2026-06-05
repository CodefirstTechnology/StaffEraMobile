import {
  ShieldCheck,
  MapPin,
  Calendar,
  Clock,
  IndianRupee,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { features } from '@/config/links';
import { AnimatedSection, StaggerChildren, staggerItem } from './AnimatedSection';

const iconMap: Record<string, LucideIcon> = {
  'shield-check': ShieldCheck,
  'map-pin': MapPin,
  calendar: Calendar,
  clock: Clock,
  'indian-rupee': IndianRupee,
  star: Star,
};

export function Features() {
  return (
    <AnimatedSection id="features" className="section-padding bg-[#f5f2fb]/60">
      <div className="container-narrow">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#7d44a4]">
            Why StaffEra
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#1b1b21] md:text-4xl">
            Built for trust, clarity & peace of mind
          </h2>
          <p className="mt-4 text-[#464652]">
            Unlike open marketplaces, every servant on StaffEra passes agent verification
            before they appear in your search results.
          </p>
        </div>

        <StaggerChildren className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3" stagger={0.1}>
          {features.map((feature) => {
            const Icon = iconMap[feature.icon];
            return (
              <motion.article
                key={feature.title}
                variants={staggerItem}
                whileHover={{ y: -4 }}
                className="glass-card group rounded-3xl p-7 transition-shadow hover:shadow-xl hover:shadow-[#15157d]/10"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e1e0ff] to-[#f4daff] text-[#15157d] transition-transform group-hover:scale-110">
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-[#1b1b21]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#464652]">{feature.description}</p>
              </motion.article>
            );
          })}
        </StaggerChildren>
      </div>
    </AnimatedSection>
  );
}
