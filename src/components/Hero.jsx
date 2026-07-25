import { Star, Play } from './icons.jsx'
import HeroLottie from './HeroLottie.jsx'

export default function Hero() {
  return (
    <>
      <div className="w-full relative lg:h-[720px] lg:max-h-[720px] bg-[#f6f6f6] py-15 lg:py-0 overflow-hidden">
        <div className="relative z-[1] max-w-9xl mx-auto grid items-center grid-cols-1 lg:grid-cols-2 lg:max-h-[720px] h-full">
          <div className="flex flex-col justify-center gap-4 w-full px-4 lg:px-8 pt-8 pb-6 lg:py-30">
            <div className="flex gap-2 items-center">
              <span className="flex">
                {[...Array(5)].map((_, i) => <Star key={i} className="size-4" />)}
              </span>
              <p className="text-sm font-normal leading-[1.5em] flex gap-2">
                <span>700+</span>
                <span className="text-[#888]">5 star reviews</span>
              </p>
            </div>

            <h1 className="h2 max-w-xl">Manage devices and everything they touch</h1>

            <p className="max-w-md">
              See how compliance, productivity, and security are easier in a unified
              platform that starts with strong devices.
            </p>

            <form
              className="relative z-10 pb-6 pt-10 max-w-md w-full"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  placeholder="Enter your work email"
                  aria-label="Work email"
                  className="flex-1 rounded-lg border border-terminal/15 bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-terminal/40"
                />
                <button type="submit" className="btn btn--primary">Book a demo</button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:absolute inset-0 lg:grid grid-cols-2 lg:overflow-clip pointer-events-none">
          <div />
          <div className="relative">
            <HeroLottie
              ariaLabel="Homepage Hero Animation showing Iru selling points"
              className="h-[420px] xs:h-[520px] md:w-full md:h-auto lg:w-auto lg:h-[760px] lg:-top-4 lg:absolute z-0 -left-20 -translate-x-2.5 aspect-[1350/1110]"
            />
          </div>
        </div>
      </div>

      <ProductivityBand />
    </>
  )
}

function ProductivityBand() {
  return (
    <section className="hidden lg:block w-full bg-terminal mx-auto text-white overflow-hidden">
      <div className="max-w-9xl mx-auto relative flex flex-col lg:flex-row items-center gap-8 lg:gap-12 pb-8 lg:p-0">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 lg:gap-12 px-4 lg:px-0 shrink">
          <div className="w-auto max-w-lg lg:max-w-none pl-0 lg:pl-8">
            <h2 className="h4 pt-8 pb-0 text-center lg:text-start text-wrap lg:py-10 !m-0">
              Don't let bad IT tools destroy your productivity.
            </h2>
          </div>
        </div>

        <div className="hidden lg:block grow w-4/5 xl:w-[40%] h-auto" />

        <div className="flex justify-center px-8 sm:px-0">
          <div className="relative w-full group lg:absolute lg:right-0 lg:top-0 lg:h-full lg:w-[450px]">
            <video autoPlay loop muted playsInline className="h-full w-full max-w-[450px] lg:max-w-none object-cover">
              <source src="assets/video/devices-man.mp4" type="video/mp4" />
            </video>
            <div
              className="hidden lg:block absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(90deg, #0C0C29 0%, rgba(12, 12, 41, 0.00) 55%)' }}
            />
            <a
              href="/devices-man/"
              className="group hidden lg:flex items-center justify-center gap-2.5 shrink-0 w-fit mx-auto lg:absolute lg:left-0 lg:top-1/2 lg:-translate-y-1/2 pb-0.5 hover:cursor-pointer"
            >
              <span className="relative w-[21px] h-[17px] flex items-center justify-center">
                <Play className="w-[14px] h-[14px]" />
              </span>
              <span className="text-base font-medium">Watch the video</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
