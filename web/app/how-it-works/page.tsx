import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Pulse, ClipboardText, ChartBar, UserCircle, ShieldCheck } from '@phosphor-icons/react';

export const metadata = {
  title: 'How It Works — Optimizable',
  description: 'How Optimizable builds your hormonal risk profile, recommends bloodwork, and turns your lab results into a 90-day optimization protocol.',
};

const OSWALD = { fontFamily: "var(--font-oswald,'Oswald',sans-serif)" } as const;

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white flex flex-col">

      {/* NAV */}
      <nav className="border-b border-[rgba(255,255,255,0.07)] px-6 lg:px-12 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo_trsp.png" alt="Optimizable" width={44} height={44} style={{ objectFit: 'contain' }} />
          <div>
            <div className="text-white font-bold uppercase tracking-[0.14em]"
              style={{ ...OSWALD, fontSize: '1.15rem' }}>OPTIMIZABLE</div>
            <div className="text-[#666666] uppercase tracking-[0.18em] mt-0.5"
              style={{ ...OSWALD, fontSize: '0.58rem' }}>JUST A MAN. PROPERLY</div>
          </div>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/how-it-works" className="text-[11px] font-bold text-white tracking-widest uppercase">
            How It Works
          </Link>
          <Link href="/login" className="text-[11px] font-bold text-[#9A9A9A] hover:text-white transition-colors tracking-widest uppercase">
            Sign In
          </Link>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="flex-1 px-6 py-16 max-w-2xl mx-auto w-full">

        {/* PAGE HEADER */}
        <div className="mb-16">
          <div className="inline-block px-2 py-0.5 bg-white/5 border border-white/10 text-[10px] font-black tracking-[2px] uppercase text-white/40 mb-4">
            Platform Overview
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none mb-5" style={OSWALD}>
            How It Works
          </h1>
          <p className="text-sm text-white/40 leading-relaxed">
            A systematic approach to understanding male hormonal health — from a 3-minute profile to a full bloodwork analysis and 90-day protocol.
          </p>
        </div>

        {/* SECTION 1 — THE PROBLEM */}
        <section className="mb-16">
          <div className="text-[10px] font-black tracking-[3px] uppercase text-[#C8A2C8] mb-3">The Problem</div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white mb-4" style={OSWALD}>
            Standard Testing Has a Blind Spot
          </h2>
          <div className="space-y-4 text-[13px] text-[#5A5A5A] leading-relaxed">
            <p>
              A routine blood panel tells you whether a number falls inside a reference range. It doesn't tell you whether that number is <span className="text-white/70 font-bold">optimal for you</span> — or why it is where it is.
            </p>
            <p>
              Consider testosterone. The standard range for adult men spans 300–1000 ng/dL. A man at 305 ng/dL is technically "normal." He also has low energy, declining libido, and can't build muscle despite training consistently. He'll be told his results are fine.
            </p>
            <div className="border-l-2 border-[#C8A2C8]/30 pl-4 py-1 my-6 bg-white/[0.01]">
              <p className="text-[12px] text-[#5A5A5A] leading-relaxed">
                <span className="text-[#C8A2C8] font-bold">Analogy —</span> checking your engine oil level tells you there's oil in the car. It doesn't tell you about oil pressure, viscosity, filter condition, or whether the engine is running at 180°F or 240°F. A single number in a vacuum is almost meaningless.
              </p>
            </div>
            <p>
              The real picture requires understanding the <span className="text-white/70 font-bold">relationships</span> between markers — total testosterone vs. free testosterone vs. SHBG, estradiol balance, cortisol dynamics, thyroid status — and reading those relationships through the lens of what the patient actually does every day.
            </p>
          </div>
        </section>

        {/* SECTION 2 — THE FOUR PHASES */}
        <section className="mb-16">
          <div className="text-[10px] font-black tracking-[3px] uppercase text-[#C8A2C8] mb-3">The Profile</div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white mb-4" style={OSWALD}>
            Building Your Biological Baseline
          </h2>
          <p className="text-[13px] text-[#5A5A5A] leading-relaxed mb-6">
            Before any bloodwork, Optimizable builds a detailed profile across four layers. Each layer narrows the picture — like a detective accumulating evidence before drawing a conclusion.
          </p>

          <div className="space-y-3">
            {[
              {
                icon: UserCircle,
                step: '01',
                title: 'Demographics & Medical History',
                body: 'Age, height, weight, body composition, and pre-existing conditions. Testosterone declines at roughly 1% per year after 30. Conditions like sleep apnea, obesity, hypothyroidism, and hemochromatosis each suppress hormonal function through specific, well-documented mechanisms — all of which are factored into your risk profile.',
              },
              {
                icon: Pulse,
                step: '02',
                title: 'Lifestyle Telemetry',
                body: 'Not just "do you exercise" — but what type (resistance training stimulates androgen receptors differently than cardio), and not just "how much do you sleep" — but the quality. Seven hours of fragmented sleep suppresses pulsatile LH release just as severely as five hours of solid sleep. Beer and spirits are both alcohol, but hops contain 8-prenylnaringenin — one of the most potent dietary phytoestrogens known — a distinction standard assessments completely ignore.',
              },
              {
                icon: ClipboardText,
                step: '03',
                title: 'Medical & Pharmacological History',
                body: 'Medications are frequently the hidden variable. Opioids suppress LH and FSH directly — opioid-induced androgen deficiency (OPIAD) affects most men on long-term pain management and is almost never diagnosed. SSRIs elevate prolactin, which acts as a stop signal at the hypothalamus. Statins deplete CoQ10, the fuel that powers testosterone synthesis in Leydig cells. Past steroid or TRT use leaves lasting HPT axis suppression that may never fully recover without intervention.',
              },
              {
                icon: ChartBar,
                step: '04',
                title: 'Symptom Assessment',
                body: "Symptoms are the body's self-reported signal — and they're weighted accordingly. Loss of morning erections is a direct proxy for the nocturnal testosterone surge. Low libido is one of the most testosterone-sensitive functions the body has. Preserved libido with poor erectile function suggests a vascular cause rather than hormonal. Gynecomastia is almost exclusively caused by an elevated estrogen-to-testosterone ratio. These distinctions determine what bloodwork gets recommended.",
              },
            ].map(({ icon: Icon, step, title, body }) => (
              <div key={step} className="p-5 border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-white/5 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-[#666666]" />
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-[#3A3A3A] uppercase tracking-[3px]">Step {step}</div>
                    <div className="text-[11px] font-black text-white uppercase tracking-tight">{title}</div>
                  </div>
                </div>
                <p className="text-[12px] text-[#6A6A6A] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3 — THE RISK SCORE */}
        <section className="mb-16">
          <div className="text-[10px] font-black tracking-[3px] uppercase text-[#C8A2C8] mb-3">The Output</div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white mb-4" style={OSWALD}>
            The Risk Score
          </h2>
          <div className="space-y-4 text-[13px] text-[#5A5A5A] leading-relaxed">
            <p>
              The four phases produce a single number: a <span className="text-white/80 font-bold">Hormonal Risk Coefficient</span> from 0 to 100, built from weighted inputs across all four layers. Each layer has a ceiling that prevents any single dimension from dominating the total — a man with extreme lifestyle risk still needs bloodwork to confirm the clinical picture.
            </p>
            <div className="border-l-2 border-[#C8A2C8]/30 pl-4 py-1 my-6 bg-white/[0.01]">
              <p className="text-[12px] text-[#5A5A5A] leading-relaxed">
                <span className="text-[#C8A2C8] font-bold">Analogy —</span> the risk score works like a weather model. It ingests all available data and outputs a probability, not a certainty. A 78% chance of rain doesn't mean it will rain — it means the evidence strongly points that way. A high risk score means your inputs are consistent with hormonal dysfunction. Bloodwork confirms it.
              </p>
            </div>
            <p>
              The score drives two outputs: a set of <span className="text-white/80 font-bold">Key Factors</span> explaining what in your profile is driving risk, and a <span className="text-white/80 font-bold">personalized bloodwork panel</span> — the Core Hormonal Panel every user gets, plus targeted Extended tests specific to your inputs. On SSRIs? Prolactin is added. Heavy beer drinker? Estradiol is added. Past steroid use? LH and FSH are added to assess axis recovery.
            </p>
            <p>
              You walk into the lab knowing exactly what to test and why. Not a generic panel. Not whatever your GP decides to order.
            </p>
          </div>
        </section>

        {/* SECTION 4 — LAB ANALYSIS */}
        <section className="mb-16">
          <div className="text-[10px] font-black tracking-[3px] uppercase text-[#C8A2C8] mb-3">Pro Feature</div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-black uppercase tracking-tight text-white" style={OSWALD}>
              AI Lab Analysis
            </h2>
            <span className="px-1.5 py-0.5 bg-[#C8A2C8] text-black text-[6px] font-black uppercase tracking-tight">PRO</span>
          </div>
          <div className="space-y-4 text-[13px] text-[#5A5A5A] leading-relaxed">
            <p>
              Upload your bloodwork results and the AI synthesizes everything — onboarding profile, lifestyle inputs, medication history, symptoms, and bloodwork values — into a unified clinical narrative.
            </p>
            <p>
              The analysis is not: <span className="text-white/60">"Your testosterone is low, consider lifestyle changes."</span> It is: <span className="text-white/60">"Your SHBG is significantly elevated — meaning even less of your borderline testosterone is biologically active. Your keto diet and 5 coffees per day are the primary drivers of that elevation. Your morning erection frequency combined with your stress score indicates active HPT axis suppression from cortisol. The highest-leverage intervention is addressing sleep quality and carbohydrate reintroduction before any supplementation."</span>
            </p>
            <div className="border-l-2 border-[#C8A2C8]/30 pl-4 py-1 my-6 bg-white/[0.01]">
              <p className="text-[12px] text-[#5A5A5A] leading-relaxed">
                <span className="text-[#C8A2C8] font-bold">Analogy —</span> the difference between a generic nutritionist who says "eat less, move more" and a metabolic specialist who reads your labs against your exact lifestyle and tells you the specific chain of causation. One gives general advice. The other gives your answer.
              </p>
            </div>
            <p>
              The analysis covers every biomarker submitted, clinically relevant ratios (Free T Index, testosterone-to-estradiol ratio, LH-to-total-T ratio), red flags requiring physician attention, and a root-cause verdict with a single highest-leverage next action.
            </p>
          </div>
        </section>

        {/* SECTION 5 — THE PROTOCOL */}
        <section className="mb-16">
          <div className="text-[10px] font-black tracking-[3px] uppercase text-[#C8A2C8] mb-3">Pro Feature</div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-black uppercase tracking-tight text-white" style={OSWALD}>
              The 90-Day Optimization Protocol
            </h2>
            <span className="px-1.5 py-0.5 bg-[#C8A2C8] text-black text-[6px] font-black uppercase tracking-tight">PRO</span>
          </div>
          <div className="space-y-4 text-[13px] text-[#5A5A5A] leading-relaxed">
            <p>
              The analysis generates a personalized protocol across six categories: diet, exercise, sleep, stress management, supplementation, and habits. Each recommendation is tiered as Daily, Weekly, or Monthly to create a realistic implementation sequence.
            </p>
            <p>
              Supplement recommendations include specific compounds, doses, timing, and the exact mechanism linking the recommendation to your bloodwork. If your CoQ10 is depleted from statin use, you'll be told 200mg ubiquinol with your largest meal — not "consider antioxidants."
            </p>
            <p>
              Progress is tracked through daily check-ins across mood, energy, libido, sleep quality, morning erection frequency, stress, and mental clarity. Over 90 days, these build a subjective trend line that tells you whether the protocol is working before you retest bloodwork.
            </p>
          </div>
        </section>

        {/* SECTION 6 — WHAT THIS IS NOT */}
        <section className="mb-16">
          <div className="text-[10px] font-black tracking-[3px] uppercase text-[#E8C470] mb-3">Transparency</div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white mb-4" style={OSWALD}>
            What Optimizable Is Not
          </h2>
          <div className="space-y-4 text-[13px] text-[#5A5A5A] leading-relaxed">
            <p>
              Optimizable does not diagnose conditions, prescribe medications, or replace a physician. If the analysis flags critical findings — severely suppressed LH/FSH, elevated prolactin, PSA values requiring urgent attention — it will explicitly recommend a physician consultation. Medical referral is built into every report.
            </p>
            <p>
              It is also not built for men currently on TRT or anabolic steroids. Exogenous hormones fundamentally alter every marker being analyzed — testosterone, LH, FSH, estradiol, hematocrit. Interpreting those values against natural ranges produces noise, not insight. Active hormone users need a specialized endocrinologist.
            </p>
            <div className="border-l-2 border-[#E8C470]/30 pl-4 py-1 my-6 bg-white/[0.01]">
              <p className="text-[12px] text-[#5A5A5A] leading-relaxed">
                <span className="text-[#E8C470] font-bold">Analogy —</span> think of Optimizable as the most informed friend you have — one who happens to have deep knowledge of endocrinology and functional medicine. He gives you real information, specific to your situation, without the liability-driven hedging of a standard clinical appointment. But when the findings are serious, he's the first one to tell you to see a specialist.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 7 — PRIVACY */}
        <section className="mb-16">
          <div className="p-5 border border-white/5 bg-white/[0.02] flex items-start gap-4">
            <ShieldCheck size={18} className="text-[#C8A2C8] shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[2px] text-white mb-2">Privacy & Data</div>
              <p className="text-[12px] text-[#6A6A6A] leading-relaxed">
                Your health data is encrypted in transit and at rest. It is never sold, never used for advertising, and never shared with third parties. The AI analysis runs server-side — your bloodwork values are processed once to generate the report and are not retained by the AI provider.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="border-t border-white/5 pt-12 text-center">
          <div className="text-[10px] font-black text-[#5A5A5A] uppercase tracking-[3px] mb-4">Start Free — No Bloodwork Required</div>
          <Link href="/onboarding/phase1"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#C8A2C8] text-black font-black text-[10px] tracking-[3px] uppercase hover:bg-[#A882A8] transition-colors">
            Begin Assessment <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-[10px] text-[#4A4A4A] mt-4 uppercase tracking-widest">3 minutes · Free · No account required to start</p>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="border-t border-[rgba(255,255,255,0.05)] px-6 lg:px-12 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap justify-center gap-8">
            {['Clinical Grade Analysis', 'Encrypted & Private', 'AI-Powered Protocol', '90-Day Optimization'].map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-[#C8A2C8] opacity-60" />
                <span className="text-[9px] text-[#5A5A5A] uppercase tracking-widest">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">Wellness only · Not medical advice</p>
        </div>
      </footer>

    </div>
  );
}
