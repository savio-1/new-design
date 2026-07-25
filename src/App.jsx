import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import TrustedBy from './components/TrustedBy.jsx'
import Products from './components/Products.jsx'
import Config from './components/Config.jsx'
import IruAI from './components/IruAI.jsx'
import Stats from './components/Stats.jsx'
import Testimonials from './components/Testimonials.jsx'
import CTA from './components/CTA.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  return (
    <div className="font-sans relative text-terminal bg-cursor overflow-x-hidden">
      <Header />
      <main>
        <Hero />
        <TrustedBy />
        <Products />
        <Config />
        <IruAI />
        <Stats />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
