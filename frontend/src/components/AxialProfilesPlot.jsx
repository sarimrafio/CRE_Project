import React from 'react';

export default function AxialProfilesPlot({
  profiles = null,
  pfrTauHours = 11.87,
  probeZ = 0.12,
  onChangeProbeZ
}) {
  if (!profiles || !profiles.fractional_length) {
    return <div className="p-8 text-center text-slate-400">Loading PFR 1D Axial Profiles...</div>;
  }

  const { fractional_length, S, Xb, DO } = profiles;
  const n = fractional_length.length;

  const svgWidth = 650;
  const svgHeight = 360;
  const margin = { top: 30, right: 65, bottom: 50, left: 65 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const maxS = Math.max(...S, 750) * 1.05;
  const maxDO = 8.2;

  const scaleX = (frac) => margin.left + frac * plotWidth;
  const scaleYS = (sVal) => margin.top + plotHeight - (sVal / maxS) * plotHeight;
  const scaleYDO = (doVal) => margin.top + plotHeight - (doVal / maxDO) * plotHeight;

  const pathS = S.reduce((acc, val, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${scaleX(fractional_length[i])} ${scaleYS(val)}`, '');
  const pathDO = DO.reduce((acc, val, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${scaleX(fractional_length[i])} ${scaleYDO(val)}`, '');

  let minDOVal = 999;
  let minDOIdx = 0;
  DO.forEach((val, i) => {
    if (val < minDOVal) {
      minDOVal = val;
      minDOIdx = i;
    }
  });

  const activeIdx = Math.min(n - 1, Math.max(0, Math.round(probeZ * (n - 1))));

  return (
    <div className="bg-sumi/90 border border-putty/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-putty/20 gap-3">
        <div>
          <h3 className="text-lg font-bold text-linen flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-workwear"></span>
            1D PFR Axial Spatial Concentration Profiles (Synchronized with 3D Sonde Probe)
          </h3>
          <p className="text-xs text-putty/80 mt-0.5">
            Move mouse over plot to reposition the 3D Sonde Probe along <span className="font-mono text-celadon">z / L ∈ [0, 1]</span> (HRT = {pfrTauHours.toFixed(2)} h)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-oxblood" />
            <span className="text-putty">Substrate bCOD (Left Axis)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-workwear" />
            <span className="text-celadon">Dissolved Oxygen DO (Right Axis)</span>
          </div>
        </div>
      </div>

      <div className="relative mt-4 flex justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[650px] h-auto overflow-visible select-none cursor-crosshair"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * svgWidth;
            if (relX >= margin.left && relX <= margin.left + plotWidth) {
              const frac = (relX - margin.left) / plotWidth;
              if (onChangeProbeZ) onChangeProbeZ(Number(Math.min(1, Math.max(0, frac)).toFixed(2)));
            }
          }}
        >
          {/* Hypoxic DO Sag Hazard Zone: Tuscan Oxblood tint */}
          <rect
            x={scaleX(0.02)}
            y={margin.top}
            width={scaleX(0.22) - scaleX(0.02)}
            height={plotHeight}
            fill="#6E2B27"
            fillOpacity="0.14"
          />

          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((tick) => (
            <g key={tick}>
              <line x1={scaleX(tick)} y1={margin.top} x2={scaleX(tick)} y2={margin.top + plotHeight} stroke="#2B2D26" strokeDasharray="4 4" />
              <text x={scaleX(tick)} y={margin.top + plotHeight + 20} fill="#9EAFA2" fontSize="11" textAnchor="middle">
                {(tick * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          {/* Substrate Profile: Tuscan Oxblood (#6E2B27) */}
          <path d={pathS} fill="none" stroke="#6E2B27" strokeWidth="3" />
          {/* DO Profile: French Workwear Blue (#2C526A) */}
          <path d={pathDO} fill="none" stroke="#2C526A" strokeWidth="3" />

          {/* DO Sag Minima Marker */}
          <circle cx={scaleX(fractional_length[minDOIdx])} cy={scaleYDO(DO[minDOIdx])} r="5" fill="#6E2B27" stroke="#F6F3ED" strokeWidth="2" />
          <text x={scaleX(fractional_length[minDOIdx]) + 8} y={scaleYDO(DO[minDOIdx]) + 4} fill="#C2593F" fontSize="10" fontWeight="bold">
            DO Sag Min ({DO[minDOIdx].toFixed(2)} mg/L)
          </text>

          {/* Synchronized 3D Sonde Probe Cursor: Raw Ochre */}
          <g>
            <line
              x1={scaleX(fractional_length[activeIdx])}
              y1={margin.top}
              x2={scaleX(fractional_length[activeIdx])}
              y2={margin.top + plotHeight}
              stroke="#C68A3C"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <circle cx={scaleX(fractional_length[activeIdx])} cy={scaleYS(S[activeIdx])} r="5.5" fill="#6E2B27" stroke="#C68A3C" strokeWidth="2" />
            <circle cx={scaleX(fractional_length[activeIdx])} cy={scaleYDO(DO[activeIdx])} r="5.5" fill="#2C526A" stroke="#C68A3C" strokeWidth="2" />
          </g>

          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotHeight} stroke="#6E2B27" strokeWidth="2" />
          <text transform={`rotate(-90 ${margin.left - 45} ${margin.top + plotHeight / 2})`} x={margin.left - 45} y={margin.top + plotHeight / 2} fill="#DDD5C7" fontSize="12" fontWeight="bold" textAnchor="middle">
            bCOD Substrate S [mg/L]
          </text>

          <line x1={margin.left + plotWidth} y1={margin.top} x2={margin.left + plotWidth} y2={margin.top + plotHeight} stroke="#2C526A" strokeWidth="2" />
          <text transform={`rotate(90 ${margin.left + plotWidth + 48} ${margin.top + plotHeight / 2})`} x={margin.left + plotWidth + 48} y={margin.top + plotHeight / 2} fill="#9EAFA2" fontSize="12" fontWeight="bold" textAnchor="middle">
            Dissolved Oxygen DO [mg/L]
          </text>

          <text x={margin.left + plotWidth / 2} y={margin.top + plotHeight + 42} fill="#DDD5C7" fontSize="12" fontWeight="bold" textAnchor="middle">
            Fractional Reactor Length z / L
          </text>
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-sumi border border-ochre/40 flex flex-col">
          <span className="text-ochre font-semibold">3D Sonde Position z/L:</span>
          <span className="font-mono font-bold text-linen">
            {(fractional_length[activeIdx] * 100).toFixed(1)}% ({(fractional_length[activeIdx] * pfrTauHours).toFixed(2)} h)
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-sumi border border-oxblood/40 flex flex-col">
          <span className="text-terracotta font-semibold">Substrate S(z):</span>
          <span className="font-mono font-bold text-linen">{S[activeIdx].toFixed(1)} mg bCOD/L</span>
        </div>
        <div className="p-2.5 rounded-xl bg-sumi border border-workwear/40 flex flex-col">
          <span className="text-celadon font-semibold">Dissolved Oxygen DO(z):</span>
          <span className="font-mono font-bold text-linen">{DO[activeIdx].toFixed(2)} mg/L</span>
        </div>
        <div className="p-2.5 rounded-xl bg-sumi border border-pine/50 flex flex-col">
          <span className="text-celadon font-semibold">
            Biomass X<sub>b</sub>(z):
          </span>
          <span className="font-mono font-bold text-linen">{Xb[activeIdx].toFixed(0)} mg VSS/L</span>
        </div>
      </div>
    </div>
  );
}
