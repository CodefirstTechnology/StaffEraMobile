import { links } from '@/config/links';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#eae7f0] bg-white">
      <div className="container-narrow px-5 py-12 md:px-8 lg:px-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#662D8C] to-[#ED1E79] text-sm font-extrabold text-white">
                SE
              </div>
              <span className="text-lg font-bold text-[#15157d]">StaffEra</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#464652]">
              Home-staffing marketplace connecting house owners with agent-verified
              servants. Browse, book, track, and review — all in one trusted platform.
            </p>
          </div>

          <div>
            <p className="text-sm font-bold text-[#1b1b21]">Apps</p>
            <ul className="mt-4 space-y-2 text-sm text-[#464652]">
              <li>
                <a href={links.houseOwnerApp} className="hover:text-[#15157d]">
                  House Owner App
                </a>
              </li>
              <li>
                <a href={links.servantApp} className="hover:text-[#15157d]">
                  Servant App
                </a>
              </li>
              <li>
                <a href={links.agentPortal} className="hover:text-[#15157d]">
                  Agent Portal
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-bold text-[#1b1b21]">Platform</p>
            <ul className="mt-4 space-y-2 text-sm text-[#464652]">
              <li>
                <a href="#features" className="hover:text-[#15157d]">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#15157d]">
                  How it works
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-[#15157d]">
                  Services
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#eae7f0] pt-8 text-sm text-[#777683] md:flex-row">
          <p>© {year} StaffEra. All rights reserved.</p>
          <p>Verified helpers · Secure bookings · Built for Indian homes</p>
        </div>
      </div>
    </footer>
  );
}
