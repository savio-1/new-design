import { useState, useEffect } from 'react'
import { ArrowRight, Menu, Close, ChevronDown } from './icons.jsx'

const PRODUCTS = [
  {
    card: 'assets/cards/endpoint.png',
    title: 'Endpoint',
    href: '/products/endpoint',
    blurb: 'Manage every device with one lightweight agent',
    items: [
      { icon: 'assets/icons/laptop.png', label: 'Endpoint Management', href: '/products/endpoint/endpoint-management' },
      { icon: 'assets/icons/radar.png', label: 'Endpoint Detection & Response', href: '/products/endpoint/endpoint-detection-response' },
      { icon: 'assets/icons/triangle.png', label: 'Vulnerability Management', href: '/products/endpoint/vulnerability-management' },
    ],
  },
  {
    card: 'assets/cards/identity.png',
    title: 'Identity',
    href: '/products/identity',
    blurb: 'Passwordless access that adapts to every context',
    items: [
      { icon: 'assets/icons/identity.png', label: 'Workforce Identity', href: '/products/identity' },
    ],
  },
  {
    card: 'assets/cards/compliance.png',
    title: 'Compliance',
    href: '/products/compliance',
    blurb: 'Stay audit-ready with continuous evidence collection',
    items: [
      { icon: 'assets/icons/checklist.png', label: 'Compliance Automation', href: '/products/compliance/compliance-automation' },
      { icon: 'assets/icons/world.png', label: 'Trust Center', href: '/products/compliance/trust-center' },
    ],
  },
]

const IRU_AI = {
  card: 'assets/cards/iru-ai.png',
  title: 'Iru AI',
  href: '/iru-ai',
  blurb: 'Automating compliance, insights, and actions from a single interface.',
}

const SOLUTIONS = {
  device: [
    ['Mac', '/solutions/mac'], ['Android', '/solutions/android'], ['Windows', '/solutions/windows'],
    ['iPhone & iPad', '/solutions/iphone-ipad'], ['Apple TV', '/solutions/tvos'], ['Vision Pro', '/solutions/apple-vision'],
  ],
  useCase: [
    ['Zero-touch deployment', '/use-cases/zero-touch-deployment'], ['Automated Patching', '/use-cases/automate-patching/'],
    ['Configuration-as-code', '/use-cases/config-as-code'], ['Build with MCP', '/use-cases/mcp'],
  ],
}

const RESOURCES = {
  quick: [
    ['Blog', '/blog'], ['Customer Stories', '/resources/customer-stories'], ['Iru for MSPs', '/industry/msp'],
    ['Watch a Demo', '/lp-watch-demo-page'], ['Wall of Love', '/reviews'],
  ],
  learn: [
    ['Compare Iru', 'See how we stack up', '/compare'],
    ['Patch Me If You Can', 'A podcast for innovators in IT & security', '/podcast'],
    ['Threats & Vulnerabilities', "A catalog of threats we've researched", '/threats-vulnerabilities'],
  ],
  support: [
    ['Support Docs', 'https://docs.iru.com/'], ['API Documentation', 'https://api-docs.iru.io/'], ['Updates Feed', '/updates/'],
  ],
}

const COMPANY = [['About Iru', '/company/about'], ['Careers', '/company/careers'], ['Contact', '/contact']]

const NAV_ITEMS = ['Products', 'Solutions', 'Resources', 'Company']

function ColHeading({ children }) {
  return <span className="py-2 border-b opacity-60 border-current/10 block">{children}</span>
}

function Dropdown({ id, open, children, width }) {
  return (
    <div className="inset-x-0 absolute z-10 left-0 right-0 px-4 lg:px-8">
      <div
        className={`mx-auto text-sm p-6 rounded-2xl drop-shadow-2xl text-terminal bg-cursor origin-top transition-all duration-200 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'
        }`}
        style={{ maxWidth: width }}
      >
        {children}
      </div>
    </div>
  )
}

export default function Header() {
  const [openMenu, setOpenMenu] = useState(null)
  const [drawer, setDrawer] = useState(false)
  const [mobileSection, setMobileSection] = useState(null)

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawer])

  return (
    <header className="select-none sticky top-0 z-50" role="banner">
      <div className="text-terminal bg-cursor border-b border-current/5">
        <nav aria-label="Global" className="max-w-9xl mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
          {/* Logo */}
          <div className="w-20 md:w-26 shrink-0 flex-1 flex items-center">
            <a href="/" className="inline-flex items-center justify-center text-terminal">
              <img src="assets/logos/iru-logo-dark.png" alt="Iru" className="h-7 sm:h-8 w-auto" />
            </a>
          </div>

          {/* Desktop nav */}
          <ul className="hidden lg:flex gap-6" onMouseLeave={() => setOpenMenu(null)}>
            {NAV_ITEMS.map((item) => (
              <li key={item} onMouseEnter={() => setOpenMenu(item)}>
                <div className="px-3 py-6 leading-none transition-all hover:opacity-80 font-medium text-sm cursor-pointer flex items-center gap-1">
                  {item}
                </div>

                {item === 'Products' && (
                  <Dropdown open={openMenu === 'Products'} width="1240px">
                    <div className="grid grid-cols-4 gap-6">
                      {PRODUCTS.map((p) => (
                        <div key={p.title} className="flex flex-col gap-6">
                          <div>
                            <div className="mb-4"><img src={p.card} alt={p.title} className="w-full h-auto rounded-xl" /></div>
                            <a href={p.href} className="flex items-center gap-1 group font-medium">{p.title}<ArrowRight className="size-3.5 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" /></a>
                            <p className="mt-2 text-sm opacity-60 text-pretty">{p.blurb}</p>
                          </div>
                          <ul className="list-none m-0 p-0 space-y-3">
                            {p.items.map((it) => (
                              <li key={it.label}>
                                <a href={it.href} className="flex items-center gap-2 font-medium transition-all hover:opacity-60">
                                  <img className="size-11.5" src={it.icon} alt="" />{it.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      <div>
                        <div className="mb-4"><img src={IRU_AI.card} alt={IRU_AI.title} className="w-full h-auto rounded-xl" /></div>
                        <a href={IRU_AI.href} className="flex items-center gap-1 group font-medium">{IRU_AI.title}<ArrowRight className="size-3.5 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" /></a>
                        <p className="mt-2 text-sm opacity-60 text-pretty">{IRU_AI.blurb}</p>
                      </div>
                    </div>
                  </Dropdown>
                )}

                {item === 'Solutions' && (
                  <Dropdown open={openMenu === 'Solutions'} width="480px">
                    <div className="grid grid-cols-2 gap-10">
                      <div className="flex flex-col gap-6">
                        <ColHeading>Solutions by device</ColHeading>
                        <ul className="p-0 m-0 space-y-4">
                          {SOLUTIONS.device.map(([l, h]) => (
                            <li key={l}><a className="text-sm font-medium transition-all hover:opacity-60" href={h}>{l}</a></li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col gap-6">
                        <ColHeading>Solutions by use case</ColHeading>
                        <ul className="p-0 m-0 space-y-4">
                          {SOLUTIONS.useCase.map(([l, h]) => (
                            <li key={l}><a className="text-sm font-medium transition-all hover:opacity-60" href={h}>{l}</a></li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Dropdown>
                )}

                {item === 'Resources' && (
                  <Dropdown open={openMenu === 'Resources'} width="884px">
                    <div className="grid grid-cols-[minmax(0,220px)_minmax(0,300px)_minmax(0,220px)] gap-10">
                      <div className="flex flex-col gap-6">
                        <ColHeading>Quick Links</ColHeading>
                        <ul className="p-0 m-0 space-y-4">
                          {RESOURCES.quick.map(([l, h]) => (
                            <li key={l}><a className="text-sm font-medium transition-all hover:opacity-60" href={h}>{l}</a></li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col gap-6">
                        <ColHeading>Learn</ColHeading>
                        <ul className="p-0 m-0 space-y-4">
                          {RESOURCES.learn.map(([l, d, h]) => (
                            <li key={l} className="group">
                              <a href={h} className="flex flex-col gap-1 transition-all group-hover:opacity-60">
                                <span className="text-sm font-medium">{l}</span>
                                <span className="font-normal opacity-60">{d}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col gap-6">
                        <ColHeading>Support</ColHeading>
                        <ul className="p-0 m-0 space-y-4">
                          {RESOURCES.support.map(([l, h]) => (
                            <li key={l}><a className="text-sm font-medium transition-all hover:opacity-60" href={h}>{l}</a></li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Dropdown>
                )}

                {item === 'Company' && (
                  <Dropdown open={openMenu === 'Company'} width="576px">
                    <div className="flex gap-12 justify-between">
                      <ul className="p-0 m-0 space-y-5 basis-1/2">
                        {COMPANY.map(([l, h]) => (
                          <li key={l}><a href={h} className="text-sm font-medium transition-all hover:opacity-60">{l}</a></li>
                        ))}
                      </ul>
                      <a href="/webinar-iru-mcp" className="bg-terminal text-cursor rounded-lg overflow-hidden relative block basis-1/2 max-w-[253px] aspect-video">
                        <video loop autoPlay muted playsInline poster="assets/video/intro-poster.png" className="w-full h-full object-cover">
                          <source src="assets/video/iru-ai.mp4" type="video/mp4" />
                        </video>
                        <div className="absolute left-3 bottom-3 z-10">
                          <p className="text-sm font-medium">Introducing Iru MCP</p>
                          <p className="text-sm opacity-80">Make your endpoints programmable</p>
                        </div>
                      </a>
                    </div>
                  </Dropdown>
                )}
              </li>
            ))}
            <li>
              <a className="block px-3 py-6 leading-none transition-all hover:opacity-80 font-medium text-sm" href="/pricing">Pricing</a>
            </li>
          </ul>

          {/* Right CTAs */}
          <div className="flex-1 flex justify-end items-center gap-4">
            <a href="/login" className="btn btn--ghost hidden md:flex">Login</a>
            <a href="/request-demo" className="btn btn--primary">Book a demo</a>
            <button className="p-2.5 pr-1.5 md:pr-2.5 lg:hidden cursor-pointer -mr-1" onClick={() => setDrawer(true)}>
              <Menu />
              <span className="sr-only">Open main menu</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-[1050] h-dvh text-terminal bg-cursor flex flex-col">
          <div className="flex items-center justify-between p-4">
            <a href="/"><img src="assets/logos/iru-logo-dark.png" className="h-8 w-auto" alt="Iru" /></a>
            <button className="p-2.5 cursor-pointer" onClick={() => setDrawer(false)}>
              <Close /><span className="sr-only">Close main menu</span>
            </button>
          </div>
          <nav aria-label="Mobile" className="px-4 py-6 flex flex-col gap-2 overflow-y-auto grow">
            {NAV_ITEMS.map((item) => (
              <div key={item} className="border-b border-current/10">
                <button
                  className="leading-tight flex w-full items-center justify-between py-4 font-medium text-xl cursor-pointer"
                  onClick={() => setMobileSection(mobileSection === item ? null : item)}
                >
                  {item}
                  <ChevronDown className={`size-5 transition-transform ${mobileSection === item ? 'rotate-180' : ''}`} />
                </button>
                {mobileSection === item && (
                  <div className="pb-4 flex flex-col gap-3 text-base opacity-80">
                    {item === 'Products' && [...PRODUCTS.flatMap((p) => [[p.title, p.href], ...p.items.map((i) => [i.label, i.href])]), [IRU_AI.title, IRU_AI.href]].map(([l, h]) => (
                      <a key={l + h} href={h} className="hover:opacity-60">{l}</a>
                    ))}
                    {item === 'Solutions' && [...SOLUTIONS.device, ...SOLUTIONS.useCase].map(([l, h]) => (
                      <a key={l} href={h} className="hover:opacity-60">{l}</a>
                    ))}
                    {item === 'Resources' && [...RESOURCES.quick, ...RESOURCES.support].map(([l, h]) => (
                      <a key={l} href={h} className="hover:opacity-60">{l}</a>
                    ))}
                    {item === 'Company' && COMPANY.map(([l, h]) => (
                      <a key={l} href={h} className="hover:opacity-60">{l}</a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <a href="/pricing" className="py-4 font-medium text-xl border-b border-current/10">Pricing</a>
            <div className="flex flex-col gap-3 pt-6">
              <a href="/login" className="btn btn--ghost">Login</a>
              <a href="/request-demo" className="btn btn--primary">Book a demo</a>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
