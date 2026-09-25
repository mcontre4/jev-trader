import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { FragmentedAnswer } from './components/FragmentedAnswer'
import { UnitRecord } from './components/UnitRecord'
import { AskSorno } from './components/AskSorno'
import { Pipeline } from './components/Pipeline'
import { Roles } from './components/Roles'
import { Integrations } from './components/Integrations'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <>
      <Nav />
      <main id="top">
        <Hero />
        <FragmentedAnswer />
        <UnitRecord />
        <AskSorno />
        <Pipeline />
        <Roles />
        <Integrations />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
