import { ArrowRight } from './icons.jsx'
import { useRevealGroup } from '../hooks/useReveal.js'

const BLOCKS = [
  {
    title: 'Endpoint',
    body: 'Deploy endpoint management, detection & response, and vulnerability management in a single agent. Protect against threats and deliver great work experiences across Apple, Windows, and Android.',
    cta: ['View Endpoint Overview', 'https://www.iru.com/products/endpoint'],
    image: '/assets/features/endpoint.png',
    items: [
      ['/assets/product-icons/endpoint-management.png', 'Endpoint Management', 'https://www.iru.com/products/endpoint/endpoint-management'],
      ['/assets/product-icons/edr.png', 'Endpoint Detection & Response', 'https://www.iru.com/products/endpoint/endpoint-detection-response'],
      ['/assets/product-icons/vm.png', 'Vulnerability Management', 'https://www.iru.com/products/endpoint/vulnerability-management'],
    ],
  },
  {
    title: 'Identity',
    body: 'Passwordless workforce identity that grants secure access to every app. Wrap your apps and users in a trust fabric with device-bound authentication and robust security policies.',
    cta: ['View Identity Overview', 'https://www.iru.com/products/identity'],
    image: '/assets/features/identity.png',
    items: [
      ['/assets/product-icons/workforce-identity.png', 'Workforce Identity', 'https://www.iru.com/products/identity'],
    ],
  },
  {
    title: 'Compliance',
    body: "Compliance automation that's fully powered by Iru AI tailors controls and builds an Adaptive Evidence Map. It keeps you audit-ready and unblocks deals with a public trust center.",
    cta: ['View Compliance Overview', 'https://www.iru.com/products/compliance'],
    image: '/assets/features/compliance.png',
    items: [
      ['/assets/product-icons/compliance-automation.png', 'Compliance Automation', 'https://www.iru.com/products/compliance/compliance-automation'],
      ['/assets/product-icons/trust-center.png', 'Trust Center', 'https://www.iru.com/products/compliance/trust-center'],
    ],
  },
]

export default function Products() {
  const scope = useRevealGroup('[data-reveal]')

  return (
    <section ref={scope} className="max-w-9xl mx-auto px-4 lg:px-8 py-16 lg:py-24">
      <div data-reveal>
        <h2 className="mx-auto h3 text-center" style={{ maxWidth: 730 }}>
          One integrated platform.<br />Greater than the sum of its parts.
        </h2>
        <p className="mx-auto text-base text-center mt-8" style={{ maxWidth: 510 }}>
          Iru gives you a single view of your users, apps, and devices. It&rsquo;s an
          integrated system to secure access, protect endpoints, and prove compliance
          while delivering a better employee experience.
        </p>
      </div>

      <div className="mt-16 lg:mt-24 flex flex-col gap-20 lg:gap-28">
        {BLOCKS.map((b) => (
          <div key={b.title} data-reveal className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-5">
              <h3 className="h5 mt-0 mb-4">{b.title}</h3>
              <p className="mt-0 mb-8">{b.body}</p>
              <div className="flex flex-wrap items-center gap-4">
                <a className="btn btn--primary" href={b.cta[1]}>{b.cta[0]}</a>
              </div>
              <div className="mt-8">
                {b.items.map(([icon, label, href]) => (
                  <a
                    key={label}
                    href={href}
                    className="py-2 flex justify-between items-center gap-4 w-full text-current font-medium group !no-underline border-b border-current/10"
                  >
                    <span className="flex items-center gap-3">
                      <img src={icon} alt={label} className="size-11" loading="lazy" />
                      {label}
                    </span>
                    <ArrowRight className="size-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </a>
                ))}
              </div>
            </div>
            <div className="lg:col-span-7">
              <img src={b.image} alt={b.title} className="w-full h-auto rounded-2xl" loading="lazy" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
