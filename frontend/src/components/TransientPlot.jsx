import React, { useState } from 'react';

export default function TransientPlot({
  transientData = null
}) {
  const [hoverDay, setHoverDay] = useState(null);

  if (!transientData || !transientData.time) {
    return <div className="p-8 text-center text-slate-400">Loading Transient Startup Simulation...</div>;
  }

  const { time, S, Xb } = transientData;
  const n = time.length;

  const svgWidth = 650;
  const svgHeight = 360;
  const margin = { top: 30, right: 65, bottom: 50, left: 65 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const maxDays = 25.0;
  const maxS = Math.max(...S, 750) * 1.05;
  const maxXb = Math.max(...Xb, 4000) * 1.1;

  const scaleX = (t) => margin.left + (t / maxDays) * plotWidth;
  const scaleYS = (sVal) => margin.top + plotHeight - (sVal / maxS) * plotHeight;
  const scaleYXb = (xbVal) => margin.top + plotHeight - (xbVal / maxXb) * plotHeight;

  const pathS = S.reduce((acc, val, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${scaleX(time[i])} ${scaleYS(val)}`, '');
  const pathXb = Xb.reduce((acc, val, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${scaleX(time[i])} ${scaleYXb(val)}`, '');

  const activeIdx = hoverDay !== null
    ? Math.min(n - 1, Math.max(0, Math.round((hoverDay / maxDays) * (n - 1))))
    : n - 1;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            Dynamic CSTR Startup Trajectories (Inoculation to Steady State)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational timeline: 0 to 25 Days (Initial seed biomass <i>X</i><sub>b,0</sub> = 200 mg VSS/L)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-purple-400" />
            <span className="text-purple-300">Substrate bCOD (Left Axis)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400" />
            <span className="text-emerald-300">
              Biomass X<sub>b</sub> (Right Axis)
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-4 flex justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[650px] h-auto overflow-visible select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width * svgWidth;
            if (relX >= margin.left && relX <= margin.left + plotWidth) {
              const d = ((relX - margin.left) / plotWidth) * maxDays;
              setHoverDay(Math.min(maxDays, Math.max(0, d)));
            }
          }}
          onMouseLeave={() => setHoverDay(null)}
        >
          {[0, 5, 10, 15, 20, 25].map((tick) => (
            <g key={tick}>
              <line
                x1={scaleX(tick)}
                y1={margin.top}
                x2={scaleX(tick)}
                y2={margin.top + plotHeight}
                stroke="#1e293b"
                strokeDasharray="4 4"
              />
              <text
                x={scaleX(tick)}
                y={margin.top + plotHeight + 20}
                fill="#64748b"
                fontSize="11"
                textAnchor="middle"
              >
                Day {tick}
              </text>
            </g>
          ))}

          <path
            d={pathS}
            fill="none"
            stroke="#a855f7"
            strokeWidth="3"
          />

          <path
            d={pathXb}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
          />

          {activeIdx !== null && (
            <g>
              <line
                x1={scaleX(time[activeIdx])}
                y1={margin.top}
                x2={scaleX(time[activeIdx])}
                y2={margin.top + plotHeight}
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={scaleX(time[activeIdx])}
                cy={scaleYS(S[activeIdx])}
                r="4.5"
                fill="#a855f7"
              />
              <circle
                cx={scaleX(time[activeIdx])}
                cy={scaleYXb(Xb[activeIdx])}
                r="4.5"
                fill="#10b981"
              />
            </g>
          )}

          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + plotHeight}
            stroke="#a855f7"
            strokeWidth="2"
          />
          <text
            transform={`rotate(-90 ${margin.left - 45} ${margin.top + plotHeight / 2})`}
            x={margin.left - 45}
            y={margin.top + plotHeight / 2}
            fill="#c084fc"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            Substrate bCOD S [mg/L]
          </text>

          <line
            x1={margin.left + plotWidth}
            y1={margin.top}
            x2={margin.left + plotWidth}
            y2={margin.top + plotHeight}
            stroke="#10b981"
            strokeWidth="2"
          />
          <text
            transform={`rotate(90 ${margin.left + plotWidth + 48} ${margin.top + plotHeight / 2})`}
            x={margin.left + plotWidth + 48}
            y={margin.top + plotHeight / 2}
            fill="#34d399"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            Biomass X<tspan dy="3" fontSize="9">b</tspan><tspan dy="-3"> [mg VSS/L]</tspan>
          </text>
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
          <span className="text-slate-500">Timeline:</span>
          <span className="font-mono font-bold text-slate-200">Day {time[activeIdx].toFixed(1)}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/40 flex flex-col">
          <span className="text-purple-400">Substrate S(t):</span>
          <span className="font-mono font-bold text-purple-200">{S[activeIdx].toFixed(1)} mg bCOD/L</span>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex flex-col">
          <span className="text-emerald-400">
            Biomass Inventory X<sub>b</sub>(t):
          </span>
          <span className="font-mono font-bold text-emerald-200">{Xb[activeIdx].toFixed(0)} mg VSS/L</span>
        </div>
      </div>
    </div>
  );
}
