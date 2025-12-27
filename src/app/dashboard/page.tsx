'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Landing() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-[#F9FAFB] text-[#0F172A] min-h-screen">
      {/* HEADER */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all
        ${isScrolled
          ? 'border-b border-black/5 backdrop-blur-md bg-white/80'
          : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => scrollTo('hero')}
            className="flex items-center gap-3"
          >
            <div className="h-10 w-10 bg-black rounded-xl" />
            <span className="font-black tracking-tight text-lg">
              Vytara
            </span>
          </button>

          <nav className="hidden md:flex gap-8 text-sm text-black/70">
            <button onClick={() => scrollTo('features')}>Features</button>
            <button onClick={() => scrollTo('why')}>Why Vytara</button>
            <button onClick={() => scrollTo('pricing')}>Pricing</button>
          </nav>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/login')}
              className="text-sm px-5 py-2 rounded-full border border-black/10 hover:border-black transition font-semibold"
            >
              Sign In
            </button>

            <button
              onClick={() => router.push('/signup')}
              className="text-sm px-5 py-2 rounded-full bg-black text-white font-semibold hover:opacity-90 transition"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="hero" className="pt-40 pb-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-[12vw] md:text-[96px] leading-[1] font-black tracking-tight"
          >
            Healthcare,
            <br />
            finally designed
            <br />
            for humans.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mt-8 text-lg md:text-xl text-black/60 max-w-3xl"
          >
            Vytara organizes your medical life. Secure records, AI explanations,
            and clarity you can trust — created for families, elders, and people
            who want healthcare to feel simple again.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-10 flex gap-4"
          >
            <button
              onClick={() => router.push('/signup')}
              className="px-7 py-3 rounded-full bg-black text-white font-semibold hover:opacity-90 transition"
            >
              Get Started
            </button>

            <button
              onClick={() => scrollTo('features')}
              className="px-7 py-3 rounded-full border border-black/15 font-semibold hover:border-black transition"
            >
              Watch Demo
            </button>
          </motion.div>

          {/* HERO PANEL */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-16 rounded-3xl border border-black/10 bg-white shadow-[0_40px_80px_rgba(0,0,0,0.08)] overflow-hidden"
          >
            <div className="aspect-[16/8] bg-neutral-200 flex items-center justify-center text-black/50 text-xl font-semibold">
              Dashboard Preview Coming Soon
            </div>
          </motion.div>
        </div>
      </section>

      {/* VALUE SECTION */}
      <section
        id="features"
        className="py-28 px-6 border-t border-black/10 bg-white"
      >
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-14">
          {[
            {
              title: 'Calm Clarity',
              desc: 'Your medical records in one private home — beautifully organized.'
            },
            {
              title: 'AI That Explains',
              desc: 'No jargon. Vytara explains lab reports in clear human language.'
            },
            {
              title: 'Family Ready',
              desc: 'Profiles for parents, kids, and elders — designed responsibly.'
            }
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              viewport={{ once: true }}
              className="space-y-3"
            >
              <h3 className="font-black text-2xl">{card.title}</h3>
              <p className="text-black/60 text-lg">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHY SECTION */}
      <section
        id="why"
        className="py-28 px-6 border-t border-black/10"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight">
            A new standard
            <br />
            for personal health.
          </h2>

          <div className="grid md:grid-cols-2 gap-12 mt-12">
            <div className="space-y-6">
              <p className="text-black/70 text-lg leading-relaxed">
                Healthcare tools shouldn’t feel clinical, confusing, or cold.
                Vytara is intentionally designed — with compassion, good design
                ethics, and deep respect for your privacy.
              </p>

              <p className="text-black/70 text-lg leading-relaxed">
                Your life, your health, your story. All in one beautiful, secure place.
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-10 shadow-[0_20px_60px_rgba(0,0,0,.06)]">
              <ul className="space-y-4 text-lg font-medium">
                <li>✓ Private encrypted vault</li>
                <li>✓ AI summaries & report breakdown</li>
                <li>✓ Emergency ready profiles</li>
                <li>✓ Designed for families</li>
                <li>✓ Zero dark patterns</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        className="py-28 px-6 border-t border-black/10 bg-white"
      >
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-black">Simple Pricing</h2>
          <p className="text-black/60 mt-4">Start free. Upgrade anytime.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 px-6 border-t border-black/10 bg-white">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span className="font-black text-xl">Vytara</span>
          <span className="text-black/60">
            © {new Date().getFullYear()} Vytara Health
          </span>
        </div>
      </footer>
    </div>
  );
}
