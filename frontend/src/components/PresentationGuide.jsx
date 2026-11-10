import React, { useState } from 'react';

const SLIDES = [
  {
    step: 1,
    title: "1. Problem Formulation & Textile Effluent Chemistry",
    tagline: "Industrial Wastewater Context & Course Mandate",
    description: (
      <>
        Bangladesh is the world&apos;s 2<sup>nd</sup> largest textile apparel exporter. Textile wet processing discharges effluent loaded with refractory azo dyes and high biochemical oxygen demand (750 mg bCOD/L). The course requires applying Fogler&apos;s chemical reaction engineering principles to compare CSTR and PFR designs with dual Monod and oxygen mass transfer.
      </>
    ),
    keyPoints: [
      <>Target: 90% bCOD removal (from <i>S</i><sub>0</sub> = 750 mg/L down to <i>S</i><sub>e</sub> ≤ 75 mg/L).</>,
      <>Wastewater Flow Rate (<i>Q</i><sub>0</sub>): 1,000 m<sup>3</sup>/day (typical medium-scale dyeing unit).</>,
      <>Biological sludge age (SRT <i>θ</i><sub>c</sub>): 10 days.</>
    ],
    preset: { Q: 1000, S0: 750, Se: 75, theta_c: 10, tab: '3d' }
  },
  {
    step: 2,
    title: "2. Dual-Limitation Monod Biological Kinetics",
    tagline: "Biomass Growth & Oxygen Coupling",
    description: (
      <>
        Unlike simple single-reactant kinetics, aerobic biodegradation is limited simultaneously by carbon substrate and dissolved oxygen:{' '}
        <span className="font-mono text-ochre font-semibold">
          −r<sub>S</sub> = (μ<sub>max</sub> / Y) · [S / (K<sub>S</sub> + S)] · [DO / (K<sub>O</sub> + DO)] · X<sub>b</sub>
        </span>
        . Calibrated kinetic values:{' '}
        <span className="font-mono text-linen">
          μ<sub>max</sub> = 3.2 d<sup>−1</sup>, K<sub>S</sub> = 65 mg/L, K<sub>O</sub> = 0.20 mg/L, Y = 0.45 g/g, b = 0.06 d<sup>−1</sup>, k<sub>L</sub>a = 120 d<sup>−1</sup>
        </span>
        .
      </>
    ),
    keyPoints: [
      <>Zero-order regime occurs when <i>S</i> &gt;&gt; <i>K</i><sub>S</sub> (reaction rate is independent of <i>S</i>).</>,
      <>First-order regime emerges only when <i>S</i> &lt;&lt; <i>K</i><sub>S</sub> (near the reactor effluent exit).</>,
      <>Aeration mass transfer <i>k</i><sub>L</sub><i>a</i> · (<i>DO</i><sub>sat</sub> − <i>DO</i>) must exceed the microbial oxygen uptake rate (OUR).</>
    ],
    preset: { Q: 1000, S0: 750, Se: 75, theta_c: 10, tab: 'levenspiel' }
  },
  {
    step: 3,
    title: "3. Levenspiel Sizing Equivalence (The Core CRE Phenomenon)",
    tagline: "Collapse of the Classic PFR Volume Advantage",
    description: (
      <>
        In textbook chemical reaction engineering with 1<sup>st</sup>-order kinetics, a PFR requires 3.91× less volume than a CSTR at 90% conversion. However, our digital twin reveals that for concentrated textile wastewater, the CSTR requires 489.7 m<sup>3</sup> and the PFR requires 494.8 m<sup>3</sup> — a volume ratio (<i>V</i><sub>CSTR</sub> / <i>V</i><sub>PFR</sub>) of 0.99× (near parity)!
      </>
    ),
    keyPoints: [
      <>Influent substrate (<i>S</i><sub>0</sub> = 750 mg/L) is 11.5× higher than the half-velocity constant <i>K</i><sub>S</sub> (65 mg/L).</>,
      <>The consumption rate remains pegged near its asymptotic maximum (−<i>r</i><sub>S,max</sub>) across ~85% of the reactor volume.</>,
      <>The Levenspiel curve 1/(−<i>r</i><sub>S</sub>) is flat; the CSTR operating rectangle equals the PFR integral area under the curve.</>
    ],
    preset: { Q: 1000, S0: 750, Se: 75, theta_c: 10, tab: 'levenspiel' }
  },
  {
    step: 4,
    title: "4. Spatial Hydrodynamics & Inlet DO Sag in PFR",
    tagline: "Severe localized hypoxia risk in tubular designs",
    description: (
      <>
        Integrating the 1D spatial PFR differential equations reveals that at the entrance (<i>z/L</i> = 0.02 – 0.15), rapid microbial substrate consumption causes an acute Dissolved Oxygen Sag, dropping <i>DO</i> to &lt; 0.6 mg/L despite vigorous uniform aeration. This localized hypoxia can inhibit metabolic activity and foster filamentous sludge bulking.
      </>
    ),
    keyPoints: [
      <>CSTR completely avoids the inlet DO sag through instantaneous spatial backmixing (uniform <i>DO</i> = 2.15 mg/L).</>,
      <>PFR requires a tapered aeration manifold with front-loaded diffuser density (<i>k</i><sub>L</sub><i>a</i>(<i>z</i>)) at the inlet zone.</>
    ],
    preset: { Q: 1000, S0: 750, Se: 75, theta_c: 10, tab: 'profiles' }
  },
  {
    step: 5,
    title: "5. Hydraulic Shock Load Buffering & Transient Startup",
    tagline: "Industrial operational resilience against dye spikes",
    description: (
      <>
        Industrial textile mills operate in batch dye cycles, frequently releasing toxic shock loads (e.g., <i>S</i><sub>0</sub> spiking from 750 to 1,500–2,200 mg/L). In a PFR, this concentrated plug travels unattenuated as a shock wave, causing acute Haldane substrate inhibition. In a CSTR, the entire mixed liquid volume (490 m<sup>3</sup>) acts as a damping buffer, instantaneously diluting the shock.
      </>
    ),
    keyPoints: [
      <>Dynamic CSTR startup reaches 95% steady-state performance within 12 days.</>,
      <>Active biomass (<i>X</i><sub>b</sub>) multiplies steadily from 200 mg/L seed to 3,877 mg VSS/L without washout.</>
    ],
    preset: { Q: 1000, S0: 1500, Se: 150, theta_c: 10, tab: 'transient' }
  },
  {
    step: 6,
    title: "6. Sustainability, Energy & Carbon Footprint",
    tagline: "Techno-Economic Life Cycle Assessment (LCA)",
    description: (
      <>
        Using Bangladesh industrial tariffs ($0.095/kWh) and national grid carbon intensity (0.615 kg CO<sub>2</sub>e/kWh), our sustainability evaluation proves that CSTR and PFR operational metrics are nearly identical: Specific energy is 0.445 vs. 0.447 kWh/m<sup>3</sup>; Operating cost is $0.0423 vs. $0.0425 per m<sup>3</sup>; Operational GHG emissions are 0.274 kg CO<sub>2</sub>e/m<sup>3</sup>.
      </>
    ),
    keyPoints: [
      <>Aeration blowers account for ~76% of total plant energy consumption (SAE = 1.8 kg O<sub>2</sub>/kWh).</>,
      <>Mechanical mixing consumes 14% (10 W/m<sup>3</sup>), and recycle pumping consumes 10%.</>,
      <>Total daily operational expenditure is ~$42.30/day for 1,000 m<sup>3</sup>/day of treated textile effluent.</>
    ],
    preset: { Q: 1000, S0: 750, Se: 75, theta_c: 10, tab: 'sustainability' }
  },
  {
    step: 7,
    title: "7. Definitive Engineering Recommendation",
    tagline: "Why CSTR with Cell Recycle is the Superior Industrial Choice",
    description: (
      <>
        Based on first-principles reactor sizing, hydrodynamics, and operational resilience: The CSTR provides identical volume (489.7 m<sup>3</sup> vs. 494.8 m<sup>3</sup>), identical energy consumption (0.445 kWh/m<sup>3</sup>), vastly superior upstream toxic shock dilution, uniform dissolved oxygen distribution without sag zones, and lower civil concrete cost. Therefore, CSTR with clarifier cell recycle (RAS) is the superior engineering choice for industrial textile wastewater treatment.
      </>
    ),
    keyPoints: [
      <>Recommendation: Single-stage or 2-stage CSTR cascade with fine-bubble EPDM diffused aeration.</>,
      <>Meets Bangladesh DoE ECR Schedule-10 standards (<i>S</i><sub>e</sub> ≤ 75 mg/L) with minimal filamentous bulking risk.</>,
      <>Full-stack Digital Twin ready for academic defense and industrial process design.</>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sumi/90 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-sumi border border-putty/25 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-putty/20 bg-sumi/95 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-terracotta/20 border border-terracotta/40 text-terracotta font-bold text-xs uppercase tracking-wider">
              Examiner Presentation Mode
            </span>
            <span className="text-putty/70 text-xs font-semibold">
              Slide {slide.step} of {SLIDES.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-sumi border border-putty/30 text-putty hover:text-linen flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <h2 className="text-xl font-bold text-linen leading-tight">
              {slide.title}
            </h2>
            <p className="text-xs font-semibold text-ochre uppercase tracking-wide mt-1">
              {slide.tagline}
            </p>
          </div>

          <p className="text-sm text-putty leading-relaxed">
            {slide.description}
          </p>

          <div className="p-4 rounded-xl bg-sumi/95 border border-putty/20 space-y-2">
            <h4 className="text-xs font-bold text-putty/70 uppercase tracking-wider">
              Key Academic Takeaways for Examiners:
            </h4>
            <ul className="space-y-1.5">
              {slide.keyPoints.map((point, idx) => (
                <li key={idx} className="text-xs text-putty flex items-start gap-2">
                  <span className="text-celadon font-bold">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-putty/20 bg-sumi/95 flex items-center justify-between">
          <button
            onClick={() => onApplyPreset(slide.preset)}
            className="px-4 py-2 rounded-xl bg-workwear/50 hover:bg-workwear border border-workwear text-linen text-xs font-semibold transition flex items-center gap-2"
          >
            <span>⚡ Apply This Slide&apos;s Scenario to Twin</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentSlideIdx === 0}
              className="px-4 py-2 rounded-xl bg-sumi hover:bg-sumi/80 border border-putty/30 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-putty hover:text-linen transition"
            >
              Previous Slide
            </button>
            <button
              onClick={handleNext}
              disabled={currentSlideIdx === SLIDES.length - 1}
              className="px-4 py-2 rounded-xl bg-terracotta hover:bg-terracotta/90 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-linen transition shadow-lg shadow-terracotta/25"
            >
              Next Slide →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
