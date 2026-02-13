'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSeedling,
  faPenToSquare,
  faChartLine,
  faHeart,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
// ============================================================
// Inline SVG logo — a plump leaf with inner glow (留白)
// ============================================================
function Logo({ size = 80 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      width={size}
      height={size}
    >
      {/* Leaf rotated 45° around its center, shifted up-right to make room for stem */}
      <g transform="rotate(45 30 28)">
        {/* Leaf body */}
        <path
          d="M 30 2 C 16 12 9 26 16 40 C 19 47 24 50 30 50 C 36 50 41 47 44 40 C 51 26 44 12 30 2Z"
          fill="#6b9b7a"
        />
        {/* Inner highlight — breathing space */}
        <ellipse cx="30" cy="28" rx="10" ry="13" fill="#ffffff" opacity="0.15" />
        {/* Main vein */}
        <path d="M 30 8 L 30 45" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        {/* Left veins */}
        <path d="M 30 19 C 25 22 21 26 18 28" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
        <path d="M 30 30 C 25 33 21 37 18 39" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
        {/* Right veins */}
        <path d="M 30 19 C 35 22 39 26 42 28" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
        <path d="M 30 30 C 35 33 39 37 42 39" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
      </g>
    </svg>
  );
}

// ============================================================
// Floating particles background — deterministic to avoid hydration mismatch
// ============================================================
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const r1 = seededRandom(i * 7 + 1);
  const r2 = seededRandom(i * 7 + 2);
  const r3 = seededRandom(i * 7 + 3);
  const r4 = seededRandom(i * 7 + 4);
  const r5 = seededRandom(i * 7 + 5);
  const r6 = seededRandom(i * 7 + 6);
  const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
  return {
    id: i,
    size: round(3 + r1 * 5),
    x: round(r2 * 100),
    y: round(r3 * 100),
    duration: round(12 + r4 * 20),
    delay: round(r5 * -20),
    opacity: round(0.08 + r6 * 0.12),
  };
});

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-[#6b9b7a]"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
            animation: `landing-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================
// Feature card — icon as subtle background decoration
// ============================================================
function FeatureCard({
  icon,
  color,
  title,
  desc,
  delay,
}: {
  icon: typeof faSeedling;
  color: string;
  title: string;
  desc: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className="relative overflow-hidden bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-[#e8e5e0]/50 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      {/* Background decoration icon */}
      <div className="absolute -right-2 -bottom-2 pointer-events-none">
        <FontAwesomeIcon
          icon={icon}
          className="text-[42px]"
          style={{ color, opacity: 0.06 }}
        />
      </div>
      <h3 className="text-[15px] font-semibold text-[#2d2d2d] mb-1.5">
        {title}
      </h3>
      <p className="text-[13px] text-[#7a7a7a] leading-relaxed">{desc}</p>
    </div>
  );
}

// ============================================================
// Landing page
// ============================================================
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <FloatingParticles />

      {/* ---- Decorative gradient blobs ---- */}
      <div className="absolute top-[-20%] right-[-30%] w-[70vw] h-[70vw] max-w-[400px] max-h-[400px] rounded-full bg-[#6b9b7a]/[0.06] blur-3xl pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-20%] w-[60vw] h-[60vw] max-w-[350px] max-h-[350px] rounded-full bg-[#e8943a]/[0.05] blur-3xl pointer-events-none" />

      {/* ======== Hero Section ======== */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        {/* Logo */}
        <div
          className="mb-6 transition-all duration-1000"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted
              ? 'translateY(0) scale(1)'
              : 'translateY(-20px) scale(0.8)',
          }}
        >
          <div className="relative">
            {/* Subtle glow behind logo */}
            <div className="absolute inset-[-8px] rounded-full bg-[#6b9b7a]/8 blur-xl" />
            <div
              className="relative"
              style={{ animation: 'landing-breathe 4s ease-in-out infinite' }}
            >
              <Logo size={80} />
            </div>
          </div>
        </div>

        {/* Product name */}
        <h1
          className="text-4xl font-bold text-[#2d2d2d] tracking-wide mb-3 transition-all duration-700 delay-200"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(15px)',
          }}
        >
          留白
        </h1>

        {/* Slogan */}
        <p
          className="text-center text-[#5a5a5a] text-base leading-relaxed max-w-[280px] mb-2 transition-all duration-700 delay-400"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(15px)',
          }}
        >
          别追问还能做什么
          <br />
          先觉察现在感觉怎么样
        </p>

        <p
          className="text-[13px] text-[#9a9590] mb-10 transition-all duration-700 delay-500"
          style={{
            opacity: mounted ? 1 : 0,
          }}
        >
          你的精力觉察伙伴
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-col gap-3 w-full max-w-[280px] transition-all duration-700 delay-600"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(15px)',
          }}
        >
          {isLoggedIn ? (
            <Link href="/">
              <Button
                size="lg"
                className="w-full text-[15px] shadow-md shadow-[#6b9b7a]/15"
              >
                回到花园
                <FontAwesomeIcon icon={faArrowRight} className="ml-2 text-sm" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/register">
                <Button
                  size="lg"
                  className="w-full text-[15px] shadow-md shadow-[#6b9b7a]/15"
                >
                  开始留白之旅
                  <FontAwesomeIcon icon={faArrowRight} className="ml-2 text-sm" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full text-[15px]">
                  已有账号，登录
                </Button>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ======== Features Section ======== */}
      <section className="px-5 pb-6">
        <p
          className="text-center text-xs text-[#b5b0a8] tracking-widest uppercase mb-4 transition-all duration-700 delay-700"
          style={{ opacity: mounted ? 1 : 0 }}
        >
          像管理资产一样管理精力
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FeatureCard
            icon={faPenToSquare}
            color="#6b9b7a"
            title="精力觉察"
            desc="每天几秒钟，记录当下的精力状态"
            delay={800}
          />
          <FeatureCard
            icon={faSeedling}
            color="#5cb85c"
            title="精力花园"
            desc="3D 花园随你的精力变化生长"
            delay={950}
          />
          <FeatureCard
            icon={faHeart}
            color="#e8943a"
            title="AI 陪伴"
            desc="知秋用温暖的方式陪你觉察自己"
            delay={1100}
          />
          <FeatureCard
            icon={faChartLine}
            color="#4aa3df"
            title="趋势洞察"
            desc="发现精力规律，找到你的节奏"
            delay={1250}
          />
        </div>
      </section>

      {/* ======== Philosophy Section ======== */}
      <section
        className="mx-5 mb-8 py-6 px-5 rounded-2xl bg-gradient-to-br from-[#6b9b7a]/[0.06] to-[#6b9b7a]/[0.02] border border-[#6b9b7a]/10 text-center transition-all duration-700 delay-1000"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(10px)',
        }}
      >
        <p className="text-sm text-[#5a5a5a] leading-relaxed">
          <span className="text-[#6b9b7a] font-medium">留白</span>{' '}
          不追踪任务，不计算产出
          <br />
          只关心一件事——
          <span className="text-[#2d2d2d] font-medium">你现在感觉怎么样</span>
        </p>
      </section>

      {/* ======== Footer ======== */}
      <footer className="text-center pb-8">
        <p className="text-xs text-[#c5c0b8]">在忙碌中，留一片呼吸的空间</p>
      </footer>
    </div>
  );
}
