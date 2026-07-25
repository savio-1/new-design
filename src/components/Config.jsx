import { useRevealGroup } from '../hooks/useReveal.js'

const CARDS = [
  {
    image: '/assets/features/point-click.png',
    title: 'Fully automated and fully visual',
    body: 'Go from zero to fully configured in a couple hours, not weeks. Build assignments visually, push changes in minutes, and trace your configuration logic in seconds when something needs a closer look.',
  },
  {
    image: '/assets/features/cac.png',
    title: 'Config as code for full control',
    body: 'Manage your fleet the way you manage code. Version every change, review it in a pull request, and roll back anything from your repo. Built for teams that need control, history, and a peer review.',
  },
]

export default function Config() {
  const scope = useRevealGroup('[data-reveal]')
  return (
    <section ref={scope} className="max-w-9xl mx-auto px-4 lg:px-8 py-16 lg:py-24">
      <div data-reveal>
        <h2 className="mx-auto h3 text-center" style={{ maxWidth: 722 }}>
          Point and click <br /> or commit and push.
        </h2>
        <p className="mx-auto text-base text-center mt-6 mb-12" style={{ maxWidth: 502 }}>
          A visual interface for teams that want speed. Config as code for the ones that want control.
        </p>
      </div>

      <div data-reveal className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {CARDS.map((c) => (
          <div key={c.title} className="border border-current/10 rounded-2xl overflow-hidden w-full">
            <img src={c.image} alt={c.title} className="w-full h-auto my-0" loading="lazy" />
            <div className="p-6">
              <p className="text-base font-medium mt-0 mb-2">{c.title}</p>
              <p className="text-base my-0">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
