export default function CTA() {
  return (
    <section className="max-w-9xl mx-auto px-4 lg:px-8">
      <div className="relative overflow-hidden flex items-center justify-center rounded-xl bg-terminal text-cursor my-8">
        <div className="text-center relative z-10 mx-auto px-8 py-16 md:py-32" style={{ maxWidth: 680 }}>
          <h2>Let your team focus on what matters</h2>
          <p className="mt-6 mb-0">
            Iru replaces fragmented tools with one AI-powered platform, so IT &amp; security
            spend less time chasing tickets and more time improving the business.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <a className="btn btn--secondary" href="https://www.iru.com/request-demo">Book a demo</a>
            <a className="btn btn--casper" href="https://www.iru.com/quote">Request a quote</a>
          </div>
        </div>
      </div>
    </section>
  )
}
