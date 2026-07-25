import { useRevealGroup } from '../hooks/useReveal.js'

const QUOTES = [
  {
    image: '/assets/quotes/hunters.jpg',
    quote: 'With Iru, we’ve significantly reduced IT workload, improved security posture, and enhanced the employee experience.',
    name: 'Erez Epstein',
    role: 'Senior Manager, IT & Operations at Hunters',
  },
  {
    image: '/assets/quotes/varo.jpg',
    quote: 'Iru is helping our endpoint security infrastructure to be the best it possibly can be.',
    name: 'Christian Corrales',
    role: 'Senior Security Engineer at Varo Bank',
  },
  {
    image: '/assets/quotes/rackspace.jpg',
    quote: 'One of the biggest eye-catchers for me was how quickly we could get our security posture up to speed.',
    name: 'Dorian Cordero',
    role: 'Systems Engineer at Rackspace Technology',
  },
]

export default function Testimonials() {
  const scope = useRevealGroup('[data-reveal]')
  return (
    <section ref={scope} className="max-w-9xl mx-auto px-4 lg:px-8 py-16 lg:py-24">
      <div data-reveal className="mb-12 lg:mb-16">
        <h3>Iru helps companies rewrite<br />the way work is done</h3>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {QUOTES.map((q) => (
          <div key={q.name} data-reveal className="border border-current/10 rounded-lg overflow-hidden w-full mx-auto">
            <div className="flex justify-center items-center aspect-video overflow-hidden">
              <img className="w-full h-auto object-cover" src={q.image} alt={q.name} loading="lazy" />
            </div>
            <div className="p-6 min-h-40 md:min-h-64 gap-6 flex flex-col justify-between">
              <blockquote className="text-base mb-6 m-0">&ldquo;{q.quote}&rdquo;</blockquote>
              <div>
                <cite className="text-base font-medium not-italic">{q.name}</cite>
                <p className="text-base mb-0 opacity-70">{q.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
