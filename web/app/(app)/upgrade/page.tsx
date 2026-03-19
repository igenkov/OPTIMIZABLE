'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import {
  FlaskConical,
  CalendarDays,
  Activity,
  TrendingUp,
  Pill,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Lock,
  Cpu,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: FlaskConical,
    title: 'Clinical Bio-Analysis',
    label: 'Module: LAB',
    desc: 'Deep AI interrogation of 40+ biomarkers against optimal (not "normal") ranges. Includes health scoring and metabolic risk flags.',
  },
  {
    icon: CalendarDays,
    title: 'Adaptive 90-Day Protocol',
    label: 'Module: STRATEGY',
    desc: 'Foundation, Calibration, and Peak phases. A living roadmap that updates based on your physiological response.',
  },
  {
    icon: Activity,
    title: 'Bio-Telemetry Tracking',
    label: 'Module: VITALITY',
    desc: 'Daily quantitative tracking: cognitive load, libido, and morning vitality. Visualized against protocol adherence.',
  },
  {
    icon: TrendingUp,
    title: 'Biomarker Delta Mapping',
    label: 'Module: PROGRESS',
    desc: 'Compare sequential blood panels. See exact percentage shifts in testosterone, cortisol, and inflammation markers.',
  },
  {
    icon: Pill,
    title: 'Precision Pharmacology',
    label: 'Module: STACK',
    desc: 'Custom supplement architecture with exact milligram dosing and timing based on your specific deficiencies.',
  },
];

const PLANS = [
  {
    id: 'monthly',
    label: 'Standard Access',
    price: '$19',
    period: '/ Month',
    tag: null,
    saving: null,
    features: ['Full Lab Analysis', 'Rolling Protocol Updates'],
  },
  {
    id: '90day',
    label: 'Optimal Cycle',
    price: '$49',
    period: '/ 90 Days',
    tag: 'Priority',
    saving: 'Save 14% on full cycle',
    features: ['Full Lab Analysis', 'Rolling Protocol Updates', 'Priority Support', 'Baseline Comparison'],
  },
];

export default function UpgradePage() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | '90day'>('90day');

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">

      {/* HEADER */}
      <div className="relative border-b border-white/5 bg-white/[0.01] px-6 py-6 lg:px-12">
        <div className="absolute top-4 right-6 flex items-center gap-2 opacity-20">
          <span className="text-[8px] font-black uppercase tracking-[3px]">Status: Restricted</span>
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        </div>

        <div className="max-w-4xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[2px] text-white/40 hover:text-[#C8A2C8] transition-colors mb-5">
            <ArrowLeft size={14} /> Back to Command Center
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-black tracking-[4px] text-[#C8A2C8] uppercase mb-1">Protocol Unlock Sequence</div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none"
                style={{ fontFamily: "var(--font-oswald, 'Oswald', sans-serif)" }}>
                Optimizable <span className="text-white/20 font-light">Pro</span>
              </h1>
            </div>
            <p className="max-w-xs text-xs text-white/40 leading-relaxed uppercase font-medium tracking-wide">
              Initialize the complete hormonal optimization system. Move beyond generic health toward quantified peak performance.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 lg:px-0">

        {/* MODULE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          {FEATURES.map((f) => (
            <div key={f.title} className="group relative border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-30 transition-opacity">
                <f.icon size={40} strokeWidth={1} />
              </div>
              <div className="relative z-10">
                <div className="text-[9px] font-black text-[#C8A2C8] uppercase tracking-[3px] mb-3">{f.label}</div>
                <h3 className="text-sm font-black uppercase tracking-tight mb-2">{f.title}</h3>
                <p className="text-[11px] text-white/40 leading-relaxed line-clamp-3 group-hover:text-white/60 transition-colors">
                  {f.desc}
                </p>
              </div>
              <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#C8A2C8] group-hover:w-full transition-all duration-500" />
            </div>
          ))}

          <div className="border border-dashed border-white/10 flex items-center justify-center p-6 bg-black/20">
            <div className="text-center">
              <Cpu size={24} className="mx-auto mb-2 text-white/10" />
              <span className="text-[9px] font-black uppercase tracking-[3px] text-white/20">Future Modules Pending...</span>
            </div>
          </div>
        </div>

        {/* PRICING */}
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#C8A2C8]/20 to-transparent blur-2xl opacity-50" />

          <Card className="relative overflow-hidden p-8 md:p-10" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8A2C8]/5 rounded-full -mr-16 -mt-16 blur-3xl" />

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-10 border-b border-white/5">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">Initialization Keys</h2>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-[2px]">Select your access duration</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#C8A2C8]/10 border border-[#C8A2C8]/20">
                <Zap size={12} className="text-[#C8A2C8]" />
                <span className="text-[10px] font-black text-[#C8A2C8] uppercase tracking-widest">Early Access Active</span>
              </div>
            </header>

            {/* Plan Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              {PLANS.map((plan) => {
                const active = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id as 'monthly' | '90day')}
                    className={cn(
                      'relative text-left p-5 border transition-all duration-200',
                      active
                        ? 'border-[#C8A2C8]/50 bg-[#C8A2C8]/5 shadow-[0_0_20px_rgba(200,162,200,0.08)]'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                    )}
                  >
                    {plan.tag && (
                      <div className="absolute -top-2 right-4 px-2 py-0.5 bg-[#C8A2C8] text-black text-[8px] font-black uppercase tracking-widest">
                        {plan.tag}
                      </div>
                    )}

                    {/* Selected indicator */}
                    <div className={cn(
                      'absolute top-4 right-4 w-4 h-4 border flex items-center justify-center transition-all',
                      active ? 'bg-[#C8A2C8] border-[#C8A2C8]' : 'border-white/20 bg-transparent'
                    )}>
                      {active && <Check size={10} className="text-black stroke-[4px]" />}
                    </div>

                    <div className="text-[9px] font-black uppercase tracking-[3px] mb-2"
                      style={{ color: active ? '#C8A2C8' : 'rgba(255,255,255,0.2)' }}>
                      {plan.label}
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-black tracking-tighter text-white">{plan.price}</span>
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{plan.period}</span>
                    </div>
                    {plan.saving && (
                      <div className="text-[9px] text-[#C8A2C8] font-black uppercase tracking-widest mb-3">{plan.saving}</div>
                    )}
                    <ul className="space-y-1.5 mt-3 pt-3 border-t border-white/5">
                      {plan.features.map(feat => (
                        <li key={feat} className="flex items-center gap-2 text-[10px] text-white/50">
                          <ShieldCheck size={10} className="text-[#C8A2C8] shrink-0" /> {feat}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-black/40 border border-white/5 flex items-center gap-4">
                <Lock size={18} className="text-white/20 shrink-0" />
                <p className="text-[10px] text-white/40 leading-relaxed uppercase font-medium">
                  Payment gateway is currently in <span className="text-white">Secure Sandbox</span>.
                  Request an initialization key via the priority channel below.
                </p>
              </div>

              <a
                href={`mailto:support@optimizable.app?subject=LAB Access Request — ${selectedPlan === '90day' ? '90-Day ($49)' : 'Monthly ($19)'}`}
                className="group flex items-center justify-center gap-3 w-full py-6 bg-[#C8A2C8] text-black font-black text-xs tracking-[4px] uppercase hover:bg-white transition-all duration-300 shadow-[0_10px_30px_rgba(200,162,200,0.2)]"
              >
                Request {selectedPlan === '90day' ? '90-Day' : 'Monthly'} Access <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </Card>

          <p className="text-center text-[9px] text-white/20 uppercase font-black tracking-[4px] mt-10">
            Terms of Service Applied // Non-Medical Wellness Protocol
          </p>
        </div>
      </div>
    </div>
  );
}
