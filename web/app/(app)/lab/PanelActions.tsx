'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Pencil, Trash2 } from 'lucide-react';

export function PanelActions({ panelId, reportId }: { panelId: string; reportId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from('analysis_reports').delete().eq('id', reportId);
    await supabase.from('bloodwork_panels').delete().eq('id', panelId);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={() => router.push(`/lab/upload?edit=${panelId}&reportId=${reportId}`)}
        className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border border-white/10 text-white/30 hover:text-white hover:border-white/30 transition-all"
      >
        <Pencil size={9} /> Edit
      </button>
      {confirming ? (
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all"
          >
            {deleting ? '...' : 'Confirm Delete'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border border-white/10 text-white/30 hover:border-white/30 transition-all"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border border-white/10 text-white/30 hover:text-red-400 hover:border-red-500/30 transition-all"
        >
          <Trash2 size={9} /> Delete
        </button>
      )}
    </div>
  );
}
