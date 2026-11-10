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

  const svgWidth = 650;
  const svgHeight = 360;
  const margin = { top: 30, right: 40, bottom: 50, left: 70 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const maxX = 1.0;
  const maxInvRate = Math.max(...curveData.map(d => d.invRate), cstrInvRate) * 1.25;

  const scaleX = (x) => margin.left + (x / maxX) * plotWidth;
  const scaleY = (y) => margin.top + plotHeight - (y / maxInvRate) * plotHeight;

  const pfrPoints = curveData.filter(d => d.conversion <= targetConversion);
  const pfrPathD = pfrPoints.reduce((acc, p, idx) => {
    const cmd = idx === 0 ? 'M' : 'L';
    return `${acc} ${cmd} ${scaleX(p.conversion)} ${scaleY(p.invRate)}`;
  }, '');

  const pfrAreaD = `${pfrPathD} L ${scaleX(targetConversion)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`;

  const fullCurveD = curveData.reduce((acc, p, idx) => {
    const cmd = idx === 0 ? 'M' : 'L';
    return `${acc} ${cmd} ${scaleX(p.conversion)} ${scaleY(p.invRate)}`;
  }, '');

  const cstrRectX = scaleX(0);
  const cstrRectY = scaleY(cstrInvRate);
  const cstrRectW = scaleX(targetConversion) - scaleX(0);
  const cstrRectH = scaleY(0) - scaleY(cstrInvRate);

  return (
    <div className="bg-sumi/90 border border-putty/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-putty/20 gap-3">
        <div>
          <h3 className="text-lg font-bold text-linen flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-ochre"></span>
            Levenspiel Reactor Sizing Analysis
          </h3>
          <p className="text-xs text-putty/80 mt-0.5">
            Fogler CRE Method: Reciprocal Substrate Consumption Rate{' '}
            <span className="font-mono text-ochre font-semibold">
              1 / (−r<sub>S</sub>)
            </span>{' '}
            vs. Conversion{' '}
            <span className="font-mono text-ochre font-semibold">
              X<sub>S</sub>
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-terracotta/30 border border-terracotta" />
            <span className="text-terracotta font-semibold">
              CSTR Area (Rectangle): {cstrVolume.toFixed(1)} m<sup>3</sup>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-pine/40 border border-pine" />
            <span className="text-celadon font-semibold">
              PFR Area (Integral): {pfrVolume.toFixed(1)} m<sup>3</sup>
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
              const conv = ((relX - margin.left) / plotWidth) * maxX;
              setHoverX(Math.min(0.95, Math.max(0, conv)));
            }
          }}
          onMouseLeave={() => setHoverX(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1.0].map((tick) => (
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
                {(tick * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          {/* CSTR Sizing Rectangle: Terracotta (#C2593F) */}
          <rect
            x={cstrRectX}
            y={cstrRectY}
            width={cstrRectW}
            height={cstrRectH}
            fill="#C2593F"
            fillOpacity="0.22"
            stroke="#C2593F"
            strokeWidth="1.8"
            strokeDasharray="4 2"
          />

          {/* PFR Sizing Area Under Curve: Pine Needle (#2B4436) */}
          <path
            d={pfrAreaD}
            fill="#2B4436"
            fillOpacity="0.38"
            stroke="#2B4436"
            strokeWidth="2"
          />

          {/* Full Levenspiel Curve 1/(-r_S): French Workwear Blue (#2C526A) */}
          <path
            d={fullCurveD}
            fill="none"
            stroke="#2C526A"
            strokeWidth="2.8"
          />

          {/* Target Conversion Indicator: Raw Ochre (#C68A3C) */}
          <line
            x1={scaleX(targetConversion)}
            y1={margin.top}
            x2={scaleX(targetConversion)}
            y2={margin.top + plotHeight}
            stroke="#C68A3C"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <text
            x={scaleX(targetConversion)}
            y={margin.top - 8}
            fill="#C68A3C"
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
          >
            Target Exit X<tspan dy="2" fontSize="8">S</tspan><tspan dy="-2"> = {(targetConversion * 100).toFixed(1)}%</tspan>
          </text>

          {/* Plateau Callout Box: Sumi Ink & Warm Putty border */}
          <rect
            x={scaleX(0.12)}
            y={scaleY(cstrInvRate * 0.9)}
            width="235"
            height="44"
            rx="6"
            fill="#1C1D1A"
            stroke="#DDD5C7"
            strokeOpacity="0.35"
          />
          <text
            x={scaleX(0.13) + 5}
            y={scaleY(cstrInvRate * 0.9) + 16}
            fill="#DDD5C7"
            fontSize="10"
            fontWeight="bold"
          >
            ZERO-ORDER SATURATION PLATEAU (S &gt;&gt; K<tspan dy="2" fontSize="7.5">S</tspan><tspan dy="-2">)</tspan>
          </text>
          <text
            x={scaleX(0.13) + 5}
            y={scaleY(cstrInvRate * 0.9) + 32}
            fill="#9EAFA2"
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
            stroke="#DDD5C7"
            strokeWidth="2"
            strokeOpacity="0.6"
          />
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + plotHeight}
            stroke="#DDD5C7"
            strokeWidth="2"
            strokeOpacity="0.6"
          />

          <text
            x={margin.left + plotWidth / 2}
            y={margin.top + plotHeight + 42}
            fill="#DDD5C7"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            Substrate Conversion X<tspan dy="3" fontSize="9">S</tspan><tspan dy="-3"> = (S</tspan><tspan dy="3" fontSize="9">0</tspan><tspan dy="-3"> − S) / S</tspan><tspan dy="3" fontSize="9">0</tspan>
          </text>

          <text
            transform={`rotate(-90 ${margin.left - 48} ${margin.top + plotHeight / 2})`}
            x={margin.left - 48}
            y={margin.top + plotHeight / 2}
            fill="#DDD5C7"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            Reciprocal Rate 1 / (−r<tspan dy="3" fontSize="9">S</tspan><tspan dy="-3">) [day · L / mg]</tspan>
          </text>
        </svg>
      </div>

      <div className="mt-4 p-3.5 rounded-xl bg-sumi border border-putty/20 text-xs text-putty leading-relaxed flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-terracotta/20 border border-terracotta/50 text-terracotta font-bold shrink-0">
          CRE Insight
        </div>
        <div>
          In classic chemical engineering with 1<sup>st</sup>-order reactions, PFR requires{' '}
          <span className="text-ochre font-semibold">3.91× less volume</span> than CSTR at 90% conversion. However, for industrial textile effluent (
          <span className="text-linen font-mono font-semibold">
            S<sub>0</sub> = 750 mg/L &gt;&gt; K<sub>S</sub> = 65 mg/L
          </span>
          ), the Monod reaction operates near its asymptotic maximum rate{' '}
          <span className="font-mono text-celadon">
            (−r<sub>S</sub> ≈ −r<sub>S,max</sub>)
          </span>{' '}
          across 85% of the conversion range. Therefore, the Levenspiel curve remains flat, collapsing the volume ratio to{' '}
          <span className="text-celadon font-bold font-mono">{volumeRatio.toFixed(2)}×</span> (near parity)!
        </div>
      </div>
    </div>
  );
}
