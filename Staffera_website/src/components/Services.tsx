import { motion } from 'framer-motion';
import { services } from '@/config/links';
import { AnimatedSection, StaggerChildren, staggerItem } from './AnimatedSection';

export function Services() {
  return (
    <AnimatedSection id="services" className="section-padding">
      <div className="container-narrow">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#7d44a4]">
            Services
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#1b1b21] md:text-4xl">
            Every kind of help your home needs
          </h2>
          <p className="mt-4 text-[#464652]">
            Browse verified professionals by skill — from daily cooking to elderly care,
            all onboarded through trusted agents.
          </p>
        </div>

        <StaggerChildren className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" stagger={0.08}>
          {services.map((service) => (
            <motion.div
              key={service.label}
              variants={staggerItem}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group cursor-default rounded-2xl bg-[#f0ecf5] p-6 text-center transition-shadow hover:shadow-lg hover:shadow-[#15157d]/8"
            >
              <motion.span
                className="block text-4xl"
                whileHover={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 0.4 }}
              >
                {service.emoji}
              </motion.span>
              <p className="mt-3 text-sm font-semibold text-[#1b1b21]">{service.label}</p>
            </motion.div>
          ))}
        </StaggerChildren>
      </div>
    </AnimatedSection>
  );
}
