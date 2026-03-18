'use client';
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
  Cpu
} from 'lucide-react';

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

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">

      {/* HEADER */}
      <div className="relative border-b border-white/5 bg-white/[0.01] px-6 py-12 lg:px-12">
        <div className="absolute top-4 right-6 flex items-center gap-2 opacity-20">
          <span className="text-[8px] font-black uppercase tracking-[3px]">Status: Restricted</span>
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        </div>

        <div className="max-w-4xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[2px] text-white/40 hover:text-[#00E676] transition-colors mb-8">
            <ArrowLeft size={14} /> Back to Command Center
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="text-[11px] font-black tracking-[4px] text-[#00E676] uppercase mb-2">Protocol Unlock Sequence</div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none">
                Optimizable <span className="text-white/20 italic font-light">Pro</span>
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
                <div className="text-[9px] font-black text-[#00E676] uppercase tracking-[3px] mb-3">{f.label}</div>
                <h3 className="text-sm font-black uppercase tracking-tight mb-2">{f.title}</h3>
                <p className="text-[11px] text-white/40 leading-relaxed line-clamp-3 group-hover:text-white/60 transition-colors">
                  {f.desc}
                </p>
              </div>

              <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#00E676] group-hover:w-full transition-all duration-500" />
            </div>
          ))}

          {/* Integration Placeholder */}
          <div className="border border-dashed border-white/10 flex items-center justify-center p-6 bg-black/20">
            <div className="text-center">
              <Cpu size={24} className="mx-auto mb-2 text-white/10" />
              <span className="text-[9px] font-black uppercase tracking-[3px] text-white/20">Future Modules Pending...</span>
            </div>
          </div>
        </div>

        {/* PRICING */}
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00E676]/20 to-transparent blur-2xl opacity-50" />

          <Card className="relative overflow-hidden p-8 md:p-10" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E676]/5 rounded-full -mr-16 -mt-16 blur-3xl" />

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-10 border-b border-white/5">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">Initialization Keys</h2>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-[2px]">Select your access duration</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#00E676]/10 border border-[#00E676]/20">
                <Zap size={12} className="text-[#00E676]" />
                <span className="text-[10px] font-black text-[#00E676] uppercase tracking-widest">Early Access Active</span>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="space-y-2">
                <div className="text-[9px] font-black text-white/20 uppercase tracking-[3px]">Standard Access</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tighter">$19</span>
                  <span className="text-xs text-white/40 font-bold uppercase tracking-widest">/ Month</span>
                </div>
                <ul className="text-[10px] space-y-2 pt-4">
                  <li className="flex items-center gap-2 text-white/60"><ShieldCheck size={12} className="text-[#00E676]" /> Full Lab Analysis</li>
                  <li className="flex items-center gap-2 text-white/60"><ShieldCheck size={12} className="text-[#00E676]" /> Rolling Protocol Updates</li>
                </ul>
              </div>

              <div className="relative space-y-2 p-4 bg-white/[0.03] border border-white/5">
                <div className="absolute -top-2 right-4 px-2 py-0.5 bg-[#00E676] text-black text-[8px] font-black uppercase tracking-widest">Priority</div>
                <div className="text-[9px] font-black text-[#00E676] uppercase tracking-[3px]">Optimal Cycle</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tighter">$49</span>
                  <span className="text-xs text-white/40 font-bold uppercase tracking-widest">/ 90 Days</span>
                </div>
                <div className="text-[9px] text-[#00E676] font-black uppercase tracking-widest">Save 14% on full cycle</div>
              </div>
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
                href="mailto:support@optimizable.app?subject=LAB Access Request"
                className="group flex items-center justify-center gap-3 w-full py-6 bg-[#00E676] text-black font-black text-xs tracking-[4px] uppercase hover:bg-white transition-all duration-300 shadow-[0_10px_30px_rgba(0,230,118,0.2)]"
              >
                Request Initialization <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
