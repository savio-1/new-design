import { LinkedIn, XLogo, YouTube } from './icons.jsx'

const PRODUCT_GROUPS = [
  { head: 'Identity', links: [['Workforce Identity', '/products/identity']] },
  {
    head: 'Endpoint',
    links: [
      ['Endpoint overview', '/products/endpoint'],
      ['Endpoint Management', '/products/endpoint/endpoint-management'],
      ['Endpoint Detection & Response', '/products/endpoint/endpoint-detection-response'],
      ['Vulnerability Management', '/products/endpoint/vulnerability-management'],
    ],
  },
  {
    head: 'Compliance',
    links: [
      ['Compliance Overview', '/products/compliance'],
      ['Compliance Automation', '/products/compliance/compliance-automation'],
      ['Trust Center', '/products/compliance/trust-center'],
    ],
  },
  { head: 'Iru AI', links: [['Iru AI Overview', '/iru-ai']] },
]

const RESOURCES = [
  ['Customer stories', '/resources/customer-stories'], ['Wall of love', '/reviews'],
  ['Threat intelligence', '/threats-vulnerabilities'], ['Library Items', '/library-items'],
  ['Definitions', '/resources/definitions'], ['Endpoint hub', '/endpoint'], ['Support docs', 'https://docs.iru.com/'],
]
const SOLUTIONS_DEVICE = [
  ['Mac', '/solutions/mac'], ['Windows', '/solutions/windows'], ['iPhone & iPad', '/solutions/iphone-ipad'],
  ['Apple TV', '/solutions/tvos'], ['Vision Pro', '/solutions/apple-vision'], ['Android', '/solutions/android'],
]
const SOLUTIONS_USE = [
  ['Zero-touch deployment', '/use-cases/zero-touch-deployment'], ['Automated Patching', '/use-cases/automate-patching/'],
  ['Configuration-as-code', '/use-cases/config-as-code'], ['Build with MCP', '/use-cases/mcp'],
]
const COMPANY = [
  ['About Iru', '/company/about'], ['Careers', '/company/careers'], ['Contact', '/contact'],
  ['Security', '/security'], ['The Iru blog', '/blog'], ['Customer referral program', '/referral-program'], ['Compare', '/compare'],
]
const GET_STARTED = [['Pricing', '/pricing'], ['Log in', '/login'], ['Book a demo', '/request-demo']]

function GroupHead({ children }) {
  return <span className="opacity-50 block">{children}</span>
}

export default function Footer() {
  return (
    <>
      {/* Stay up to date */}
      <section className="bg-terminal text-cursor">
        <div className="max-w-9xl mx-auto px-6 lg:px-8 pt-8 pb-12">
          <div className="grid md:flex justify-between gap-10 lg:gap-16 items-center border-b border-current/10 py-14">
            <div className="md:w-1/2 lg:w-1/3">
              <h2 className="mb-6 text-3xl lg:text-4xl">Stay up to date</h2>
              <p className="opacity-80">
                Iru&rsquo;s bi-weekly collection of articles, videos, and research to keep IT &amp; Security teams ahead of the curve.
              </p>
            </div>
            <div className="md:w-1/3 flex justify-end w-full">
              <form className="w-full max-w-md flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  aria-label="Email"
                  className="flex-1 rounded-lg border border-white/20 bg-transparent px-4 py-3.5 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/50 transition-colors"
                />
                <button type="submit" className="btn btn--secondary">Subscribe</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-terminal text-cursor" role="contentinfo">
        <h2 className="sr-only">Site Footer</h2>
        <div className="max-w-9xl mx-auto px-6 lg:px-8 pt-12">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-0">
            {/* Product */}
            <div>
              <h3 className="text-base font-medium opacity-50 mt-0 mb-4">Product</h3>
              {PRODUCT_GROUPS.map((g) => (
                <ul key={g.head} className="space-y-3 mb-12 p-0 list-none">
                  <li><GroupHead>{g.head}</GroupHead></li>
                  {g.links.map(([l, h]) => (
                    <li key={l}><a href={h} className="inline-flex gap-1 items-center hover:opacity-50">{l}</a></li>
                  ))}
                </ul>
              ))}
            </div>

            {/* Resources + Solutions */}
            <div>
              <h3 className="text-base font-medium opacity-50 mt-0 mb-4">Resources</h3>
              <ul className="space-y-3 mb-12 p-0 list-none">
                {RESOURCES.map(([l, h]) => (
                  <li key={l}><a href={h} className="inline-flex gap-1 items-center hover:opacity-50">{l}</a></li>
                ))}
              </ul>
              <ul className="space-y-3 mb-12 p-0 list-none">
                <li className="mb-4"><GroupHead>Solutions</GroupHead></li>
                <li><GroupHead>By Device</GroupHead></li>
                {SOLUTIONS_DEVICE.map(([l, h]) => (
                  <li key={l}><a href={h} className="inline-flex gap-1 items-center hover:opacity-50">{l}</a></li>
                ))}
              </ul>
              <ul className="space-y-3 mb-12 p-0 list-none">
                <li><span className="text-base font-medium opacity-50">By Use Case</span></li>
                {SOLUTIONS_USE.map(([l, h]) => (
                  <li key={l}><a href={h} className="inline-flex gap-1 items-center hover:opacity-50">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-base font-medium opacity-50 mt-0 mb-4">Company</h3>
              <ul className="space-y-3 mb-12 p-0 list-none">
                {COMPANY.map(([l, h]) => (
                  <li key={l}><a href={h} className="inline-flex gap-1 items-center hover:opacity-50">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Get Started */}
            <div>
              <h3 className="text-base font-medium opacity-50 mt-0 mb-4">Get Started</h3>
              <ul className="space-y-3 mb-12 p-0 list-none">
                {GET_STARTED.map(([l, h]) => (
                  <li key={l}><a href={h} className="inline-flex gap-1 items-center hover:opacity-50">{l}</a></li>
                ))}
              </ul>
              <div className="flex gap-8 mb-12">
                <a href="https://www.linkedin.com/company/officiallyiru" className="hover:opacity-50" rel="noopener" target="_blank"><LinkedIn /><span className="sr-only">Follow us on LinkedIn</span></a>
                <a href="https://x.com/officiallyiru" className="hover:opacity-50" rel="noopener" target="_blank"><XLogo /><span className="sr-only">Follow us on X</span></a>
                <a href="https://www.youtube.com/@officiallyiru" className="hover:opacity-50" rel="noopener" target="_blank"><YouTube /><span className="sr-only">Follow us on YouTube</span></a>
              </div>
            </div>
          </div>

          <div className="lg:flex lg:justify-between lg:items-end gap-8 pt-12">
            <div className="mb-12 lg:mb-0 lg:order-2">
              <div className="flex flex-wrap lg:justify-center gap-y-6 gap-x-8">
                <a href="/legal/privacy" className="hover:opacity-50">Privacy Policy</a>
                <span className="inline-flex items-center gap-1.5 cursor-pointer group"><span className="group-hover:opacity-50">Your Privacy Choices</span></span>
                <a href="/legal/accessibility" className="hover:opacity-50">Accessibility</a>
                <a href="/legal" className="hover:opacity-50">Legal</a>
              </div>
            </div>
            <div className="w-38 shrink-0 lg:order-1">
              <a href="/" className="inline-flex items-center gap-2 text-cursor">
                <img src="assets/logos/iru-logo.png" alt="" className="h-9 w-auto" />
                <span className="text-3xl font-medium tracking-tight lowercase">iru</span>
                <span className="sr-only">Iru Inc.</span>
              </a>
            </div>
            <div className="mt-16 lg:mt-0 block w-38 shrink-0 lg:order-3 text-sm opacity-60">English</div>
          </div>

          <div className="text-sm lg:text-center py-12 opacity-75">
            &copy; Copyright 2026 <a href="/" className="hover:opacity-50">Iru,&nbsp;Inc.</a> All&nbsp;rights&nbsp;reserved.
          </div>
        </div>
      </footer>
    </>
  )
}
