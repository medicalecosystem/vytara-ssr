'use client';

import React, {
  useState,
  useRef,
  useMemo,
  useLayoutEffect,
  useEffect,
  type ReactNode
} from 'react';


import { Menu, X, Lock, AlertCircle, Users, Brain } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
interface ChildrenProps {
  children: ReactNode;
}

interface TextChildrenProps {
  children: string;
}

interface FeatureStackCardProps {
  children: ReactNode;
  color: string;
  top?: string;
}

/* ========================= ScrollFloat ========================= */
const ScrollFloat: React.FC<TextChildrenProps> = ({ children }) => {
  const ref = useRef<HTMLHeadingElement | null>(null);

  const chars = useMemo(() => {
    const text = typeof children === 'string' ? children : '';
    return text.split('').map((c, i) => (
      <span key={i} className="inline-block">
        {c === ' ' ? '\u00A0' : c}
      </span>
    ));
  }, [children]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const chars = el.querySelectorAll('span');

      gsap.fromTo(
        chars,
        {
          opacity: 0,
          yPercent: 120,
          scaleY: 2,
          scaleX: 0.6
        },
        {
          opacity: 1,
          yPercent: 0,
          scaleY: 1,
          scaleX: 1,
          stagger: 0.05,
          ease: 'back.inOut(2)',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 85%',
            end: 'bottom 60%',
            scrub: 2
          }
        }
      );
    });

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

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
const ScrollReveal: React.FC<TextChildrenProps> = ({ children }) => {
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

      // CARD COLOR SYNC on desktop only
      if (window.innerWidth >= 768) {
        const cards = document.querySelectorAll('.feature-card');

        ScrollTrigger.create({
          trigger: cards[0],
          start: 'top center',
          end: 'bottom center',
          scrub: true,
          onEnter: () =>
            gsap.to(ref.current, { color: '#ffffff', duration: 0.3 }),
          onLeaveBack: () =>
            gsap.to(ref.current, { color: '#000000', duration: 0.3 })
        });

        ScrollTrigger.create({
          trigger: cards[1],
          start: 'top center',
          end: 'bottom center',
          scrub: true,
          onEnter: () =>
            gsap.to(ref.current, { color: '#000000', duration: 0.3 }),
          onLeaveBack: () =>
            gsap.to(ref.current, { color: '#ffffff', duration: 0.3 })
        });

        ScrollTrigger.create({
          trigger: cards[2],
          start: 'top center',
          end: 'bottom center',
          scrub: true,
          onEnter: () =>
            gsap.to(ref.current, { color: '#ffffff', duration: 0.3 }),
          onLeaveBack: () =>
            gsap.to(ref.current, { color: '#000000', duration: 0.3 })
        });
      }

    });

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <h2
      ref={ref}
      className="text-[clamp(1.8rem,4vw,3rem)] font-serif text-black text-center leading-tight z-50 whitespace-nowrap"
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

/* ========================= PLASMA BACKGROUND ========================= */
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { redirect } from 'next/dist/server/api-utils';

interface PlasmaProps {
  color?: string;
  speed?: number;
  direction?: 'forward' | 'reverse' | 'pingpong';
  scale?: number;
  opacity?: number;
  mouseInteractive?: boolean;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 0.5, 0.2];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const vertex = `#version 300 es
precision highp float;
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uCustomColor;
uniform float uUseCustomColor;
uniform float uSpeed;
uniform float uDirection;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseInteractive;
out vec4 fragColor;

void mainImage(out vec4 o, vec2 C) {
  vec2 center = iResolution.xy * 0.5;
  C = (C - center) / uScale + center;

  vec2 mouseOffset = (uMouse - center) * 0.0002;
  C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);

  float i, d, z, T = iTime * uSpeed * uDirection;
  vec3 O, p, S;

  for (vec2 r = iResolution.xy, Q; ++i < 60.; O += o.w/d*o.xyz) {
    p = z*normalize(vec3(C-.5*r,r.y));
    p.z -= 4.;
    S = p;
    d = p.y-T;

    p.x += .4*(1.+p.y)*sin(d + p.x*0.1)*cos(.34*d + p.x*0.05);
    Q = p.xz *= mat2(cos(p.y+vec4(0,11,33,0)-T));
    z+= d = abs(sqrt(length(Q*Q)) - .25*(5.+S.y))/3.+8e-4;
    o = 1.+sin(S.y+p.z*.5+S.z-length(S-p)+vec4(2,1,0,8));
  }

  o.xyz = tanh(O/1e4);
}

bool finite1(float x){ return !(isnan(x) || isinf(x)); }
vec3 sanitize(vec3 c){
  return vec3(
    finite1(c.r) ? c.r : 0.0,
    finite1(c.g) ? c.g : 0.0,
    finite1(c.b) ? c.b : 0.0
  );
}

void main() {
  vec4 o = vec4(0.0);
  mainImage(o, gl_FragCoord.xy);
  vec3 rgb = sanitize(o.rgb);

  float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
  vec3 customColor = intensity * uCustomColor;
  vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));

  float alpha = length(rgb) * uOpacity;
  fragColor = vec4(finalColor, alpha);
}`;

export const Plasma: React.FC<PlasmaProps> = ({
  color = '#ffffff',
  speed = 1,
  direction = 'forward',
  scale = 1,
  opacity = 1,
  mouseInteractive = true
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const useCustomColor = color ? 1.0 : 0.0;
    const customColorRgb = color ? hexToRgb(color) : [1, 1, 1];

    const directionMultiplier = direction === 'reverse' ? -1.0 : 1.0;

    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });
    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    containerRef.current.appendChild(canvas);

    const geometry = new Triangle(gl);

    const program = new Program(gl, {
      vertex: vertex,
      fragment: fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uCustomColor: { value: new Float32Array(customColorRgb) },
        uUseCustomColor: { value: useCustomColor },
        uSpeed: { value: speed * 0.4 },
        uDirection: { value: directionMultiplier },
        uScale: { value: scale },
        uOpacity: { value: opacity },
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseInteractive: { value: mouseInteractive ? 1.0 : 0.0 }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseInteractive) return;
      const rect = containerRef.current!.getBoundingClientRect();
      mousePos.current.x = e.clientX - rect.left;
      mousePos.current.y = e.clientY - rect.top;
      const mouseUniform = program.uniforms.uMouse.value as Float32Array;
      mouseUniform[0] = mousePos.current.x;
      mouseUniform[1] = mousePos.current.y;
    };

    if (mouseInteractive) {
      containerRef.current.addEventListener('mousemove', handleMouseMove);
    }

    const setSize = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height);
      const res = program.uniforms.iResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
    };

    const ro = new ResizeObserver(setSize);
    ro.observe(containerRef.current);
    setSize();

    let raf = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      let timeValue = (t - t0) * 0.001;
      if (direction === 'pingpong') {
        const pingpongDuration = 10;
        const segmentTime = timeValue % pingpongDuration;
        const isForward = Math.floor(timeValue / pingpongDuration) % 2 === 0;
        const u = segmentTime / pingpongDuration;
        const smooth = u * u * (3 - 2 * u);
        const pingpongTime = isForward ? smooth * pingpongDuration : (1 - smooth) * pingpongDuration;
        (program.uniforms.uDirection as any).value = 1.0;
        (program.uniforms.iTime as any).value = pingpongTime;
      } else {
        (program.uniforms.iTime as any).value = timeValue;
      }
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (mouseInteractive && containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
      }
      try {
        containerRef.current?.removeChild(canvas);
      } catch {}
    };
  }, [color, speed, direction, scale, opacity, mouseInteractive]);

  return <div ref={containerRef} className="w-full h-full relative overflow-hidden" />;
};

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
    <div className="bg-white relative">
      <div className="fixed inset-0 z-0">
        <Plasma
          color="#14b8a6"
          speed={0.6}
          direction="forward"
          scale={1.1}
          opacity={0.8}
          mouseInteractive={true}
        />
      </div>
      <div className="relative z-10">

        {/* NAV */}
        <nav className="sticky top-0 z-50 bg-white border-b">
          <div className="flex items-center justify-between px-6 py-4 md:grid md:grid-cols-3 md:gap-0">

            {/* LOGO */}
            <div className="flex gap-2 items-center md:justify-start">
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
                {menu ? <X /> : <Menu />}
              </button>
            </div>

          </div>

          {/* MOBILE DROPDOWN */}
          {menu && (
            <div className="bg-white shadow-md md:hidden">
              {[
                ['Get Started', 'login'],
                ['Watch Demo', 'demo'],
                ['Mission', 'mission'],
                ['Features', 'features'],
                ['Contact', 'footer'],
              ].map(([t, id]) => (
                <button
                  key={id}
                  onClick={() => nav(id)}
                  className="block px-6 py-4 border-b text-left"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* HERO TITLE */}
        <div className="px-4 pt-12 pb-8 max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-black text-center">Why Use Vytara?</h1>
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
                <button key={i} onClick={() => setExpanded(expanded === i ? null : i)} className="md:flex-1">
                  <div
                    className={`rounded-2xl p-5 w-[120px] md:w-[320px] md:ml-[-100px] transition h-full flex flex-col justify-center md:flex md:flex-col md:justify-center ${
                      expanded === i
  ? `fixed left-1/2 transform -translate-x-1/2 -translate-y-1/2
     top-[40%] md:top-[50%]
     w-[95vw] md:w-full
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
        <section id="features" className="px-4 py-8 bg-gray-50 max-w-6xl mx-auto">
          <ScrollReveal>So what do we do exactly?</ScrollReveal>

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
                <img src="images/vytara/sosfeature.jpg" className="rounded-2xl flex-shrink-0 md:order-2 order-1" alt="Emergency SOS" />
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

            <FeatureStackCard color="#14b8a6" top="md:top-[15vh] top-[25vh]">
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
          className="bg-gray-900 text-white py-12"
        >
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
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
              <div className="md:col-span-1 hidden md:block">
                <h3 className="font-semibold text-lg mb-4">Contact Us</h3>
                <div className="space-y-2 text-gray-400 text-sm">
                  <p>Email: hello@vytara.com</p>
                  <p>Phone: +1 (555) 123-4567</p>
                  <p>Address: 123 Health St, Medical City, MC 12345</p>
                </div>
              </div>

              {/* LEGAL */}
              <div className="md:col-span-1 hidden md:block">
                <h3 className="font-semibold text-lg mb-4">Legal</h3>
                <div className="space-y-2 text-gray-400 text-sm">
                  <a href="#" className="block hover:text-white transition">Privacy Policy</a>
                  <a href="#" className="block hover:text-white transition">Terms of Service</a>
                  <a href="#" className="block hover:text-white transition">Cookie Policy</a>
                  <a href="#" className="block hover:text-white transition">HIPAA Compliance</a>
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