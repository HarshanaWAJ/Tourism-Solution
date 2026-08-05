import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Stamp } from "./ui.jsx";

const CYCLE_WORDS = ["verified", "unhurried", "unforgettable"];

export default function Hero() {
  const [wordIndex, setWordIndex] = useState(0);
  const words = useMemo(() => CYCLE_WORDS, []);

  useEffect(() => {
    const id = setTimeout(() => {
      setWordIndex((i) => (i === words.length - 1 ? 0 : i + 1));
    }, 2200);
    return () => clearTimeout(id);
  }, [wordIndex, words]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-teal-950 via-teal-900 to-teal-950 text-sand-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-saffron-500/20 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-teal-700/30 blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <svg className="absolute bottom-0 left-0 w-full text-teal-900/60" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path fill="currentColor" d="M0,64 C240,120 480,0 720,32 C960,64 1200,120 1440,64 L1440,120 L0,120 Z" />
        </svg>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-28 flex flex-col items-center text-center gap-8">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex items-center gap-3">
          <Stamp tone="saffron" size="sm">Verified<br />Since 2024</Stamp>
          <span className="text-sm font-medium tracking-wide text-saffron-300">Sri Lanka, without the guesswork</span>
        </motion.div>

        <h1 className="font-display text-5xl md:text-7xl font-semibold leading-tight max-w-3xl">
          Every stay, guide, and ride —{" "}
          <span className="relative inline-block h-[1.15em] w-full md:w-auto align-bottom overflow-hidden">
            {words.map((word, index) => (
              <motion.span
                key={word}
                className="absolute left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 text-saffron-400"
                initial={{ opacity: 0, y: 40 }}
                animate={wordIndex === index ? { opacity: 1, y: 0 } : { opacity: 0, y: wordIndex > index ? -40 : 40 }}
                transition={{ type: "spring", stiffness: 60, damping: 14 }}
              >
                {word}
              </motion.span>
            ))}
          </span>
          .
        </h1>

        <p className="text-lg md:text-xl text-sand-50/70 max-w-2xl">
          Ceylon Way is a single trip layer for hotels, certified guides, transport, and
          experiences across the island, with an AI planner that speaks your language and
          a safety net that watches for scams so you don't have to.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/discover" className="inline-flex items-center gap-2 bg-saffron-500 text-teal-950 rounded-full px-6 py-3 font-medium hover:bg-saffron-400 transition shadow-lift">
            Start exploring <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/register" className="inline-flex items-center gap-2 border border-white/20 rounded-full px-6 py-3 font-medium text-sand-50 hover:bg-white/10 transition">
            List your business
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 w-full max-w-2xl rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur px-6 py-6 md:px-8 md:py-7"
        >
          <div className="flex items-center gap-2 text-saffron-300 text-xs uppercase tracking-widest mb-3">
            <ShieldCheck className="w-4 h-4" />
            Trust layer
          </div>
          <p className="font-display text-xl md:text-2xl leading-snug mb-5">
            Every vendor badge means a document was checked — business registration, SLTDA
            licensing, or guide certification.
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {["Verified", "Reviewed", "Supported"].map((label) => (
              <div key={label} className="bg-white/10 rounded-xl py-4">
                <div className="text-xs uppercase tracking-wide text-sand-50/70">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
