export function ScoreRing({ score, size = 120, strokeWidth = 8, color: colorProp }: { score: number; size?: number; strokeWidth?: number; color?: string }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - score / 100);
  const color = colorProp ?? (score >= 70 ? '#00E676' : score >= 45 ? '#FFB300' : '#FF5252');

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={fill}
          strokeLinecap="butt"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-[10px] tracking-widest text-[#9A9A9A] uppercase">Score</span>
      </div>
    </div>
  );
}
