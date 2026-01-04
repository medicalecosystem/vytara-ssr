 'use client';

import React, {
  useState,
  useRef,
  useMemo,
  useLayoutEffect,
  useEffect
} from 'react';

import { Menu, X, Lock, AlertCircle, Users, Brain } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

function BeamsBackground() {
  return (
    <>
      <style jsx global>{`
        html, body {
          overflow-x: hidden !important;
        }
          .beams-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #134e4a 0%, #14b8a6 50%, #134e4a 100%);
  overflow: hidden;
  z-index: 0;
}


        .beam {
          position: absolute;
          width: 2px;
          height: 100%;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(20, 184, 166, 0.3),
            transparent
          );
          animation: beam-animation 8s ease-in-out infinite;
          filter: blur(1px);
        }

        @keyframes beam-animation {
          0%, 100% {
            opacity: 0.3;
            transform: translateY(0px);
          }
          50% {
            opacity: 0.8;
            transform: translateY(-50px);
          }
        }

        .beam:nth-child(1) {
          left: 10%;
          animation-delay: 0s;
          height: 150%;
        }

        .beam:nth-child(2) {
          left: 20%;
          animation-delay: 1s;
          height: 200%;
        }

        .beam:nth-child(3) {
          left: 30%;
          animation-delay: 2s;
          height: 180%;
        }

        .beam:nth-child(4) {
          left: 50%;
          animation-delay: 3s;
          height: 200%;
        }

        .beam:nth-child(5) {
          left: 70%;
          animation-delay: 2s;
          height: 180%;
        }

        .beam:nth-child(6) {
          left: 80%;
          animation-delay: 1s;
          height: 200%;
        }

        .beam:nth-child(7) {
          left: 90%;
          animation-delay: 0s;
          height: 150%;
        }

        .radial-gradient-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at center,
            transparent 0%,
            rgba(255, 255, 255, 0.8) 100%
          );
          pointer-events: none;
          z-index: 1;
        }
      `}</style>

      <div className="beams-gradient">
        <div className="beam"></div>
        <div className="beam"></div>
        <div className="beam"></div>
        <div className="beam"></div>
        <div className="beam"></div>
        <div className="beam"></div>
        <div className="beam"></div>
        <div className="radial-gradient-overlay"></div>
      </div>
    </>
  );
}

type TextChildrenProps = {
  children: string;
};

type FeatureStackCardProps = {
  children: React.ReactNode;
  color: string;
  top?: string;
};

/* ========================= ScrollFloat ========================= */
type ScrollFloatProps = {
  children: string;
};

const ScrollFloat = ({ children }: ScrollFloatProps) => {
  const ref = useRef<HTMLHeadingElement | null>(null);

  const chars = useMemo(() => {
    return children.split('').map((c, i) => (
      <span key={i} className="inline-block">
        {c === ' ' ? '\u00A0' : c}
      </span>
    ));
  }, [children]);

  return (
    <h2
      ref={ref}
      className="text-4xl md:text-6xl font-serif text-black text-center overflow-hidden leading-tight"
    >
      {chars}
    </h2>
  );
};

/* ========================= ScrollReveal With Title Pin + Color Sync ========================= */
const ScrollReveal: React.FC<TextChildrenProps & { menuOpen?: boolean }> = ({ children, menuOpen = false }) => {
  const ref = useRef<HTMLHeadingElement | null>(null);

  const words = useMemo(
    () =>
      children.split(' ').map((w, i) => (
        <span key={i} className="inline-block mr-2 word">
          {w}
        </span>
      )),
    [children]
  );

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const wordsEl = el.querySelectorAll('.word');

      // reveal animation
      gsap.fromTo(
        wordsEl,
        { opacity: 0.1, filter: 'blur(8px)' },
        {
          opacity: 1,
          filter: 'blur(0px)',
          stagger: 0.08,
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 85%',
            end: 'bottom 60%',
            scrub: 2
          }
        }
      );

      // pin title
      ScrollTrigger.create({
        trigger: '#features',
        start: window.innerWidth >= 768 ? 'top top+=90' : 'top top+=60',
        end: 'bottom top',
        pin: ref.current,
        pinSpacing: false
      });

      // CARD COLOR SYNC: desktop (>= 768px) OR mobile when menu is open
      if (window.innerWidth >= 768 || menuOpen) {
        const cards = document.querySelectorAll('.feature-card');

        ScrollTrigger.create({
          trigger: cards[0],
          start: 'top center',
          end: 'bottom center',
          scrub: true,
          onUpdate: (self) => {
            if (self.isActive) {
              gsap.to(ref.current, { color: '#ffffff', duration: 0.3 });
            } else {
              gsap.to(ref.current, { color: '#000000', duration: 0.3 });
            }
          }
        });

        ScrollTrigger.create({
          trigger: cards[1],
          start: 'top center',
          end: 'bottom center',
          scrub: true,
          onUpdate: (self) => {
            if (self.isActive) {
              gsap.to(ref.current, { color: '#000000', duration: 0.3 });
            } else {
              gsap.to(ref.current, { color: '#ffffff', duration: 0.3 });
            }
          }
        });

        ScrollTrigger.create({
          trigger: cards[2],
          start: 'top center',
          end: 'bottom center',
          scrub: true,
          onUpdate: (self) => {
            if (self.isActive) {
              gsap.to(ref.current, { color: '#ffffff', duration: 0.3 });
            } else {
              gsap.to(ref.current, { color: '#000000', duration: 0.3 });
            }
          }
        });
      } else {
        // Ensure title remains black on mobile/tablet (< 768px) when menu is closed
        gsap.set(ref.current, { color: '#000000' });
      }

    });

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <h2
      ref={ref}
      className={`text-[clamp(1.8rem,4vw,3rem)] font-serif text-black text-center leading-tight whitespace-nowrap z-50 ${
        menuOpen && window.innerWidth < 768 ? 'hidden' : 'block'
      }`}
    >
      {words}
    </h2>
  );
};

/* ========================= SIMPLE STICKY FEATURE CARD ========================= */
const FeatureStackCard: React.FC<FeatureStackCardProps> = ({
  children,
  color,
  top = 'top-[15vh]'
}) => (
  <div
    className={`feature-stack-card w-full h-80 md:h-80 rounded-[32px] shadow-xl flex items-center justify-between px-10 sticky ${top} md:flex-row flex-col`}
    style={{ backgroundColor: color }}
  >
    {children}
  </div>
);


/* ========================= MAIN PAGE ========================= */
export default function Landing() {
  const [menu, setMenu] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  

  /* ----- MISSION ANIMATION ----- */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.mission-top-left', {
        x: -60,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.mission-top-left',
          start: 'top 85%',
          end: 'bottom 70%',
          scrub: false,
          toggleActions: 'play none none reverse'
        }
      });

      gsap.from('.mission-right', {
        x: 60,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.mission-right',
          start: 'top 85%',
          end: 'bottom 70%',
          scrub: false,
          toggleActions: 'play none none reverse'
        }
      });

      gsap.from('.mission-bottom-left', {
        x: -60,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.mission-bottom-left',
          start: 'top 85%',
          end: 'bottom 70%',
          scrub: false,
          toggleActions: 'play none none reverse'
        }
      });
    });

    return () => ctx.revert();
  }, []);

  const nav = (id: string) => {
    setMenu(false);
    if (id === 'login') return (window.location.href = '/login');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
  <div className="relative">
    
    {/* BACKGROUND */}
    <BeamsBackground />

    {/* PAGE CONTENT ABOVE BACKGROUND */}
    <div className="relative z-10">


          
    <div className="relative z-10 bg-transparent"></div>
        {/* NAV */}
        <nav className="sticky top-0 z-50 bg-white">
          <div className="flex items-center justify-between px-6 py-4 md:grid md:grid-cols-3 md:gap-0">

            {/* LOGO */}
            <div className="flex gap-2 items-center md:justify-start">
              <div className="w-8 h-8 bg-gradient-to-r from-[#14b8a6] to-[#134E4A] rounded-lg" />
              <p className="font-bold text-[#14b8a6] text-xl">Vytara</p>
            </div>

            {/* DESKTOP NAV CENTER */}
            <div className="hidden md:flex gap-4 justify-center">
              <button onClick={() => nav('demo')} className="text-gray-700 hover:text-[#14b8a6] transition">
                Watch Demo
              </button>
              <button onClick={() => nav('mission')} className="text-gray-700 hover:text-[#14b8a6] transition">
                Mission
              </button>
              <button onClick={() => nav('features')} className="text-gray-700 hover:text-[#14b8a6] transition">
                Features
              </button>
              <button onClick={() => nav('footer')} className="text-gray-700 hover:text-[#14b8a6] transition">
                Contact
              </button>
            </div>

            {/* RIGHT SIDE BUTTONS */}
            <div className="flex items-center gap-3 md:justify-end">
              <button
                onClick={() => nav('login')}
                className="bg-gradient-to-r from-[#14b8a6] to-[#134E4A] text-white px-4 py-2 rounded-full font-semibold hover:from-[#134E4A] hover:to-[#14b8a6] transition"
              >
                Get Started
              </button>

              <button onClick={() => setMenu(!menu)} className="md:hidden">
                {menu ? <X className="text-[#134e4a]" /> : <Menu className="text-[#134e4a]" />}
              </button>
            </div>

          </div>

          {/* MOBILE DROPDOWN */}
          {menu && (
            <div className="bg-white shadow-md md:hidden z-[60]">
              {[
                ['Get Started', 'login'],
                ['Watch Demo', 'demo'],
                ['Mission', 'mission'],
                ['Features', 'features'],
                ['Contact', 'footer'],
              ].map(([t, id], index, array) => (
                <div key={id}>
                  <button
                    onClick={() => nav(id)}
                    className="block px-6 py-4 text-left text-[#134E4A] w-full"
                  >
                    {t}
                  </button>
                  {index < array.length - 1 && <hr className="w-full border-gray-300" />}
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* WHAT IS VYTARA */}
        <div className="px-4 pt-12 pb-8 max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-black text-center">What Is Vytara?</h1>
          <p className="text-center text-gray-600 italic text-2xl mt-4">Vytara is your one stop destination to have full control over your medical status and care for your loved one's wellness better</p>
        </div>

        {/* HERO TITLE */}
        <div className="px-4 pt-12 pb-8 max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-black text-center">Why Use Vytara?</h1>
        </div>

        {/* ===== HERO ===== */}
        <section id="hero" className="px-4 pt-6 pb-2 md:pt-12 max-w-6xl mx-auto min-h-[60vh]">
          <div className="grid grid-cols-3 gap-4 scale-[0.9] md:scale-100">

            {/* LEFT CARDS */}
            <div className="col-span-1 flex flex-col gap-4 relative z-10 right-4 md:h-[55vh]">
              {[
                {
                  title: 'Disorganized Documents?',
                  icon: Lock,
                  expandedText: 'No more scattered documents, Vytara has all your medical documents securely stored in one place'
                },
                {
                  title: 'Need On-Hand Emergency Service?',
                  icon: AlertCircle,
                  expandedText: 'Emergency services are one click away from reaching you at your most vulnerable times.'
                },
                {
                  title: 'Unmonitored Family Health?',
                  icon: Users,
                  expandedText: 'Freely monitor the wellness of your loved ones with Vytara'
                }
              ].map(({ title, icon: Icon, expandedText }, i) => (
                <button
                  key={i}
                  onClick={() => window.innerWidth < 768 && setExpanded(expanded === i ? null : i)}
                  onMouseEnter={() => window.innerWidth >= 768 && setExpanded(i)}
                  onMouseLeave={() => window.innerWidth >= 768 && setExpanded(null)}
                  className="md:flex-1"
                >
                  <div
                    className={`rounded-2xl p-5 w-[120px] md:w-[320px] md:ml-[-100px] transition h-full flex flex-col justify-center md:flex md:flex-col md:justify-center ${
                      expanded === i
  ? `fixed left-1/2 transform -translate-x-1/2 -translate-y-1/2
     top-[40%] md:top-[50%]
     w-[95vw] md:w-96 md:h-96
     h-auto max-h-[85vh] md:max-h-[25vh]
     shadow-xl z-50 p-8
     transition-all duration-300 ease-out
     ${i % 2 === 0 ? 'bg-[#14b8a6]' : 'bg-[#134E4A]'}`
  : i % 2 === 0
  ? 'bg-[#14b8a6] text-white border-8 border-white/20 shadow-[4px_0_12px_rgba(255,255,255,0.3)]'
  : 'bg-[#134E4A] text-white border-8 border-white/20 shadow-[4px_0_12px_rgba(255,255,255,0.3)]'

                    }`}
                  >
                    {expanded === i ? (
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-3 mb-4">
                          <Icon size={36} className="flex-shrink-0" />
                          
                        </div>
                        <p className="text-sm leading-relaxed">
                          {expandedText}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <p className="font-semibold text-xs md:text-sm leading-tight text-center">{title}</p>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* SPLINE */}
            <div className="col-span-2 rounded-2xl overflow-hidden bg-gray-200 h-[55vh]">
              <iframe
                src="https://my.spline.design/pillanddnaanimation-LwakakaJapFBlJVIbImUzQUG/"
                className="w-full h-full"
              />
            </div>
          </div>
        </section>

        {/* GET STARTED */}
        <section className="px-4 py-8 text-center">
          <button
            onClick={() => nav('login')}
            className="bg-gradient-to-r from-[#14b8a6] to-[#134E4A] text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-[#134E4A] hover:to-[#14b8a6] transition"
          >
            Get Started
          </button>
        </section>

        {/* DEMO */}
        <section id="demo" className="px-4 pb-8 max-w-6xl mx-auto -mt-4">
          <div className="h-[40vh] md:h-[50vh] rounded-3xl bg-gray-300 flex justify-center items-center">
            <div className="text-center">
              <p className="text-6xl">▶</p>
              <p className="text-gray-600 mt-2">Demo Video</p>
            </div>
          </div>
        </section>

        {/* PROMO */}
        <section className="px-4 py-10 text-center text-gray-700">
          <p className="text-xl">Vytara revolutionizes health management.</p>
          <p>Your health. Your family. Your control.</p>
        </section>

        {/* ===== MISSION ===== */}
        <section id="mission" className="px-4 py-14 max-w-6xl mx-auto">
          <ScrollFloat>Mission</ScrollFloat>

          <div className="grid grid-cols-2 gap-6 mt-10">

            {/* LEFT CARDS */}
            <div className="flex flex-col gap-6">
              <div className="bg-[#288f88] h-48 rounded-3xl mission-top-left overflow-hidden">
                <img src="/images/vytara/missionimg.jpg" className="w-full h-full object-cover" alt="Mission" />
              </div>
              <div className="bg-[#10736C] h-48 rounded-3xl mission-bottom-left flex flex-col items-start justify-center p-6 text-white">
                <Brain size={40} className="mb-3" />
                <h3 className="text-lg font-bold mb-2">Smart Analysis</h3>
                <p className="text-sm leading-relaxed">
                  Beyond secure storage, Vytara uses AI to summarize your medical records.
                </p>
              </div>
            </div>

            {/* RIGHT BIG CARD */}
            <div className="bg-[#134E4A] rounded-3xl mission-right h-96 flex flex-col items-start justify-center p-8 text-white text-left">
              <Users size={48} className="mb-4" />
              <h3 className="text-2xl font-bold mb-4">Empower Family Wellness</h3>
              <p className="text-sm leading-relaxed mb-3">
                Vytara redefines family wellness by letting you create interconnected health profiles for every family member.
              </p>
            </div>

          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section id="features" className="px-4 py-8 max-w-5xl mx-auto">
          <ScrollReveal menuOpen={menu}>So what do we do exactly?</ScrollReveal>

          <div className="mt-[18vh]">

            <FeatureStackCard color="#14b8a6" top="md:top-[15vh] top-[20vh]">
              <div className="feature-card flex w-full justify-between items-center gap-8 md:flex-row flex-col">
                <div className="flex-1 text-left md:order-1 order-2">
                  <p className="text-2xl font-bold text-white mb-3">
                    Send Emergency Alerts
                  </p>
                  <p className="text-white text-xs leading-relaxed">
                    Your emergency contacts and emergency services receive instant notifications including your location sharing.
                  </p>
                </div>
                <img src="images/sosfeature.jpg" className="rounded-2xl flex-shrink-0 md:order-2 order-1" alt="Emergency SOS" />
              </div>
            </FeatureStackCard>

            <FeatureStackCard color="#134E4A" top="md:top-[15vh] top-[20vh]">
              <div className="feature-card flex w-full justify-between items-center gap-8 md:flex-row flex-col">
                <div className="flex-1 text-left md:order-1 order-2">
                  <p className="text-2xl font-bold text-white mb-3">
                    Store Your Documents Securely
                  </p>
                  <p className="text-white text-xs leading-relaxed">
                    Organized and secure storage of all your medical documents in one place.
                  </p>
                </div>
                <img src="images/vytara/safestorefeature.jpg" className="rounded-2xl flex-shrink-0 md:order-2 order-1" alt="Secure Storage" />
              </div>
            </FeatureStackCard>

            <FeatureStackCard color="#14b8a6" top="md:top-[15vh] top-[20vh]">
              <div className="feature-card flex w-full justify-between items-center gap-8 md:flex-row flex-col">
                <div className="flex-1 text-left md:order-1 order-2">
                  <p className="text-2xl font-bold text-white mb-3">
                    Ease Your Family Wellness Concerns
                  </p>
                  <p className="text-white text-xs leading-relaxed">
                    Health profiles of your loved ones-at your fingertips!.
                  </p>
                </div>
                <img src="images/vytara/familyfeature.jpg" className="rounded-2xl flex-shrink-0 md:order-2 order-1" alt="Family Profiles" />
              </div>
            </FeatureStackCard>

          </div>
        </section>

        {/* FOOTER */}
        <footer
          id="footer"
          className="bg-gray-900 text-white py-8 md:py-12"
        >
          <div className="max-w-6xl mx-auto px-4">
            {/* DESKTOP FOOTER */}
            <div className="hidden md:grid md:grid-cols-3 gap-8">
              {/* BRAND */}
              <div className="md:col-span-1">
                <div className="flex gap-2 items-center mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#14b8a6] to-[#134E4A] rounded-lg" />
                  <p className="font-bold text-[#14b8a6] text-xl">Vytara</p>
                </div>
                <p className="text-gray-400 text-sm">
                  Healthcare, beautifully reimagined. Your health. Your family. Your control.
                </p>
              </div>

              {/* CONTACT US */}
              <div className="md:col-span-1">
                <h3 className="font-semibold text-lg mb-4">Contact Us</h3>
                <div className="space-y-2 text-gray-400 text-sm">
                  <p>Email: hello@vytara.com</p>
                  <p>Phone: 07738322228</p>
                  <p>Address: 327, 3rd Floor, Ajmera Sikova, ICRC, Ghatkopar West, Mumbai 400086</p>
                </div>
              </div>

              {/* LEGAL */}
              <div className="md:col-span-1">
                <h3 className="font-semibold text-lg mb-4">Legal</h3>
                <div className="space-y-2 text-gray-400 text-sm">
                  <a href="#" className="block hover:text-white transition">Privacy Policy</a>
                  <a href="#" className="block hover:text-white transition">Terms of Service</a>
                  <a href="#" className="block hover:text-white transition">Cookie Policy</a>
                  <a href="#" className="block hover:text-white transition">HIPAA Compliance</a>
                </div>
              </div>
            </div>

            {/* MOBILE FOOTER */}
            <div className="md:hidden">
              {/* BRAND */}
              <div className="flex gap-2 items-center mb-2">
                <div className="w-6 h-6 bg-gradient-to-r from-[#14b8a6] to-[#134E4A] rounded-lg" />
                <p className="font-bold text-[#14b8a6] text-lg">Vytara</p>
              </div>

              {/* CONTACT US AND LEGAL SIDE BY SIDE */}
              <div className="flex gap-4">
                {/* CONTACT US */}
                <div className="flex-1">
                  <h3 className="font-semibold text-xs mb-1">Contact Us</h3>
                  <div className="space-y-0.5 text-gray-400 text-xs">
                    <p>Email: hello@vytara.com</p>
                    <p>Phone: 07738322228</p>
                    <p>Address: 327, 3rd Floor, Ajmera Sikova, ICRC, Ghatkopar West, Mumbai 400086</p>
                  </div>
                </div>

                {/* LEGAL */}
                <div className="flex-1">
                  <h3 className="font-semibold text-xs mb-1">Legal</h3>
                  <div className="space-y-0.5 text-gray-400 text-xs">
                    <a href="#" className="block hover:text-white transition">Privacy Policy</a>
                    <a href="#" className="block hover:text-white transition">Terms of Service</a>
                    <a href="#" className="block hover:text-white transition">Cookie Policy</a>
                    <a href="#" className="block hover:text-white transition">HIPAA Compliance</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-8 pt-8 text-center hidden md:block">
              <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Vytara. All rights reserved.</p>
            </div>
          </div>
        </footer>

        <style jsx>{`
          @keyframes slide-in-left {
            from { opacity: 0; transform: translateX(-50px); }
            to { opacity: 1; transform: translateX(0); }
          }

          @keyframes slide-in-right {
            from { opacity: 0; transform: translateX(50px); }
            to { opacity: 1; transform: translateX(0); }
          }

          .animate-slide-in-left {
            animation: slide-in-left 0.7s ease-out forwards;
          }

          .animate-slide-in-right {
            animation: slide-in-right 0.7s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
}