import Link from 'next/link';
import { Card } from '@/components/ui/Card';

const FEATURES = [
  { icon: '⚗', title: 'LAB', desc: 'Deep AI analysis of every biomarker against optimal (not standard) ranges. Includes health score, ratios, concerns, and medical referral flags.' },
  { icon: '▦', title: '90-Day Protocol', desc: 'Three 30-day phases — Foundation, Calibration, Peak. Each phase is personalized from your actual bloodwork results, not a generic template.' },
  { icon: '◷', title: 'Wellbeing Tracking', desc: 'Daily check-in: energy, mood, libido, mental clarity, morning erection. 30-day trend graphs aligned to your protocol phases.' },
  { icon: '↗', title: 'Progress Comparison', desc: 'Each new bloodwork panel is compared against your baseline. See exactly which biomarkers improved and by how much.' },
  { icon: '⊕', title: 'Personalized Supplement Stack', desc: 'Exact supplements, doses, and timing derived from your specific biomarker profile — not generic advice.' },
];

export default function UpgradePage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <div className="text-[10px] font-bold tracking-[3px] text-[#00E676] uppercase mb-2">Unlock Full Access</div>
        <h1 className="text-2xl font-black text-white tracking-wide mb-2">OPTIMIZABLE LAB</h1>
        <p className="text-sm text-[#9A9A9A] leading-relaxed">
          The complete hormonal optimization system. Upload your bloodwork, get your protocol, track your progress.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        {FEATURES.map(f => (
          <Card key={f.title}>
            <div className="flex gap-4">
              <div className="text-xl w-8 shrink-0 text-[#00E676]">{f.icon}</div>
              <div>
                <div className="text-sm font-bold text-white mb-1">{f.title}</div>
                <div className="text-xs text-[#9A9A9A] leading-relaxed">{f.desc}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pricing */}
      <div className="border border-[rgba(0,230,118,0.25)] bg-[rgba(0,230,118,0.04)] p-6 mb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] text-[#9A9A9A] tracking-widest uppercase mb-1">Monthly</div>
            <div className="text-3xl font-black text-white">$19<span className="text-sm font-normal text-[#9A9A9A]">/mo</span></div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#00E676] tracking-widest uppercase mb-1">Best Value</div>
            <div className="text-3xl font-black text-white">$49<span className="text-sm font-normal text-[#9A9A9A]">/90 days</span></div>
            <div className="text-[10px] text-[#00E676]">save 14%</div>
          </div>
        </div>
        <div className="text-xs text-[#4A4A4A] mb-5 border-t border-[rgba(255,255,255,0.05)] pt-4">
          Payment processing coming soon. Contact us to get early access.
        </div>
        <a
          href="mailto:support@optimizable.app?subject=LAB Access Request"
          className="block w-full py-3 bg-[#00E676] text-black font-black text-sm tracking-widest uppercase text-center hover:bg-[#00c864] transition-colors"
        >
          GET EARLY ACCESS →
        </a>
      </div>

      <Link href="/dashboard" className="block text-center text-xs text-[#4A4A4A] hover:text-[#9A9A9A] transition-colors">
        ← Back to Dashboard
      </Link>
    </div>
  );
}
