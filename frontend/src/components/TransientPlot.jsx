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
    <div className="bg-sumi/90 border border-putty/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-putty/20 gap-3">
        <div>
          <h3 className="text-lg font-bold text-linen flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-pine"></span>
            Dynamic CSTR Startup Trajectories (Inoculation to Steady State)
          </h3>
          <p className="text-xs text-putty/80 mt-0.5">
            Operational timeline: 0 to 25 Days (Initial seed biomass <i>X</i><sub>b,0</sub> = 200 mg VSS/L)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-terracotta" />
            <span className="text-terracotta">Substrate bCOD (Left Axis)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-pine" />
            <span className="text-celadon">
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
                stroke="#2B2D26"
                strokeDasharray="4 4"
              />
              <text
                x={scaleX(tick)}
                y={margin.top + plotHeight + 20}
                fill="#9EAFA2"
                fontSize="11"
                textAnchor="middle"
              >
                Day {tick}
              </text>
            </g>
          ))}

          {/* Substrate Trajectory: Terracotta (#C2593F) */}
          <path
            d={pathS}
            fill="none"
            stroke="#C2593F"
            strokeWidth="3"
          />

          {/* Biomass Growth: Pine Needle (#2B4436) */}
          <path
            d={pathXb}
            fill="none"
            stroke="#2B4436"
            strokeWidth="3"
          />

          {activeIdx !== null && (
            <g>
              <line
                x1={scaleX(time[activeIdx])}
                y1={margin.top}
                x2={scaleX(time[activeIdx])}
                y2={margin.top + plotHeight}
                stroke="#DDD5C7"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={scaleX(time[activeIdx])}
                cy={scaleYS(S[activeIdx])}
                r="4.5"
                fill="#C2593F"
              />
              <circle
                cx={scaleX(time[activeIdx])}
                cy={scaleYXb(Xb[activeIdx])}
                r="4.5"
                fill="#2B4436"
              />
            </g>
          )}

          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + plotHeight}
            stroke="#C2593F"
            strokeWidth="2"
          />
          <text
            transform={`rotate(-90 ${margin.left - 45} ${margin.top + plotHeight / 2})`}
            x={margin.left - 45}
            y={margin.top + plotHeight / 2}
            fill="#DDD5C7"
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
            stroke="#2B4436"
            strokeWidth="2"
          />
          <text
            transform={`rotate(90 ${margin.left + plotWidth + 48} ${margin.top + plotHeight / 2})`}
            x={margin.left + plotWidth + 48}
            y={margin.top + plotHeight / 2}
            fill="#9EAFA2"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            Biomass X<tspan dy="3" fontSize="9">b</tspan><tspan dy="-3"> [mg VSS/L]</tspan>
          </text>
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-sumi border border-putty/20 flex flex-col">
          <span className="text-putty/70 font-semibold">Timeline:</span>
          <span className="font-mono font-bold text-linen">Day {time[activeIdx].toFixed(1)}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-sumi border border-terracotta/40 flex flex-col">
          <span className="text-terracotta font-semibold">Substrate S(t):</span>
          <span className="font-mono font-bold text-linen">{S[activeIdx].toFixed(1)} mg bCOD/L</span>
        </div>
        <div className="p-2.5 rounded-xl bg-sumi border border-pine/50 flex flex-col">
          <span className="text-celadon font-semibold">
            Biomass Inventory X<sub>b</sub>(t):
          </span>
          <span className="font-mono font-bold text-linen">{Xb[activeIdx].toFixed(0)} mg VSS/L</span>
        </div>
      </div>
    </div>
  );
}
