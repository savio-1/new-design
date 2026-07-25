const LOGOS = [
  ['airbus', 'Airbus'], ['replit', 'Replit'], ['amplitude', 'Amplitude'], ['demandbase', 'Demandbase'],
  ['mclaren', 'McLaren'], ['vercel', 'Vercel'], ['gocardless', 'GoCardless'], ['betterhelp', 'BetterHelp'],
  ['lifetime', 'Lifetime'], ['plaid', 'Plaid'], ['glean', 'Glean'], ['cursor', 'Cursor'],
  ['cloudera', 'Cloudera'], ['wise', 'Wise'], ['bumble', 'Bumble'], ['a24', 'A24'],
  ['apollo', 'Apollo'], ['intercom', 'Intercom'], ['lottiefiles', 'LottieFiles'], ['pendo', 'Pendo'], ['turo', 'Turo'],
]

export default function TrustedBy() {
  const strip = [...LOGOS, ...LOGOS]
  return (
    <section className="py-16 lg:py-20">
      <p className="mx-auto text-base font-medium text-center px-4 mb-10" style={{ maxWidth: 900 }}>
        Trusted by teams at 6,000+ companies
      </p>
      <div className="marquee-container relative overflow-hidden w-full">
        <div className="marquee-content flex w-max">
          {strip.map(([slug, name], i) => (
            <div key={slug + i} className="relative shrink-0" style={{ paddingRight: 80 }}>
              <img
                src={`assets/logos/${slug}.svg`}
                alt={name}
                className="size-[90px] md:size-[100px] object-contain"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent" />
      </div>
    </section>
  )
}
