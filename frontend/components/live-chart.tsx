'use client';

export function LiveChart({ series }: { series: Array<{ time: string; value: number }> }) {
  if (!series.length) {
    return <div className="panel p-4 text-sm text-slate-400">No chart data available.</div>;
  }

  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 100;
  const height = 36;

  const points = series
    .map((point, index) => {
      const x = (index / Math.max(1, series.length - 1)) * width;
      const y = max === min ? height / 2 : ((max - point.value) / (max - min)) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="panel p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full">
        <polyline points={points} fill="none" stroke="#818cf8" strokeWidth="1.6" />
      </svg>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>{series[0]?.time?.slice(0, 10)}</span>
        <span>{series.at(-1)?.time?.slice(0, 10)}</span>
      </div>
    </div>
  );
}
