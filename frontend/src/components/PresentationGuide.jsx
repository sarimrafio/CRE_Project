import React, { useState } from 'react';

const SLIDES = [
  {
    step: 1,
    title: "1. Problem Formulation & Textile Effluent Chemistry",
    tagline: "Industrial Wastewater Context & Course Mandate",
    description: "Bangladesh is the world's 2nd largest textile apparel exporter. Textile wet processing discharges effluent loaded with refractory azo dyes and high biochemical oxygen demand (750 mg bCOD/L). The course requires applying Fogler's chemical reaction engineering principles to compare CSTR and PFR designs with dual Monod and oxygen mass transfer.",
    keyPoints: [
      "Target: 90% bCOD removal (from 750 mg/L down to ≤ 75 mg/L).",
      "Wastewater Flow Rate: 1,000 m³/day (typical medium-scale dyeing unit).",
      "Biological sludge age (SRT θ_c): 10 days."
    ],
    preset: { Q: 1000, S0: 750, Se: 75, theta_c: 10, tab: '3d' }
  },
  {
    step: 2,
    title: "2. Dual-Limitation Monod Biological Kinetics",
    tagline: "Biomass Growth & Oxygen Coupling",
    description: "Unlike simple single-reactant kinetics, aerobic biodegradation is limited simultaneously by carbon substrate and dissolved oxygen: -r_S = (μ_max / Y) * [S / (K_S + S)] * [DO / (K_O + DO)] * X_b. Calibrated kinetic values: μ_max = 3.2 1/d, K_S = 65 mg/L, K_O = 0.20 mg/L, Y = 0.45 g/g, b = 0.06 1/d, k_La = 120 1/d.",
    keyPoints: [
      "Zero-order regime occurs when S >> K_S (rate independent of S).",
      "First-order regime emerges only when S << K_S (near effluent exit).",
      "Aeration mass transfer k_La * (DO_sat - DO) must exceed microbial oxygen uptake rate (OUR)."
    ],
    preset: { Q: 1000, S0: 750, Se: 75, theta_c: 10, tab: 'levenspiel' }
  },
  {
    step: 3,
    title: "3. Levenspiel Sizing Equivalence (The Core CRE Phenomenon)",
    tagline: "Collapse of the Classic PFR Volume Advantage",
    description: "In textbook chemical reaction engineering with 1st-order kinetics, a PFR requires 3.91× less volume than a CSTR at 90% conversion. However, our digital twin reveals that for textile wastewater, the CSTR requires 489.7 m³ and the PFR requires 494.8 m³ — a volume ratio of 0.99× (parity)!",
    keyPoints: [
      "Influent substrate (750 mg/L) is 11.5× higher than K_S (65 mg/L).",
      "The rate remains pegged at maximum (-r_S,max) across ~85% of reactor volume.",
      "The Levenspiel curve 1/(-r_S) is flat; the CSTR operating rectangle equals the PFR integral area under the curve."
    ],
    preset: { Q: 1000, S0: 750, Se: 75, theta_c: 10, tab: 'levenspiel' }
  },
  {
    step: 4,
    title: "4. Spatial Hydrodynamics & Inlet DO Sag in PFR",
    tagline: "Severe localized hypoxia risk in tubular designs",
    description: "Integrating the 1D spatial PFR differential equations reveals that at the entrance (z/L = 0.02 - 0.15), rapid microbial substrate consumption causes an acute Dissolved Oxygen Sag, dropping DO to < 0.6 mg/L despite vigorous uniform aeration. This localized hypoxia can inhibit metabolic activity and foster filamentous bulking.",
    keyPoints: [
      "CSTR completely avoids DO sag through instantaneous spatial backmixing (uniform DO = 2.15 mg/L).",
      "PFR would require expensive tapered aeration manifolds with 3× higher blower capacity at the front end."
    ],
    preset: { Q: 1000, S0: 750, Se: 75, theta_c: 10, tab: 'profiles' }
  },
  {
    step: 5,
    title: "5. Hydraulic Shock Load Buffering & Transient Startup",
    tagline: "Industrial operational resilience against dye spikes",
    description: "Industrial textile mills operate in batch dye cycles, frequently releasing toxic shock loads (e.g., S_0 spiking from 750 to 1,500 mg/L). In a PFR, this toxic plug travels unattenuated as a shock wave, causing immediate toxic biomass inhibition. In a CSTR, the entire tank volume (490 m³) acts as a giant damping buffer, instantaneously diluting the shock by ~12-fold.",
    keyPoints: [
      "Dynamic CSTR startup reaches 95% steady-state performance within 12 days.",
      "Biomass steadily multiplies from 200 mg/L seed to 3,877 mg/L with zero operational collapse."
    ],
    preset: { Q: 1000, S0: 1500, Se: 150, theta_c: 10, tab: 'transient' }
  },
  {
    step: 6,
    title: "6. Sustainability, Energy & Carbon Footprint",
    tagline: "Techno-Economic Life Cycle Assessment (LCA)",
    description: "Using Bangladesh industrial tariffs ($0.095/kWh) and national grid carbon intensity (0.615 kg CO2e/kWh), our sustainability evaluation proves that CSTR and PFR operational metrics are nearly identical: Specific energy is 0.445 vs 0.447 kWh/m³; Operating cost is $0.0423 vs $0.0425 per m³; Operational GHG emissions are 0.274 kg CO2e/m³.",
    keyPoints: [
      "Aeration blowers account for ~76% of total plant energy consumption.",
      "Mechanical mixing consumes 14%, and pumping consumes 10%.",
      "Total daily operational expenditure is only ~$42.30/day for 1,000,000 L of purified wastewater."
    ],
    preset: { Q: 1000, S0: 750, Se: 75, theta_c: 10, tab: 'sustainability' }
  },
  {
    step: 7,
    title: "7. Definitive Engineering Recommendation",
    tagline: "Why CSTR with Cell Recycle is the Superior Industrial Choice",
    description: "Based on first-principles reactor sizing, hydrodynamics, and operational resilience: The CSTR provides identical volume (489.7 m³ vs 494.8 m³), identical energy consumption (0.445 kWh/m³), vastly superior upstream toxic shock dilution, uniform dissolved oxygen distribution without sag zones, and lower construction complexity. Therefore, CSTR with clarifier cell recycle is the unequivocally superior engineering choice for industrial textile wastewater treatment.",
    keyPoints: [
      "Recommendation: Single-stage or 2-stage CSTR with fine-bubble diffused aeration.",
      "Meets all Department of Environment (DoE) standards with minimal risk of filamentous bulking.",
      "Project deliverable ready for academic examination and industrial design deployment."
    ],
    preset: { Q: 1000, S0: 750, Se: 75, theta_c: 10, tab: '3d' }
  }
];

export default function PresentationGuide({
  isOpen,
  onClose,
  onApplyPreset
}) {
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  if (!isOpen) return null;

  const slide = SLIDES[currentSlideIdx];

  const handleNext = () => {
    if (currentSlideIdx < SLIDES.length - 1) {
      const nextIdx = currentSlideIdx + 1;
      setCurrentSlideIdx(nextIdx);
      if (onApplyPreset) onApplyPreset(SLIDES[nextIdx].preset);
    }
  };

  const handlePrev = () => {
    if (currentSlideIdx > 0) {
      const prevIdx = currentSlideIdx - 1;
      setCurrentSlideIdx(prevIdx);
      if (onApplyPreset) onApplyPreset(SLIDES[prevIdx].preset);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-blue-500/20 border border-blue-400/40 text-blue-300 font-bold text-xs uppercase tracking-wider">
              Examiner Presentation Mode
            </span>
            <span className="text-slate-400 text-xs font-semibold">
              Slide {slide.step} of {SLIDES.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">
              {slide.title}
            </h2>
            <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wide mt-1">
              {slide.tagline}
            </p>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {slide.description}
          </p>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Key Academic Takeaways for Examiners:
            </h4>
            <ul className="space-y-1.5">
              {slide.keyPoints.map((point, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={() => onApplyPreset(slide.preset)}
            className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold transition flex items-center gap-2"
          >
            <span>⚡ Apply This Slide's Scenario to Twin</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentSlideIdx === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-200 transition"
            >
              Previous Slide
            </button>
            <button
              onClick={handleNext}
              disabled={currentSlideIdx === SLIDES.length - 1}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition shadow-lg shadow-blue-500/20"
            >
              Next Slide →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
