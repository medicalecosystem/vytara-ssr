// 'use client';

// import { supabase } from '@/lib/createClient';
// import React, { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { Eye } from 'lucide-react';
// import Image from 'next/image';

// export default function LoginSignupModal() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);

//   const router = useRouter();

//   const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setLoading(true);

//     const { data, error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (error || !data.user) {
//       setLoading(false);
//       alert('Login Failed: Invalid Credentials');
//       return;
//     }

//     const user = data.user;

//     setLoading(false);
//     alert('Login Successful');
//     router.push('/homepage');
//   };

//   const signInWithGoogle = async (e: React.MouseEvent<HTMLButtonElement>) => {
//     e.preventDefault();

//     const { error } = await supabase.auth.signInWithOAuth({
//       provider: 'google',
//       options: {
//         redirectTo: 'http://vytara-official.vercel.app/auth/callback',
//       },
//     });

//     if (error) {
//       alert('Error: ' + error.message);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-gradient-to-br from-[#309898]/20 via-white to-[#FF8000]/20 flex items-center justify-center p-4">
//       <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">
//         <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#309898] to-[#FF8000]" />

//         <div className="p-8">
//           {/* Logo */}
//           <div className="flex justify-center mb-6">
//             <Image
//               src="/vytara-logo.png"
//               alt="Vytara Logo"
//               width={96}
//               height={96}
//               className="w-24 h-24"
//               priority
//             />
//           </div>

//           <h1 className="text-center text-[#309898] mb-2">Vytara</h1>
//           <p className="text-center text-gray-600 mb-6">
//             Your Personal Health Companion
//           </p>

//           <form className="space-y-4" onSubmit={handleLogin}>
//             <div>
//               <label className="block text-[#309898] mb-2">Email</label>
//               <input
//                 type="text"
//                 className="w-full px-4 py-3 rounded-lg border-2 border-[#309898]/30 focus:border-[#FF8000] focus:outline-none transition text-gray-800"
//                 placeholder="Enter your Email"
//                 onChange={(e) => setEmail(e.target.value)}
//               />
//             </div>

//             <div>
//               <label className="block text-[#309898] mb-2">Password</label>
//               <div className="relative">
//                 <input
//                   type={showPassword ? 'text' : 'password'}
//                   className="w-full px-4 py-3 rounded-lg border-2 border-[#309898]/30 focus:border-[#FF8000] focus:outline-none transition text-gray-800"
//                   placeholder="Enter your Password"
//                   onChange={(e) => setPassword(e.target.value)}
//                 />
//                 <Eye
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 cursor-pointer hover:text-[#309898] transition"
//                 />
//               </div>
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full bg-gradient-to-r from-[#309898] to-[#FF8000] text-white py-3 rounded-lg hover:shadow-lg transition transform hover:scale-105 cursor-pointer"
//             >
//               {loading ? 'Checking...' : 'Login'}
//             </button>

//             <button
//               onClick={signInWithGoogle}
//               className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded-xl py-3 bg-white hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
//             >
//               <img
//                 src="https://www.svgrepo.com/show/475656/google-color.svg"
//                 alt="Google"
//                 className="w-5 h-5"
//               />
//               <span className="text-sm font-medium text-gray-700">
//                 Sign in with Google
//               </span>
//             </button>

//             <div className="flex justify-between text-sm mt-4">
//               <button
//                 type="button"
//                 className="text-[#FF8000] hover:underline cursor-pointer"
//                 onClick={() => router.push('/forgotpassword')}
//               >
//                 Forgot Password?
//               </button>

//               <button
//                 type="button"
//                 className="text-[#309898] hover:underline cursor-pointer"
//                 onClick={() => router.push('/signup')}
//               >
//                 Sign Up
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useRef, useEffect } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { supabase } from '@/lib/createClient';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import Image from 'next/image';


/* ========================= PLASMA BACKGROUND ========================= */
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

void main() {
  vec4 o = vec4(0.0);
  mainImage(o, gl_FragCoord.xy);
  vec3 rgb = o.rgb;
  float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
  vec3 finalColor = mix(rgb, intensity * uCustomColor, step(0.5, uUseCustomColor));
  fragColor = vec4(finalColor, length(rgb) * uOpacity);
}`;

const Plasma = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const renderer = new Renderer({ webgl: 2, alpha: true, dpr: Math.min(window.devicePixelRatio, 2) });
    const gl = renderer.gl;
    containerRef.current.appendChild(gl.canvas);
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex, fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([0, 0]) },
        uCustomColor: { value: new Float32Array([0.08, 0.72, 0.65]) },
        uUseCustomColor: { value: 1.0 },
        uSpeed: { value: 0.24 },
        uDirection: { value: 1.0 },
        uScale: { value: 1.1 },
        uOpacity: { value: 0.8 },
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseInteractive: { value: 1.0 }
      }
    });
    const mesh = new Mesh(gl, { geometry, program });
    const setSize = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      (program.uniforms.iResolution.value as Float32Array).set([gl.drawingBufferWidth, gl.drawingBufferHeight]);
    };
    window.addEventListener('resize', setSize);
    setSize();
    let raf: number;
    const loop = (t: number) => {
      program.uniforms.iTime.value = t * 0.001;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', setSize); };
  }, []);
  return <div ref={containerRef} className="absolute inset-0 z-0" />;
};

/* ========================= LOGIN PAGE ========================= */

export default function LoginPage() {
  const logoImage = "/assets/vytara-logo.png";
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setLoading(false);
      alert('Login Failed: Invalid Credentials');
      return;
    }

    setLoading(false);
    alert('Login Successful');
    router.push('/app/homepage');
  };

  const signInWithGoogle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const redirectTo = `${window.location.origin}/auth/callback?next=/app/homepage`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center relative bg-slate-950 overflow-hidden">
      {/* Animated Background */}
      <Plasma />
      <button 
        className='
            absolute top-4 left-4 z-20
            flex items-center gap-1
            px-4 py-2
            text-sm font-bold
            text-white
            bg-gradient-to-br from-[#14b8a6] to-[#0f766e]
            rounded-lg
            shadow-lg shadow-teal-900/20
            hover:scale-[1.02]
            active:scale-95
            transition-all
        '
      onClick={() => router.push('/dashboard')}>
        ← Back
      </button>

      {/* Static Login Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          <div className="h-2 bg-gradient-to-r from-[#14b8a6] to-[#134E4A]" />
          
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <Image
                src="/vytara-logo.png"
                alt="Vytara Logo"
                width={96}
                height={96}
                className="w-24 h-24"
                priority
              />
            </div>

            <h1 className="text-center text-[#14b8a6] text-3xl font-bold mb-1">Vytara</h1>
            <p className="text-center text-gray-500 mb-8 text-sm">Your Health Records, Simplified</p>

            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">Email</label>
                <input
                  type="email"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#14b8a6] focus:bg-white focus:outline-none transition-all text-black"
                  placeholder="Email"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">Password</label>
                <input
                  type={showPassword ? 'text' : "password"}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#14b8a6] focus:bg-white focus:outline-none transition-all text-black"
                  placeholder="••••••••"
                />
              </div>

              <button 
                className="w-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-teal-900/20 hover:scale-[1.02] active:scale-95 transition-all mt-2"
                type='submit'
              >
                Sign In
              </button>

              <button
                onClick={signInWithGoogle}
                className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded-xl py-3 bg-white hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-700">
                  Sign in with Google
                </span>
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3 text-center">
              <button 
                className="text-sm text-gray-400 hover:text-[#14b8a6] transition-colors"
                onClick={() => router.push('/forgotpassword')}
              >
                Forgot your password?
              </button>
              <p className="text-sm text-gray-500">
                Don't have an account?{" "}
                <button className="text-[#14b8a6] font-bold hover:underline" onClick={() => router.push('/signup')}>Create Account</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
