import { motion } from 'framer-motion';
import { usps } from '@/config/links';

export function USPBar() {
  return (
    <section className="border-y border-[#eae7f0] bg-white/60 backdrop-blur-sm">
      <div className="container-narrow grid grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4 md:px-8 lg:px-12">
        {usps.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="text-center"
          >
            <p className="text-3xl font-extrabold gradient-text md:text-4xl">{item.stat}</p>
            <p className="mt-1 text-sm font-bold text-[#15157d]">{item.label}</p>
            <p className="mt-0.5 text-xs text-[#464652]">{item.detail}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
