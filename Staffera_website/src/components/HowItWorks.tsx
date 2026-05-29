import { motion } from 'framer-motion';
import { steps } from '@/config/links';
import { AnimatedSection } from './AnimatedSection';

export function HowItWorks() {
  return (
    <AnimatedSection id="how-it-works" className="section-padding">
      <div className="container-narrow">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#7d44a4]">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#1b1b21] md:text-4xl">
            From browse to review in three steps
          </h2>
        </div>

        <div className="relative mt-16">
          <div className="absolute left-8 top-0 hidden h-full w-px bg-gradient-to-b from-[#662D8C] via-[#7d44a4] to-[#ED1E79] md:left-1/2 md:block" />

          <div className="flex flex-col gap-12">
            {steps.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className={`relative flex flex-col gap-6 md:flex-row md:items-center ${
                  i % 2 === 1 ? 'md:flex-row-reverse' : ''
                }`}
              >
                <div className={`flex-1 ${i % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                  <span className="text-sm font-bold text-[#7d44a4]">Step {item.step}</span>
                  <h3 className="mt-1 text-xl font-bold text-[#1b1b21]">{item.title}</h3>
                  <p className="mt-2 text-[#464652]">{item.description}</p>
                </div>

                <div className="relative z-10 flex shrink-0 justify-center md:absolute md:left-1/2 md:-translate-x-1/2">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#662D8C] to-[#ED1E79] text-xl font-extrabold text-white shadow-lg shadow-[#ED1E79]/30"
                  >
                    {item.step}
                  </motion.div>
                </div>

                <div className="hidden flex-1 md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
