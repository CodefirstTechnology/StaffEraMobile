import { motion } from 'framer-motion';
import { ExternalLink, Home, Briefcase, Shield, Smartphone } from 'lucide-react';
import { apps, links } from '@/config/links';
import { AnimatedSection, StaggerChildren, staggerItem } from './AnimatedSection';

const iconMap = {
  home: Home,
  briefcase: Briefcase,
  shield: Shield,
};

export function AppDownloads() {
  return (
    <AnimatedSection id="apps" className="section-padding bg-[#15157d] text-white">
      <div className="container-narrow">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#d697fe]">
            Get StaffEra
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
            Choose your app — owner, servant, or agent
          </h2>
          <p className="mt-4 text-white/75">
            Open the web app instantly or download on mobile. Servants are onboarded by
            agents — accounts are created in the Agent Portal first.
          </p>
        </div>

        <StaggerChildren className="mt-14 grid gap-6 lg:grid-cols-3" stagger={0.12}>
          {apps.map((app) => {
            const Icon = iconMap[app.icon];
            const storeLinks =
              app.id === 'house-owner'
                ? { play: links.playStoreHouseOwner, appStore: links.appStoreHouseOwner }
                : app.id === 'servant'
                  ? { play: links.playStoreServant, appStore: links.appStoreServant }
                  : null;

            return (
              <motion.article
                key={app.id}
                variants={staggerItem}
                whileHover={{ y: -6 }}
                className="flex flex-col overflow-hidden rounded-3xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15"
              >
                <div className={`bg-gradient-to-br ${app.accent} p-6`}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                    <Icon size={24} className="text-white" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold">{app.title}</h3>
                  <p className="text-sm font-medium text-white/85">{app.subtitle}</p>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="flex-1 text-sm leading-relaxed text-white/80">{app.description}</p>
                  <div className="mt-6 flex flex-col gap-3">
                    <a
                      href={app.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#15157d] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <ExternalLink size={16} />
                      Open web app
                    </a>
                    {storeLinks && (
                      <div className="flex gap-2">
                        <a
                          href={storeLinks.play}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/25 px-3 py-2.5 text-xs font-semibold text-white/90 transition-colors hover:bg-white/10"
                        >
                          <Smartphone size={14} />
                          Play Store
                        </a>
                        <a
                          href={storeLinks.appStore}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/25 px-3 py-2.5 text-xs font-semibold text-white/90 transition-colors hover:bg-white/10"
                        >
                          <Smartphone size={14} />
                          App Store
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </StaggerChildren>
      </div>
    </AnimatedSection>
  );
}
