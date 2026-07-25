import { useRevealGroup } from '../hooks/useReveal.js'

const STATS = [
  ['Hours saved each month¹', '50'],
  ['Teams using Iru', '6,000+'],
  ['Zero-day exploits stopped²', '2.3x'],
  ['Rating from 700+ G2 reviews', '4.75/5'],
]

export default function Stats() {
  const scope = useRevealGroup('[data-reveal]')
  return (
    <section ref={scope} className="max-w-9xl mx-auto px-4 lg:px-8 py-16 lg:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        <div data-reveal>
          <h2 className="h3 text-left" style={{ maxWidth: 900 }}>Numbers don&rsquo;t lie</h2>
        </div>
        <div data-reveal>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-14">
            {STATS.map(([label, value]) => (
              <div key={label} className="border-t border-terminal/10 pt-6">
                <dt className="text-base mb-4">{label}</dt>
                <dd className="h-display m-0">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm mt-8 mb-0 opacity-60 space-y-2">
            <span className="block">1 Demandbase Switches to Iru to Supercharge Productivity, Customer Story 2025</span>
            <span className="block">2 Miercom competitive assessment of macOS EDR solutions 2025</span>
          </p>
        </div>
      </div>
    </section>
  )
}
