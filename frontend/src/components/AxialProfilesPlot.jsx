import React, { useState } from 'react';

export default function AxialProfilesPlot({
  profiles = null,
  pfrTauHours = 11.87
}) {
  const [hoverIdx, setHoverIdx] = useState(null);

  if (!profiles || !profiles.fractional_length) {
    return <div className="p-8 text-center text-slate-400">Loading PFR 1D Axial Profiles...</div>;
  }

  const { fractional_length, S, Xb, DO, reaction_rate } = profiles;
  const n = fractional_length.length;

  const svgWidth = 650;
  const svgHeight = 360;
  const margin = { top: 30, right: 65, bottom: 50, left: 65 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const maxS = Math.max(...S, 750) * 1.05;
  const minDO = 0.0;
  const maxDO = 8.2; // DO sat

  const scaleX = (frac) => margin.left + frac * plotWidth;
  const scaleYS = (sVal) => margin.top + plotHeight - (sVal / maxS) * plotHeight;
  const scaleYDO = (doVal) => margin.top + plotHeight - (doVal / maxDO) * plotHeight;

  // Build SVG Paths
  const pathS = S.reduce((acc, val, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${scaleX(fractional_length[i])} ${scaleYS(val)}`, '');
  const pathDO = DO.reduce((acc, val, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${scaleX(fractional_length[i])} ${scaleYDO(val)}`, '');

  // Critical DO Sag coordinate (minimum DO point)
  let minDOVal = 999;
  let minDOIdx = 0;
  DO.forEach((val, i) => {
    if (val < minDOVal) {
      minDOVal = val;
      minDOIdx = i;
    }
  });

  const activeIdx = hoverIdx !== null ? hoverIdx : minDOIdx;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-400"></span>
            1D PFR Axial Spatial Concentration Profiles
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Axial coordinate <span className="font-mono text-indigo-300">z / L ∈ [0, 1]</span> (Total HRT = {pfrTauHours.toFixed(2)} hours)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-purple-400" />
            <span className="text-purple-300">Substrate bCOD (Left Axis)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400" />
            <span className="text-cyan-300">Dissolved Oxygen DO (Right Axis)</span>
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
              const frac = (relX - margin.left) / plotWidth;
              const idx = Math.min(n - 1, Math.max(0, Math.round(frac * (n - 1))));
              setHoverIdx(idx);
            }
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Shaded DO Sag Zone */}
          <rect
            x={scaleX(0.02)}
            y={margin.top}
            width={scaleX(0.22) - scaleX(0.02)}
            height={plotHeight}
            fill="#ef4444"
            fillOpacity="0.08"
          />

          {/* Grid lines */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((tick) => (
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
                {(tick * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          {/* Substrate S Line */}
          <path
            d={pathS}
            fill="none"
            stroke="#a855f7"
            strokeWidth="3"
          />

          {/* DO Line */}
          <path
            d={pathDO}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="3"
          />

          {/* Highlight DO Sag Point */}
          <circle
            cx={scaleX(fractional_length[minDOIdx])}
            cy={scaleYDO(DO[minDOIdx])}
            r="5"
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            x={scaleX(fractional_length[minDOIdx]) + 8}
            y={scaleYDO(DO[minDOIdx]) + 4}
            fill="#f87171"
            fontSize="10"
            fontWeight="bold"
          >
            DO Sag Min ({DO[minDOIdx].toFixed(2)} mg/L)
          </text>

          {/* Interactive Hover Vertical Cursor */}
          {activeIdx !== null && (
            <g>
              <line
                x1={scaleX(fractional_length[activeIdx])}
                y1={margin.top}
                x2={scaleX(fractional_length[activeIdx])}
                y2={margin.top + plotHeight}
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={scaleX(fractional_length[activeIdx])}
                cy={scaleYS(S[activeIdx])}
                r="4.5"
                fill="#a855f7"
              />
              <circle
                cx={scaleX(fractional_length[activeIdx])}
                cy={scaleYDO(DO[activeIdx])}
                r="4.5"
                fill="#06b6d4"
              />
            </g>
          )}

          {/* Left Axis (Substrate S) */}
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
            bCOD Substrate S [mg/L]
          </text>

          {/* Right Axis (DO) */}
          <line
            x1={margin.left + plotWidth}
            y1={margin.top}
            x2={margin.left + plotWidth}
            y2={margin.top + plotHeight}
            stroke="#06b6d4"
            strokeWidth="2"
          />
          <text
            transform={`rotate(90 ${margin.left + plotWidth + 48} ${margin.top + plotHeight / 2})`}
            x={margin.left + plotWidth + 48}
            y={margin.top + plotHeight / 2}
            fill="#22d3ee"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            Dissolved Oxygen DO [mg/L]
          </text>

          {/* Bottom Axis Label */}
          <text
            x={margin.left + plotWidth / 2}
            y={margin.top + plotHeight + 42}
            fill="#94a3b8"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            Fractional Reactor Length z / L
          </text>
        </svg>
      </div>

      {/* Readout Pill bar */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
          <span className="text-slate-500">Position z/L:</span>
          <span className="font-mono font-bold text-slate-200">
            {(fractional_length[activeIdx] * 100).toFixed(1)}% ({((fractional_length[activeIdx] * pfrTauHours)).toFixed(2)} h)
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/40 flex flex-col">
          <span className="text-purple-400">Substrate S(z):</span>
          <span className="font-mono font-bold text-purple-200">
            {S[activeIdx].toFixed(1)} mg bCOD/L
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex flex-col">
          <span className="text-cyan-400">Dissolved Oxygen DO(z):</span>
          <span className="font-mono font-bold text-cyan-200">
            {DO[activeIdx].toFixed(2)} mg/L
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex flex-col">
          <span className="text-emerald-400">Biomass X_b(z):</span>
          <span className="font-mono font-bold text-emerald-200">
            {Xb[activeIdx].toFixed(0)} mg VSS/L
          </span>
        </div>
      </div>
    </div>
  );
}
