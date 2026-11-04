import React, { useState } from 'react';

export default function LevenspielPlot({
  curveData = [],
  targetConversion = 0.90,
  cstrInvRate = 0.00062,
  cstrVolume = 489.7,
  pfrVolume = 494.8,
  volumeRatio = 0.99
}) {
  const [hoverX, setHoverX] = useState(null);

  if (!curveData || curveData.length === 0) {
    return <div className="p-8 text-center text-slate-400">Loading Levenspiel data...</div>;
  }

  // Plot Dimensions
  const svgWidth = 650;
  const svgHeight = 360;
  const margin = { top: 30, right: 40, bottom: 50, left: 70 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Max bounds
  const maxX = 1.0;
  const maxInvRate = Math.max(...curveData.map(d => d.invRate), cstrInvRate) * 1.25;

  const scaleX = (x) => margin.left + (x / maxX) * plotWidth;
  const scaleY = (y) => margin.top + plotHeight - (y / maxInvRate) * plotHeight;

  // Filter curve points up to target conversion for PFR area
  const pfrPoints = curveData.filter(d => d.conversion <= targetConversion);
  const pfrPathD = pfrPoints.reduce((acc, p, idx) => {
    const cmd = idx === 0 ? 'M' : 'L';
    return `${acc} ${cmd} ${scaleX(p.conversion)} ${scaleY(p.invRate)}`;
  }, '');

  // Complete PFR Polygon
  const pfrAreaD = `${pfrPathD} L ${scaleX(targetConversion)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`;

  // Entire Curve Line
  const fullCurveD = curveData.reduce((acc, p, idx) => {
    const cmd = idx === 0 ? 'M' : 'L';
    return `${acc} ${cmd} ${scaleX(p.conversion)} ${scaleY(p.invRate)}`;
  }, '');

  // CSTR Rectangle Coordinates
  const cstrRectX = scaleX(0);
  const cstrRectY = scaleY(cstrInvRate);
  const cstrRectW = scaleX(targetConversion) - scaleX(0);
  const cstrRectH = scaleY(0) - scaleY(cstrInvRate);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
            Levenspiel Reactor Sizing Analysis
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Fogler CRE Method: Reciprocal Substrate Consumption Rate <span className="font-mono text-cyan-300">1 / (-r_S)</span> vs Conversion <span className="font-mono text-cyan-300">X_S</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-blue-500/30 border border-blue-400" />
            <span className="text-blue-300">CSTR Area (Rectangle): {cstrVolume.toFixed(1)} m³</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500/30 border border-emerald-400" />
            <span className="text-emerald-300">PFR Area (Integral): {pfrVolume.toFixed(1)} m³</span>
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
              const conv = ((relX - margin.left) / plotWidth) * maxX;
              setHoverX(Math.min(0.95, Math.max(0, conv)));
            }
          }}
          onMouseLeave={() => setHoverX(null)}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((tick) => (
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

          {/* CSTR Operating Rectangle (Blue Hatch) */}
          <rect
            x={cstrRectX}
            y={cstrRectY}
            width={cstrRectW}
            height={cstrRectH}
            fill="#3b82f6"
            fillOpacity="0.18"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />

          {/* PFR Integral Area (Emerald Shading) */}
          <path
            d={pfrAreaD}
            fill="#10b981"
            fillOpacity="0.25"
            stroke="#10b981"
            strokeWidth="2"
          />

          {/* 1/(-rS) Curve */}
          <path
            d={fullCurveD}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />

          {/* Target Conversion Vertical Line */}
          <line
            x1={scaleX(targetConversion)}
            y1={margin.top}
            x2={scaleX(targetConversion)}
            y2={margin.top + plotHeight}
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <text
            x={scaleX(targetConversion)}
            y={margin.top - 8}
            fill="#f59e0b"
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
          >
            Target Exit X = {(targetConversion * 100).toFixed(1)}%
          </text>

          {/* Zero-Order Plateau Callout Annotation */}
          <rect
            x={scaleX(0.12)}
            y={scaleY(cstrInvRate * 0.9)}
            width="220"
            height="44"
            rx="6"
            fill="#0f172a"
            stroke="#334155"
          />
          <text
            x={scaleX(0.13) + 5}
            y={scaleY(cstrInvRate * 0.9) + 16}
            fill="#94a3b8"
            fontSize="10"
            fontWeight="bold"
          >
            ZERO-ORDER SATURATION PLATEAU (S &gt;&gt; Ks)
          </text>
          <text
            x={scaleX(0.13) + 5}
            y={scaleY(cstrInvRate * 0.9) + 32}
            fill="#38bdf8"
            fontSize="10"
          >
            Rate is constant → CSTR area ≈ PFR area
          </text>

          {/* Axes */}
          <line
            x1={margin.left}
            y1={margin.top + plotHeight}
            x2={margin.left + plotWidth}
            y2={margin.top + plotHeight}
            stroke="#475569"
            strokeWidth="2"
          />
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + plotHeight}
            stroke="#475569"
            strokeWidth="2"
          />

          {/* Axis Labels */}
          <text
            x={margin.left + plotWidth / 2}
            y={margin.top + plotHeight + 42}
            fill="#94a3b8"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            Substrate Conversion X_S = (S_0 - S) / S_0
          </text>

          <text
            transform={`rotate(-90 ${margin.left - 48} ${margin.top + plotHeight / 2})`}
            x={margin.left - 48}
            y={margin.top + plotHeight / 2}
            fill="#94a3b8"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            Reciprocal Rate 1 / (-r_S) [day · L / mg]
          </text>
        </svg>
      </div>

      {/* Explanatory Scientific Banner */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800/60 text-cyan-400 font-bold shrink-0">
          CRE Insight
        </div>
        <div>
          In classic chemical engineering with 1st-order reactions, PFR requires <span className="text-amber-300 font-semibold">3.91× less volume</span> than CSTR at 90% conversion. However, for industrial textile effluent (<span className="text-cyan-300 font-mono font-semibold">S_0 = 750 mg/L &gt;&gt; K_S = 65 mg/L</span>), the Monod reaction operates at its asymptotic maximum rate <span className="font-mono text-cyan-300">(-r_S ≈ -r_S,max)</span> across 85% of the conversion range. Therefore, the Levenspiel curve remains flat, collapsing the volume ratio to <span className="text-emerald-400 font-bold font-mono">{volumeRatio.toFixed(2)}×</span> (near parity)!
        </div>
      </div>
    </div>
  );
}
