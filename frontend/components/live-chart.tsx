'use client';

import { createChart } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

export function LiveChart({ series }: { series: Array<{ time: string; value: number }> }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      layout: { background: { color: '#020617' }, textColor: '#cbd5e1' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      width: ref.current.clientWidth,
      height: 260,
    });
    const line = chart.addAreaSeries({ lineColor: '#818cf8', topColor: 'rgba(129,140,248,0.4)', bottomColor: 'rgba(15,23,42,0.1)' });
    line.setData(series.map((x) => ({ time: x.time as never, value: x.value })));
    const onResize = () => chart.applyOptions({ width: ref.current?.clientWidth ?? 600 });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
    };
  }, [series]);

  return <div className="panel p-2" ref={ref} />;
}
