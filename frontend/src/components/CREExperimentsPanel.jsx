import React, { useState, useMemo } from 'react';
import {
  computeRTDAndTanksInSeries,
  simulateToxicShockEvent,
  computeBioFlocMicroProfile
} from '../kineticsEngine';

export default function CREExperimentsPanel({
  S0 = 750,
  cstrResult,
  kinetics
}) {
  const [nTanks, setNTanks] = useState(4);
  const [peclet, setPeclet] = useState(30);
  const [shockPeak, setShockPeak] = useState(2200);

  const rtdData = useMemo(() => {
    return computeRTDAndTanksInSeries(
      nTanks,
      peclet,
      S0,
      cstrResult?.tau_days || 0.49,
      cstrResult?.Xb || 3877,
      kinetics
    );
  }, [nTanks, peclet, S0, cstrResult, kinetics]);

  const shockData = useMemo(() => {
    return simulateToxicShockEvent(
      S0,
      shockPeak,
      cstrResult?.tau_days || 0.49,
      cstrResult?.Xb || 3877,
      kinetics
    );
  }, [S0, shockPeak, cstrResult, kinetics]);

  const flocProfile = useMemo(() => {
    return computeBioFlocMicroProfile(cstrResult?.Se || 75, cstrResult?.DO || 2.15, 60);
  }, [cstrResult]);

  // SVG dimensions
  const w = 560;
  const h = 250;
  const pad = { top: 22, right: 25, bottom: 38, left: 48 };
  const pw = w - pad.left - pad.right;
  const ph = h - pad.top - pad.bottom;

  // 1. RTD Paths
  const maxE = Math.max(
    1.5,
    ...rtdData.rtdCurve.map((d) => Math.max(d.E_cstr, d.E_nSeries, d.E_pfr_disp))
  );
  const rtdScaleX = (theta) => pad.left + (theta / 2.5) * pw;
  const rtdScaleY = (eVal) => pad.top + ph - (eVal / maxE) * ph;

  const pathEcstr = rtdData.rtdCurve.reduce(
    (acc, d, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${rtdScaleX(d.theta)} ${rtdScaleY(d.E_cstr)}`,
    ''
  );
  const pathEnSeries = rtdData.rtdCurve.reduce(
    (acc, d, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${rtdScaleX(d.theta)} ${rtdScaleY(d.E_nSeries)}`,
    ''
  );
  const pathEpfr = rtdData.rtdCurve.reduce(
    (acc, d, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${rtdScaleX(d.theta)} ${rtdScaleY(d.E_pfr_disp)}`,
    ''
  );

  // 2. Shock Load Paths
  const maxShockY = Math.max(300, ...shockData.pfrEffluent, ...shockData.cstrEffluent) * 1.1;
  const shockScaleX = (hr) => pad.left + (hr / 24.0) * pw;
  const shockScaleY = (sVal) => pad.top + ph - (sVal / maxShockY) * ph;

  const pathShockCstr = shockData.hours.reduce(
    (acc, hr, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${shockScaleX(hr)} ${shockScaleY(shockData.cstrEffluent[i])}`,
    ''
  );
  const pathShockPfr = shockData.hours.reduce(
    (acc, hr, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${shockScaleX(hr)} ${shockScaleY(shockData.pfrEffluent[i])}`,
    ''
  );

  return (
    <div className="space-y-5">
      {/* =====================================================================
          ROW 1: FOGLER RTD E(theta) & TANKS-IN-SERIES + TOXIC SHOCK CANNON
      ===================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Card A: Residence Time Distribution E(theta) & N-CSTRs in Series */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-white">
                1. Fogler Residence Time Distribution E(θ) & Non-Ideal Flow
              </h3>
              <p className="text-[11px] text-slate-400">
                Compare 1-CSTR vs. {nTanks}-Staged CSTRs-in-Series vs. Axial Dispersion PFR (Pe = {peclet})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-300">
                <span>Tanks-in-Series (N):</span>
                <span className="font-mono font-bold text-amber-300">{nTanks} Stages</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={nTanks}
                onChange={(e) => setNTanks(Number(e.target.value))}
                className="w-full accent-amber-400 mt-1"
              />
            </div>
            <div>
              <div className="flex justify-between text-slate-300">
                <span>PFR Peclet Number (Pe):</span>
                <span className="font-mono font-bold text-cyan-300">Pe = {peclet}</span>
              </div>
              <input
                type="range"
                min="4"
                max="80"
                step="2"
                value={peclet}
                onChange={(e) => setPeclet(Number(e.target.value))}
                className="w-full accent-cyan-400 mt-1"
              />
            </div>
          </div>

          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible">
            {[0, 0.5, 1.0, 1.5, 2.0, 2.5].map((t) => (
              <g key={t}>
                <line x1={rtdScaleX(t)} y1={pad.top} x2={rtdScaleX(t)} y2={pad.top + ph} stroke="#1e293b" strokeDasharray="3 3" />
                <text x={rtdScaleX(t)} y={pad.top + ph + 16} fill="#64748b" fontSize="10" textAnchor="middle">
                  θ={t.toFixed(1)}
                </text>
              </g>
            ))}
            <path d={pathEcstr} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
            <path d={pathEnSeries} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
            <path d={pathEpfr} fill="none" stroke="#10b981" strokeWidth="2.5" />
            <line x1={pad.left} y1={pad.top + ph} x2={pad.left + pw} y2={pad.top + ph} stroke="#475569" strokeWidth="1.5" />
            <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + ph} stroke="#475569" strokeWidth="1.5" />
            <text x={pad.left + pw / 2} y={pad.top + ph + 32} fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle">
              Dimensionless Residence Time θ = t / τ
            </text>
          </svg>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-800">
            <span className="text-blue-400 font-semibold">● Ideal CSTR: E(θ) = e⁻ᶿ</span>
            <span className="text-amber-400 font-semibold">● {nTanks}-Tanks-in-Series</span>
            <span className="text-emerald-400 font-semibold">● PFR Dispersion (Pe={peclet})</span>
          </div>
        </div>

        {/* Card B: Toxic Dye Shock-Load Cannon ("Factory Vat Dump") */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-white">
                2. Toxic Azo Dye Shock-Load Buffering (2-Hour Vat Dump)
              </h3>
              <p className="text-[11px] text-slate-400">
                CSTR instantaneous dilution buffer vs. PFR unattenuated toxic plug breakthrough
              </p>
            </div>
          </div>

          <div className="text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Shock Pulse Influent Peak (t = 2h – 4h):</span>
              <span className="font-mono font-bold text-fuchsia-300">{shockPeak} mg bCOD/L</span>
            </div>
            <input
              type="range"
              min="1200"
              max="3500"
              step="100"
              value={shockPeak}
              onChange={(e) => setShockPeak(Number(e.target.value))}
              className="w-full accent-fuchsia-500 mt-1"
            />
          </div>

          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible">
            {[0, 4, 8, 12, 16, 20, 24].map((hr) => (
              <g key={hr}>
                <line x1={shockScaleX(hr)} y1={pad.top} x2={shockScaleX(hr)} y2={pad.top + ph} stroke="#1e293b" strokeDasharray="3 3" />
                <text x={shockScaleX(hr)} y={pad.top + ph + 16} fill="#64748b" fontSize="10" textAnchor="middle">
                  {hr}h
                </text>
              </g>
            ))}
            {/* DoE 75 mg/L limit line */}
            <line x1={pad.left} y1={shockScaleY(75)} x2={pad.left + pw} y2={shockScaleY(75)} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth="1.5" />
            <text x={pad.left + pw - 5} y={shockScaleY(75) - 5} fill="#f59e0b" fontSize="9" textAnchor="end">
              DoE Limit (75 mg/L)
            </text>

            <path d={pathShockCstr} fill="none" stroke="#38bdf8" strokeWidth="3" />
            <path d={pathShockPfr} fill="none" stroke="#f43f5e" strokeWidth="3" />
            <line x1={pad.left} y1={pad.top + ph} x2={pad.left + pw} y2={pad.top + ph} stroke="#475569" strokeWidth="1.5" />
            <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + ph} stroke="#475569" strokeWidth="1.5" />
            <text x={pad.left + pw / 2} y={pad.top + ph + 32} fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle">
              Time Elapsed After Upstream Factory Dye Dump [Hours]
            </text>
          </svg>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-800">
            <span className="text-sky-400 font-semibold">
              ● CSTR Exit Peak: {Math.max(...shockData.cstrEffluent).toFixed(0)} mg/L (Buffered)
            </span>
            <span className="text-rose-400 font-semibold">
              ● PFR Exit Spike: {Math.max(...shockData.pfrEffluent).toFixed(0)} mg/L (Severe Violation!)
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          ROW 2: STAGED N-CSTR CASCADE TABLE & SINGLE BIO-FLOC REACTION-DIFFUSION
      ===================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Stage-by-Stage N-CSTR Cascade Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white">
            3. Compartmentalized {nTanks}-Stage CSTR Cascade Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-1.5 px-2">Stage #</th>
                  <th className="py-1.5 px-2">Stage Volume</th>
                  <th className="py-1.5 px-2">Exit Substrate S_n</th>
                  <th className="py-1.5 px-2">Cumulative Removal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {rtdData.stageProfile.map((st) => (
                  <tr key={st.stage}>
                    <td className="py-1.5 px-2 text-amber-300 font-bold">Tank {st.stage}</td>
                    <td className="py-1.5 px-2">{((cstrResult?.V || 490) / nTanks).toFixed(1)} m³</td>
                    <td className="py-1.5 px-2 text-purple-300">{st.S_out} mg/L</td>
                    <td className="py-1.5 px-2 text-emerald-300">{st.conversion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Single Activated Sludge Bio-Floc Reaction-Diffusion Summary */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white">
            4. Intra-Floc Reaction-Diffusion & Simultaneous Azo Cleavage (R = 60 µm)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Inside each suspended activated sludge floc, dissolved oxygen diffuses inward with Thiele modulus{' '}
            <span className="font-mono font-bold text-cyan-300">Φ = {flocProfile.thieleO2}</span> and internal effectiveness factor{' '}
            <span className="font-mono font-bold text-emerald-300">η = {flocProfile.effectivenessFactor}</span>. The outer aerobic shell oxidizes bCOD, while oxygen depletion inside the core (<span className="font-mono text-purple-300">{flocProfile.anoxicCoreFraction}% volume</span>) enables simultaneous reductive cleavage of <span className="font-mono">-N=N-</span> azo chromophores.
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400 font-sans text-[10px]">Surface DO (r=60µm)</div>
              <div className="text-cyan-300 font-bold text-sm">{flocProfile.radialPoints[flocProfile.radialPoints.length - 1]?.DO} mg/L</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400 font-sans text-[10px]">Core DO (r=0µm)</div>
              <div className="text-rose-400 font-bold text-sm">{flocProfile.radialPoints[0]?.DO} mg/L</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400 font-sans text-[10px]">Core Azo Reductase</div>
              <div className="text-purple-300 font-bold text-sm">{flocProfile.radialPoints[0]?.anoxicAzoCleavage}% Max</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
