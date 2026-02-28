"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { APP_CONFIG } from "@/config";
import {
  ShieldCheck,
  Cpu,
  Coins,
  ArrowRight,
  Activity,
  Lock,
  Zap,
  Users,
  Quote,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Linkedin,
  Github,
} from "lucide-react";

// ── Data ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <Cpu className="w-6 h-6 text-violet-400" />,
    title: "Dynamic Deposits",
    desc: "Security deposits auto-adjust based on your on-chain trust score. Better trust = less collateral locked.",
    colSpan: "md:col-span-2",
  },
  {
    icon: <Lock className="w-6 h-6 text-indigo-400" />,
    title: "Smart Contract Secured",
    desc: "Funds are held by autonomous smart contracts, not a middleman. Zero counterparty risk.",
    colSpan: "md:col-span-1",
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-cyan-400" />,
    title: "Trust-First Protocol",
    desc: "Build your reputation on-chain. Every successful rental grows your score, unlocking better rates globally.",
    colSpan: "md:col-span-1",
  },
  {
    icon: <Zap className="w-6 h-6 text-emerald-400" />,
    title: "Instant Verification",
    desc: "No credit checks. Connect your wallet, and our protocol assesses your history instantly.",
    colSpan: "md:col-span-2",
  },
];

const STATS = [
  { label: "Avg. Deposit Saved", value: "34%", icon: <Coins className="w-4 h-4" /> },
  { label: "Trust Tiers", value: "3", icon: <ShieldCheck className="w-4 h-4" /> },
  { label: "Platform Fee", value: "1%", icon: <Activity className="w-4 h-4" /> },
];

const STEPS = [
  {
    title: "Connect Wallet",
    desc: "Link your Web3 wallet and get your instant on-chain trust score.",
  },
  {
    title: "Browse & Preview",
    desc: "Find assets and see your dynamically reduced deposit requirement.",
  },
  {
    title: "Rent & Build",
    desc: "Complete rentals successfully to grow your score and save more.",
  },
];

const TESTIMONIALS = [
  {
    quote: "CollateralX cut my deposit by 60%. I listed a camera kit and the renter got approved in seconds. This is the future of peer-to-peer rental.",
    name: "Alex K.",
    handle: "@alexk.eth",
    tier: "Gold",
  },
  {
    quote: "I was skeptical about on-chain trust scores, but my score of 720 saved me 350 USDC on my first rental. Absolutely wild.",
    name: "Priya S.",
    handle: "@priyaseth.eth",
    tier: "Silver",
  },
  {
    quote: "The smart contract held the deposit perfectly. When I returned the item, funds were released instantly. No disputes, no middlemen.",
    name: "Mateus R.",
    handle: "@mrdev.eth",
    tier: "Gold",
  },
];

const PROTOCOL_HIGHLIGHTS = [
  { value: "0", label: "Custodians", desc: "Fully non-custodial" },
  { value: "<3s", label: "Verification", desc: "On-chain, instant" },
  { value: "80%", label: "Max Savings", desc: "On deposit for Gold tier" },
  { value: "100%", label: "Transparent", desc: "Open-source contracts" },
];

const TEAM = [
  {
    name: "Aryan Ghosh",
    role: "Founder & CEO",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aryan",
    bio: "Building the future of collateralized trust. Obsessed with on-chain reputation.",
    linkedin: "https://linkedin.com/in/aryanghosh",
    github: "https://github.com/aryan-eth",
  },
  {
    name: "Sarah Chen",
    role: "CTO",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    bio: "Smart contract auditor and protocol architect. Security maximalist.",
    linkedin: "https://linkedin.com/in/sarahchen",
    github: "https://github.com/sarahcodes",
  },
  {
    name: "Marcus Wright",
    role: "Head of Product",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    bio: "Former product lead at leading DeFi protocols. Focused on seamless UX.",
    linkedin: "https://linkedin.com/in/marcuswright",
    github: "https://github.com/marcusdefi",
  },
  {
    name: "Elena Rodriguez",
    role: "Lead Engineer",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
    bio: "Full-stack Web3 developer. Bridging the gap between UI and smart contracts.",
    linkedin: "https://linkedin.com/in/elenarodriguez",
    github: "https://github.com/elenabuilds",
  }
];

// Comparison data: traditional vs CollateralX
const COMPARISON = [
  {
    feature: "Deposit Amount",
    traditional: "Fixed (often 100% of value)",
    cx: "Dynamic — up to 80% less",
    cxGood: true,
  },
  {
    feature: "Verification",
    traditional: "Manual credit checks, days",
    cx: "On-chain, under 3 seconds",
    cxGood: true,
  },
  {
    feature: "Custody of Funds",
    traditional: "Held by platform (counterparty risk)",
    cx: "Smart contract, non-custodial",
    cxGood: true,
  },
  {
    feature: "KYC Required",
    traditional: "Yes — ID, bank details",
    cx: "No — wallet only",
    cxGood: true,
  },
  {
    feature: "Reputation",
    traditional: "Siloed. Doesn't travel.",
    cx: "On-chain. Portable globally.",
    cxGood: true,
  },
  {
    feature: "Dispute Resolution",
    traditional: "Manual arbitration, weeks",
    cx: "Protocol-enforced, instant",
    cxGood: true,
  },
];

// Fallback ticker events (shown when the DB is unreachable)
const FALLBACK_TICKER_EVENTS = [
  "✓ 0x7a3f…9dcc just completed a rental · +10 trust · 0.4 ETH unlocked",
  "✓ 0xb12e…3fab listed a DSLR Camera Kit · 2.8 ETH value",
  "✓ 0xf90a…1c2d earned Gold Tier · 80% deposit savings unlocked",
  "✓ 0x3c88…7e10 rented a DJI Drone · saved 1.2 ETH in deposit",
  "✓ 0xd4a1…5b39 completed 5th rental · trust score now 650",
  "✓ 0x8f2c…aa71 started rental · 0x5e01…4b2a approved in 2.1s",
  "✓ 0x1ba9…cc32 reached Silver Tier · 60% max savings",
  "✓ 0xe7f3…2d90 just listed a Macbook Pro · 1.5 ETH value",
];

// ── Marquee ───────────────────────────────────────────────────────────────

function Marquee({ events }: { events: string[] }) {
  const display = events.length > 0 ? events : FALLBACK_TICKER_EVENTS;
  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-black/20 py-3">
      {/* Left + right fade masks */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-[#060609] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-[#060609] to-transparent z-10" />

      <div className="flex gap-10 animate-marquee whitespace-nowrap w-max">
        {[...display, ...display].map((event, i) => (
          <span
            key={i}
            className="text-xs font-medium text-white/40 px-4"
          >
            {event}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Components ───────────────────────────────────────────────────────────

export default function LandingPage() {
  const { isConnected } = useWallet();
  const [tickerEvents, setTickerEvents] = useState<string[]>([]);

  // Fetch live activity events from MongoDB
  useEffect(() => {
    fetch("/api/activity?limit=20")
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: { message: string }[]) =>
        setTickerEvents(data.map((e) => e.message))
      )
      .catch(() => {
        // Silently fall back to static events
        setTickerEvents([]);
      });
  }, []);

  return (
    <div className="relative overflow-x-hidden selection:bg-violet-500/30">

      {/* ── Ambient Background ──────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Primary orbs */}
        <div className="absolute top-[15%] left-[20%] w-[55vw] h-[45vh] rounded-full bg-violet-600/10 blur-[140px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] right-[15%] w-[45vw] h-[40vh] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse-slower" />
        {/* Accent orbs */}
        <div className="absolute top-[60%] left-[5%] w-[25vw] h-[30vh] rounded-full bg-cyan-600/6 blur-[100px]" />
        <div className="absolute top-[30%] right-[5%] w-[20vw] h-[25vh] rounded-full bg-violet-400/6 blur-[90px] animate-float" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%)",
          }}
        />
      </div>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-4 pt-20 pb-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8 text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-xs font-semibold text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.15)] backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
              </span>
              CollateralX V1 is Live on Testnet
            </motion.div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight text-white">
              Rent Anything. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-300 drop-shadow-sm">
                Trust Everything.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-white/50 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
              Stop overpaying in locked collateral. CollateralX uses your true on-chain reputation to dynamically lower security deposits by up to{" "}
              <span className="text-emerald-400 font-semibold">80%</span>.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              {isConnected ? (
                <Link
                  href="/dashboard"
                  className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white overflow-hidden transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-900/40"
                >
                  <span className="relative">Enter App</span>
                  <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <ConnectButton size="lg" />
              )}
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-medium text-white/60 hover:text-white hover:bg-white/5 border border-white/8 hover:border-white/15 transition-all duration-200"
              >
                Learn More
              </a>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
              {STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex flex-col gap-1 group"
                >
                  <div className="flex items-center gap-1.5 text-violet-400">
                    {s.icon}
                    <span className="text-2xl font-bold text-white">{s.value}</span>
                  </div>
                  <span className="text-xs text-white/40 font-medium">{s.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Floating UI Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1, type: "spring", bounce: 0.4 }}
            className="hidden lg:block relative perspective-1000"
          >
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-20 w-full max-w-md mx-auto aspect-[4/5] rounded-3xl border border-white/10 bg-black/50 backdrop-blur-2xl shadow-[0_40px_100px_-20px_rgba(139,92,246,0.5)] p-8 flex flex-col justify-between overflow-hidden"
            >
              {/* Glass reflection */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/8 to-transparent opacity-50 pointer-events-none" />
              {/* Animated gradient border shimmer */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/0 via-violet-500/0 to-cyan-500/0 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ padding: "1px" }} />

              <div className="space-y-6 relative z-10">
                {/* "Last rental" chip */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    Live Network
                  </div>
                  <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold">
                    Gold Tier
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-white/50 mb-1">Your Trust Score</h3>
                  <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
                    850
                  </div>
                  <p className="text-xs text-emerald-400 mt-1 font-medium">↑ Top 5% of network</p>
                </div>

                <div className="space-y-3">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "85%" }}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-white/30">
                    <span>Bronze</span><span>Silver</span><span>Gold</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 space-y-3">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/8 backdrop-blur-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-white/50">Base Deposit</span>
                    <span className="text-xs text-white/40 line-through">2.50 ETH</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-violet-300">Your Deposit</span>
                    <span className="text-lg font-bold text-emerald-400">0.50 ETH</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-semibold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  You saved 2.00 ETH (80% off)
                </div>
              </div>
            </motion.div>

            {/* Decorative blobs */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-violet-600/30 rounded-full blur-[60px] pointer-events-none" />

            {/* Floating mini-card */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-6 -left-8 bg-black/60 border border-white/10 backdrop-blur-xl rounded-2xl px-4 py-3 z-30 shadow-xl"
            >
              <p className="text-[10px] text-white/40 mb-1">Last Rental</p>
              <p className="text-xs font-bold text-white">DSLR Camera Kit</p>
              <p className="text-[10px] text-emerald-400 mt-0.5">+10 trust · 0.2 ETH unlocked</p>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ── Network Activity Ticker ─────────────────────────────────────── */}
      <div className="relative z-10">
        <Marquee events={tickerEvents} />
      </div>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 py-32 px-4 border-t border-white/5 bg-black/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/50 mb-5">
              <Zap className="w-3 h-3 text-violet-400" /> Simple & Secure
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">How the Engine Works</h2>
            <p className="mt-4 text-white/50 max-w-xl mx-auto text-lg">
              Three simple steps to unlock your financial reputation and stop overcollateralizing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-[45px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                className="relative flex flex-col items-center text-center group"
              >
                <div className="w-24 h-24 mb-6 rounded-2xl bg-white/3 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] group-hover:scale-110 group-hover:border-violet-500/50 group-hover:bg-violet-500/5 transition-all duration-300 relative z-10">
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/20">
                    0{i + 1}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed max-w-xs">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison: Traditional vs CollateralX ─────────────────────── */}
      <section className="relative z-10 py-32 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/50 mb-5">
              <Activity className="w-3 h-3 text-cyan-400" /> See the Difference
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">Traditional vs CollateralX</h2>
            <p className="mt-4 text-white/50 max-w-xl mx-auto">
              Why the old way of renting is broken — and how we fixed it.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-white/8 bg-white/2 overflow-hidden"
          >
            {/* Table header */}
            <div className="grid grid-cols-3 border-b border-white/8 bg-white/3">
              <div className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest">Feature</div>
              <div className="px-6 py-4 text-xs font-semibold text-red-400/70 uppercase tracking-widest border-l border-white/8">Traditional</div>
              <div className="px-6 py-4 text-xs font-semibold text-violet-400 uppercase tracking-widest border-l border-white/8 flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[8px] font-bold text-white">CX</div>
                CollateralX
              </div>
            </div>

            {COMPARISON.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 border-b border-white/5 last:border-0 ${i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"}`}
              >
                <div className="px-6 py-4 text-sm font-medium text-white/70">{row.feature}</div>
                <div className="px-6 py-4 text-sm text-red-400/70 border-l border-white/5 flex items-start gap-2">
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500/40" />
                  {row.traditional}
                </div>
                <div className="px-6 py-4 text-sm text-emerald-400 border-l border-white/5 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                  {row.cx}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features Bento Grid ─────────────────────────────────────────── */}
      <section className="relative z-10 py-32 px-4 border-t border-white/5 bg-black/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/60 mb-6">
              <Sparkles className="w-3 h-3" /> Built for the Future
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">Uncompromising Protocol</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[220px]">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative rounded-3xl border border-white/10 bg-white/2 overflow-hidden group hover:border-violet-500/40 transition-all duration-500 ${f.colSpan}`}
              >
                {/* Hover gradient bleed */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-violet-500/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Subtle shimmer border on hover */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ backgroundImage: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, transparent 50%, rgba(99,102,241,0.1) 100%)" }}
                />

                <div className="relative z-10 p-8 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-auto group-hover:scale-110 group-hover:border-violet-500/30 group-hover:bg-violet-500/10 transition-all duration-300">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-sm text-white/50">{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Protocol Highlights ─────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {PROTOCOL_HIGHLIGHTS.map((h, i) => (
            <motion.div
              key={h.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center space-y-1 group"
            >
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-cyan-300 group-hover:from-violet-200 group-hover:to-cyan-200 transition-all">
                {h.value}
              </div>
              <div className="text-sm font-semibold text-white">{h.label}</div>
              <div className="text-xs text-white/30">{h.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Meet Our Team ──────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/50 mb-6">
              <Users className="w-3.5 h-3.5" /> Core Contributors
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">Meet the Team</h2>
            <p className="mt-4 text-white/50 max-w-xl mx-auto">
              The builders behind CollateralX making decentralized trust a reality.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group relative rounded-3xl border border-white/8 bg-white/2 p-6 hover:bg-white/5 hover:border-violet-500/30 transition-all duration-300 text-center flex flex-col h-full"
              >
                {/* Subtle animated border on hover */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ backgroundImage: "linear-gradient(135deg, rgba(139,92,246,0.1) 0%, transparent 50%, rgba(99,102,241,0.05) 100%)" }} />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="mx-auto w-24 h-24 mb-5 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-violet-500/50 transition-colors bg-white/5 p-1 shrink-0">
                    <img src={member.image} alt={member.name} className="w-full h-full object-cover rounded-full" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">{member.name}</h3>
                  <p className="text-xs font-semibold text-violet-400 mb-3">{member.role}</p>
                  <p className="text-xs text-white/50 leading-relaxed mb-4 flex-1">{member.bio}</p>
                  <div className="pt-4 border-t border-white/5 mt-auto">
                    <div className="flex items-center justify-center gap-4">
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/40 hover:text-[#0077b5] transition-colors"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-4 border-t border-white/5 bg-black/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/50 mb-6">
              <Users className="w-3.5 h-3.5" /> Trusted by Early Adopters
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">What Users Say</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative rounded-2xl border border-white/8 bg-white/3 p-7 flex flex-col gap-5 hover:border-violet-500/25 hover:bg-white/5 hover:shadow-[0_0_40px_rgba(139,92,246,0.08)] transition-all duration-300 group"
              >
                <Quote className="w-6 h-6 text-violet-500/40 group-hover:text-violet-400/60 transition-colors" />
                <p className="text-sm text-white/70 leading-relaxed flex-1">{t.quote}</p>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-white/30">{t.handle}</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    t.tier === "Gold"
                      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                  }`}>
                    {t.tier} Tier
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-3xl overflow-hidden border border-violet-500/20 bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-transparent p-12 text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 to-transparent rounded-3xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-violet-600/20 rounded-full blur-[80px] pointer-events-none" />
            {/* Subtle animated ring */}
            <div className="absolute inset-0 rounded-3xl" style={{ backgroundImage: "linear-gradient(135deg, rgba(139,92,246,0.1) 0%, transparent 40%, rgba(99,102,241,0.05) 100%)" }} />

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-xs font-semibold text-violet-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                </span>
                Free to Join · No KYC
              </div>

              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Start Renting Smarter,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                  Starting Today.
                </span>
              </h2>

              <p className="text-lg text-white/50 max-w-xl mx-auto">
                Join the protocol redefining rental collateral. Connect your wallet and unlock your on-chain reputation in seconds.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <ConnectButton size="lg" />
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 font-medium transition-all"
                >
                  Explore Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-14 px-4 border-t border-white/5 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            {/* Brand */}
            <div className="space-y-3 max-w-xs">
              <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  CX
                </div>
                CollateralX
              </div>
              <p className="text-xs text-white/30 leading-relaxed">
                Programmable trust for peer-to-peer rental collateral. Non-custodial, open-source, on-chain.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                </span>
                Running on Testnet
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Protocol</p>
                <div className="space-y-2">
                  <Link href="#" className="block text-sm text-white/30 hover:text-white transition-colors">Documentation</Link>
                  <Link href="#" className="block text-sm text-white/30 hover:text-white transition-colors">Smart Contracts</Link>
                  <Link href="#" className="block text-sm text-white/30 hover:text-white transition-colors">Audit Reports</Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">App</p>
                <div className="space-y-2">
                  <Link href="/dashboard" className="block text-sm text-white/30 hover:text-white transition-colors">Dashboard</Link>
                  <Link href="/dashboard/listings" className="block text-sm text-white/30 hover:text-white transition-colors">Listings</Link>
                  <Link href="/dashboard/active" className="block text-sm text-white/30 hover:text-white transition-colors">My Rentals</Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Community</p>
                <div className="space-y-2">
                  <Link href="#" className="block text-sm text-white/30 hover:text-white transition-colors">Twitter / X</Link>
                  <Link href="#" className="block text-sm text-white/30 hover:text-white transition-colors">GitHub</Link>
                  <Link href="#" className="block text-sm text-white/30 hover:text-white transition-colors">Discord</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/20">
              © {new Date().getFullYear()} CollateralX Protocol. Open Source Testnet.
            </p>
            <p className="text-xs text-white/20">Built with 💜 on Ethereum</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Inline Sparkles icon
function Sparkles(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
