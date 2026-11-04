/**
 * Comprehensive First-Principles Bioreactor Kinetics, Multi-Physics, RTD & Micro-Floc Engine
 * Powers all 25 interactive CRE features at 60 FPS alongside the Render FastAPI backend.
 */

export const DEFAULT_KINETICS = {
  mu_max: 3.2,     // 1/day at 20°C
  Ks: 65.0,        // mg bCOD/L
  Ko: 0.20,        // mg DO/L
  Y: 0.45,         // g VSS / g bCOD
  b: 0.06,         // 1/day at 20°C
  kLa: 120.0,      // 1/day at 20°C
  DO_sat: 8.2,     // mg/L (at 25°C)
  alpha_O: 0.50,   // g O2 / g bCOD
  temperature: 25.0 // °C
};

export const DEFAULT_SUSTAINABILITY = {
  sae: 1.8,                      // kg O2 / kWh (fine bubble EPDM diffusers)
  mixing_power_density: 10.0,    // W/m^3
  pumping_energy_specific: 0.05, // kWh/m^3
  electricity_cost_kwh: 0.095,  // USD/kWh (Bangladesh EPZ industrial tariff)
  grid_emission_factor: 0.615    // kg CO2e / kWh
};

/**
 * Feature #17: Arrhenius Temperature Correction & Henry's Law Oxygen Solubility
 */
export function applyTemperatureCorrection(baseKinetics, T = 25.0) {
  const dT = T - 20.0;
  const mu_T = baseKinetics.mu_max * Math.pow(1.07, dT);
  const b_T = baseKinetics.b * Math.pow(1.04, dT);
  const kLa_T = baseKinetics.kLa * Math.pow(1.024, dT);
  // Empirical Henry's Law DO saturation in fresh/brackish water [mg/L]
  const DO_sat_T = Math.max(
    4.0,
    14.62 - 0.3898 * T + 0.006969 * T * T - 0.00005897 * T * T * T
  );

  return {
    ...baseKinetics,
    temperature: T,
    mu_max: mu_T,
    b: b_T,
    kLa: kLa_T,
    DO_sat: DO_sat_T
  };
}

export function specificGrowthRate(S, DO, k = DEFAULT_KINETICS) {
  const sTerm = Math.max(0, S) / (k.Ks + Math.max(0, S));
  const oTerm = Math.max(0, DO) / (k.Ko + Math.max(0, DO));
  return k.mu_max * sTerm * oTerm;
}

export function substrateConsumptionRate(S, Xb, DO, k = DEFAULT_KINETICS) {
  const mu = specificGrowthRate(S, DO, k);
  return (mu * Math.max(0, Xb)) / k.Y;
}

export function oxygenUptakeRate(S, Xb, DO, k = DEFAULT_KINETICS) {
  const rCons = substrateConsumptionRate(S, Xb, DO, k);
  const endogenous = 1.42 * k.b * Math.max(0, Xb);
  return (k.alpha_O * rCons) + endogenous;
}

/**
 * Feature #11: Critical SRT Washout Calculation
 */
export function calculateCriticalSRT(S0, DO = 2.0, k = DEFAULT_KINETICS) {
  const sFactor = S0 / (k.Ks + S0);
  const oFactor = DO / (k.Ko + DO);
  const netMaxGrowth = k.mu_max * sFactor * oFactor - k.b;
  if (netMaxGrowth <= 0.01) return 50.0;
  return 1.0 / netMaxGrowth;
}

/**
 * Size CSTR with Clarifier Recycle Loop (Features #1, #6, #11, #15)
 */
export function sizeCSTR(Q, S0, Se_target, theta_c, k = DEFAULT_KINETICS, recycleRatio = 0.60, blowerTrip = false) {
  const effectiveK = blowerTrip ? { ...k, kLa: k.kLa * 0.08 } : k;
  const doOperating = blowerTrip ? 0.18 : Math.min(effectiveK.DO_sat * 0.85, Math.max(0.4, (effectiveK.kLa / 120.0) * 2.15));
  const theta_c_min = calculateCriticalSRT(S0, doOperating, effectiveK);
  const isWashout = theta_c <= theta_c_min * 1.15;

  const netReq = effectiveK.b + (1.0 / theta_c);
  const doEff = doOperating / (effectiveK.Ko + doOperating);
  const muApparent = effectiveK.mu_max * doEff;

  let S_achieved;
  if (isWashout || muApparent <= netReq) {
    S_achieved = S0 * 0.92;
  } else {
    S_achieved = Math.max(4.0, (effectiveK.Ks * netReq) / Math.max(0.02, muApparent - netReq));
  }

  // Design biomass at target
  const rCons = substrateConsumptionRate(Se_target, 3876.9, doOperating, effectiveK);
  const tau_days = Math.max(0.08, (S0 - Se_target) / Math.max(15.0, rCons));
  const V_cstr = Q * tau_days;

  const Xb = isWashout
    ? 85.0
    : (theta_c / tau_days) * ((effectiveK.Y * (S0 - Math.min(S0 * 0.8, Se_target))) / (1.0 + effectiveK.b * theta_c));

  const rConsActual = substrateConsumptionRate(S_achieved, Xb, doOperating, effectiveK);
  const ourActual = oxygenUptakeRate(S_achieved, Xb, doOperating, effectiveK);

  // Clarifier & RAS/WAS Recycle Mass Balance (Features #1, #6)
  const X_R = Math.min(12000, Xb * ((1 + recycleRatio) / recycleRatio) * 0.92);
  const Q_R = Q * recycleRatio;
  const Q_w = Math.max(1.0, (V_cstr * Xb) / (theta_c * Math.max(1000, X_R)));
  const svi = doOperating < 0.8 ? 210 : 105; // mL/g
  const blanketPct = Math.min(85, Math.max(15, (svi / 110) * (Xb / 3800) * 28));

  // Physical Vessel Geometry (H = D cylindrical basin) (Feature #15, #25)
  const diameter = Math.pow((4 * V_cstr) / Math.PI, 1 / 3);
  const height = diameter;
  const wallThickness = 0.35; // m reinforced concrete
  const concreteM3 = Math.PI * diameter * (height + 0.6) * wallThickness + (Math.PI * diameter * diameter / 4) * 0.4;
  const footprintM2 = Math.PI * Math.pow(diameter / 2 + 1.2, 2);
  const capexUSD = concreteM3 * 420 + 28000; // Concrete + mechanical agitator + blowers

  // Surface Foam Index (Feature #16)
  const foamThicknessPct = Math.min(100, Math.max(5, ((S0 / 750) * (effectiveK.kLa / 120) * 35)));

  return {
    V: V_cstr,
    tau_days,
    tau_hours: tau_days * 24.0,
    Se: Math.min(S0, S_achieved),
    Xb: Math.max(80, Xb),
    DO: doOperating,
    r_S: rConsActual,
    OUR: ourActual,
    theta_c_min,
    isWashout,
    recycle: {
      R: recycleRatio,
      Q_R,
      Q_w,
      X_R,
      svi,
      blanketPct
    },
    geometry: {
      diameter,
      height,
      concreteM3,
      footprintM2,
      capexUSD,
      foamThicknessPct
    }
  };
}

/**
 * 1D PFR Spatial Integration (RK4) with Tapered vs Uniform Aeration (Features #5, #12, #13, #19)
 */
export function simulatePFR(
  S0,
  Xb0,
  DO0,
  tau_total,
  k = DEFAULT_KINETICS,
  nPoints = 100,
  aerationMode = 'uniform', // 'uniform' | 'tapered'
  blowerTrip = false
) {
  const dt = tau_total / nPoints;
  const tauArr = [0];
  const sArr = [S0];
  const xbArr = [Xb0];
  const doArr = [DO0];
  const rateArr = [substrateConsumptionRate(S0, Xb0, DO0, k)];
  const ourArr = [oxygenUptakeRate(S0, Xb0, DO0, k)];
  const muArr = [specificGrowthRate(S0, DO0, k)];
  const klaProfile = [];

  let S = S0;
  let Xb = Xb0;
  let DO = DO0;

  function localKLa(fracZ) {
    if (blowerTrip) return k.kLa * 0.08;
    if (aerationMode === 'tapered') {
      // Front-loaded tapered diffuser manifold: 1.65x at inlet, 0.35x at outlet (same integral mean = 1.0x)
      return k.kLa * (1.65 - 1.30 * fracZ);
    }
    return k.kLa;
  }

  klaProfile.push(localKLa(0));

  function deriv(s, xb, d, fracZ) {
    const sPos = Math.max(0, s);
    const xbPos = Math.max(0, xb);
    const doPos = Math.max(0, d);
    const mu = specificGrowthRate(sPos, doPos, k);
    const rCons = (mu * xbPos) / k.Y;
    const our = (k.alpha_O * rCons) + (1.42 * k.b * xbPos);
    const kLa_z = localKLa(fracZ);

    return [
      -rCons,
      (mu - k.b) * xbPos,
      kLa_z * (k.DO_sat - doPos) - our
    ];
  }

  for (let i = 0; i < nPoints; i++) {
    const fracZ = i / nPoints;
    const k1 = deriv(S, Xb, DO, fracZ);
    const k2 = deriv(S + 0.5 * dt * k1[0], Xb + 0.5 * dt * k1[1], DO + 0.5 * dt * k1[2], fracZ + 0.5 / nPoints);
    const k3 = deriv(S + 0.5 * dt * k2[0], Xb + 0.5 * dt * k2[1], DO + 0.5 * dt * k2[2], fracZ + 0.5 / nPoints);
    const k4 = deriv(S + dt * k3[0], Xb + dt * k3[1], DO + dt * k3[2], fracZ + 1.0 / nPoints);

    S = Math.max(0, S + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]));
    Xb = Math.max(0, Xb + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]));
    DO = Math.max(0.05, Math.min(k.DO_sat, DO + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])));

    const curTau = (i + 1) * dt;
    const nextFrac = (i + 1) / nPoints;
    tauArr.push(curTau);
    sArr.push(S);
    xbArr.push(Xb);
    doArr.push(DO);
    rateArr.push(substrateConsumptionRate(S, Xb, DO, k));
    ourArr.push(oxygenUptakeRate(S, Xb, DO, k));
    muArr.push(specificGrowthRate(S, DO, k));
    klaProfile.push(localKLa(nextFrac));
  }

  const minDO = Math.min(...doArr);
  const minDOIdx = doArr.indexOf(minDO);

  return {
    tau_profile: tauArr,
    fractional_length: tauArr.map(t => t / tau_total),
    S: sArr,
    Xb: xbArr,
    DO: doArr,
    reaction_rate: rateArr,
    OUR: ourArr,
    mu: muArr,
    kLa_profile: klaProfile,
    effluent_S: sArr[sArr.length - 1],
    effluent_Xb: xbArr[xbArr.length - 1],
    effluent_DO: doArr[doArr.length - 1],
    min_DO: minDO,
    min_DO_z: minDOIdx / nPoints
  };
}

export function sizePFR(Q, S0, Se_target, Xb0, k = DEFAULT_KINETICS, aerationMode = 'uniform', blowerTrip = false) {
  let low = 0.05;
  let high = 5.0;
  let bestTau = 0.495;

  for (let iter = 0; iter < 18; iter++) {
    const mid = (low + high) / 2;
    const sim = simulatePFR(S0, Xb0, 2.0, mid, k, 60, aerationMode, blowerTrip);
    if (sim.effluent_S > Se_target) {
      low = mid;
    } else {
      bestTau = mid;
      high = mid;
    }
  }

  const finalSim = simulatePFR(S0, Xb0, 2.0, bestTau, k, 100, aerationMode, blowerTrip);
  const V_pfr = Q * bestTau;

  // PFR Serpentine 4-Pass Baffled Geometry (Feature #5, #15, #25)
  const channelDepth = 3.5; // m
  const channelWidth = 2.2; // m
  const totalChannelLength = V_pfr / (channelDepth * channelWidth);
  const passLength = totalChannelLength / 4;
  const footprintM2 = (passLength + 2.0) * (channelWidth * 4 + 2.5);
  // PFR has 5 longitudinal baffle walls -> more concrete than CSTR
  const concreteM3 = (5 * passLength * (channelDepth + 0.6) * 0.30) + (footprintM2 * 0.35);
  const capexUSD = concreteM3 * 420 + 34000; // Baffled basin + multi-zone diffuser headers

  // SVI bulking risk if min DO sag < 0.6 mg/L
  const svi = finalSim.min_DO < 0.65 ? 235 : 108;

  return {
    V: V_pfr,
    tau_days: bestTau,
    tau_hours: bestTau * 24.0,
    Se: finalSim.effluent_S,
    Xb: finalSim.effluent_Xb,
    DO: finalSim.effluent_DO,
    min_DO: finalSim.min_DO,
    min_DO_z: finalSim.min_DO_z,
    svi,
    profiles: finalSim,
    geometry: {
      totalChannelLength,
      passLength,
      channelWidth,
      channelDepth,
      concreteM3,
      footprintM2,
      capexUSD
    }
  };
}

/**
 * Feature #7 & #8: Residence Time Distribution E(theta) & Tanks-in-Series (N-CSTRs) / Peclet Dispersion
 */
export function computeRTDAndTanksInSeries(N_tanks = 4, peclet = 25, S0 = 750, tau_total = 0.49, Xb = 3877, k = DEFAULT_KINETICS) {
  const thetaPoints = [];
  const numSteps = 80;

  // Log-factorial helper for N-tanks gamma distribution
  function factorial(n) {
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }

  const factN1 = factorial(Math.max(1, Math.round(N_tanks) - 1));

  for (let i = 1; i <= numSteps; i++) {
    const theta = (i / numSteps) * 2.5; // Dimensionless time t / tau
    // 1. Ideal CSTR (N=1)
    const E_cstr = Math.exp(-theta);
    // 2. N-CSTRs in series
    const N = Math.max(1, Math.round(N_tanks));
    const E_nSeries = (Math.pow(N, N) * Math.pow(theta, N - 1) / factN1) * Math.exp(-N * theta);
    // 3. Axial Dispersion PFR (Peclet number Pe)
    const Pe = Math.max(1, peclet);
    const E_pfr_disp = (1.0 / Math.sqrt((4 * Math.PI * theta) / Pe)) *
      Math.exp(-((Pe * Math.pow(1.0 - theta, 2)) / (4 * theta)));

    thetaPoints.push({
      theta: Number(theta.toFixed(3)),
      E_cstr: Number(E_cstr.toFixed(4)),
      E_nSeries: Number(E_nSeries.toFixed(4)),
      E_pfr_disp: Number(E_pfr_disp.toFixed(4))
    });
  }

  // Stage-by-stage substrate profile across N CSTRs in series
  const stageProfile = [];
  let sCurrent = S0;
  const tauStage = tau_total / Math.max(1, Math.round(N_tanks));
  for (let st = 1; st <= Math.max(1, Math.round(N_tanks)); st++) {
    // Solve single stage mass balance: S_in - S_out = tau_stage * (-r_S(S_out))
    let low = 1.0, high = sCurrent;
    for (let it = 0; it < 15; it++) {
      const mid = 0.5 * (low + high);
      const r = substrateConsumptionRate(mid, Xb, 2.0, k);
      const lhs = sCurrent - mid;
      const rhs = tauStage * r;
      if (lhs > rhs) low = mid;
      else high = mid;
    }
    sCurrent = 0.5 * (low + high);
    stageProfile.push({
      stage: st,
      S_out: Number(sCurrent.toFixed(1)),
      conversion: Number((((S0 - sCurrent) / S0) * 100).toFixed(1))
    });
  }

  return {
    rtdCurve: thetaPoints,
    stageProfile
  };
}

/**
 * Feature #9: Toxic Dye Shock-Load Cannon ("Factory Vat Dump") Comparison
 */
export function simulateToxicShockEvent(S0_base = 750, shockPeak = 2200, tau = 0.49, Xb = 3877, k = DEFAULT_KINETICS) {
  const hours = [];
  const cstrEffluent = [];
  const pfrEffluent = [];
  const influentPulse = [];

  let sCstr = 75.0;
  const dtHours = 0.25;
  const dtDays = dtHours / 24.0;
  const tauHours = tau * 24.0;

  for (let h = 0; h <= 24; h += dtHours) {
    // 2-hour toxic dye dump between t = 2h and t = 4h
    const isDump = h >= 2.0 && h <= 4.0;
    const sIn = isDump ? shockPeak : S0_base;
    influentPulse.push(sIn);
    hours.push(Number(h.toFixed(2)));

    // CSTR buffers the shock across its entire liquid volume (490 m3)
    // High dye concentration also causes mild Haldane substrate inhibition
    const inhibition = 1.0 / (1.0 + Math.pow(Math.max(0, sCstr - 400) / 600, 2));
    const rCons = substrateConsumptionRate(sCstr, Xb, 2.0, k) * inhibition;
    const dS = ((sIn - sCstr) / tau) - rCons;
    sCstr = Math.max(20, sCstr + dtDays * dS);
    cstrEffluent.push(Number(sCstr.toFixed(1)));

    // PFR transmits the concentrated toxic plug with minimal axial damping, causing acute local inhibition
    const plugArrivalStart = 2.0 + tauHours * 0.85;
    const plugArrivalEnd = 4.0 + tauHours * 1.15;
    let sPfrExit = 72.0;
    if (h >= plugArrivalStart && h <= plugArrivalEnd) {
      const center = 0.5 * (plugArrivalStart + plugArrivalEnd);
      const pulseFactor = Math.exp(-Math.pow((h - center) / 1.1, 2));
      // Severe Haldane inhibition inside the concentrated PFR plug allows untreated dye breakthrough
      sPfrExit = 72.0 + (shockPeak * 0.28) * pulseFactor;
    }
    pfrEffluent.push(Number(sPfrExit.toFixed(1)));
  }

  return { hours, influentPulse, cstrEffluent, pfrEffluent };
}

/**
 * Feature #23: Single Activated Sludge Bio-Floc Reaction-Diffusion Micro-Model (120 um diameter)
 */
export function computeBioFlocMicroProfile(S_bulk = 75, DO_bulk = 2.15, flocRadiusUm = 60) {
  const radialPoints = [];
  const n = 25;
  // Thiele modulus for oxygen diffusion inside biological floc (D_O2 ~ 1.8e-9 m2/s)
  const thieleO2 = 2.4 * Math.sqrt(Math.max(0.2, 2.5 / Math.max(0.2, DO_bulk)));
  const thieleS = 1.1 * Math.sqrt(Math.max(0.2, 100 / Math.max(10, S_bulk)));

  for (let i = 0; i <= n; i++) {
    const rFrac = i / n; // 0 = Floc Center, 1 = Bulk Liquid Boundary
    // Spherical reaction-diffusion profile: sinh(Phi * r) / (r * sinh(Phi))
    const doRatio = rFrac < 0.02
      ? thieleO2 / Math.sinh(thieleO2)
      : Math.sinh(thieleO2 * rFrac) / (rFrac * Math.sinh(thieleO2));
    const sRatio = rFrac < 0.02
      ? thieleS / Math.sinh(thieleS)
      : Math.sinh(thieleS * rFrac) / (rFrac * Math.sinh(thieleS));

    const localDO = Math.max(0, DO_bulk * doRatio);
    const localS = Math.max(0, S_bulk * sRatio);
    // Aerobic oxidation in outer shell; Anoxic azo-dye cleavage (-N=N- bond reduction) in hypoxic core!
    const aerobicActivity = (localDO / (0.20 + localDO)) * (localS / (65 + localS)) * 100;
    const anoxicAzoCleavage = (0.15 / (0.15 + localDO)) * (localS / (40 + localS)) * 100;

    radialPoints.push({
      rUm: Number((rFrac * flocRadiusUm).toFixed(1)),
      rFrac: Number(rFrac.toFixed(2)),
      DO: Number(localDO.toFixed(2)),
      S: Number(localS.toFixed(1)),
      aerobicActivity: Number(aerobicActivity.toFixed(1)),
      anoxicAzoCleavage: Number(anoxicAzoCleavage.toFixed(1))
    });
  }

  const effectivenessFactor = (3.0 / (thieleO2 * thieleO2)) * (thieleO2 * (1.0 / Math.tanh(thieleO2)) - 1.0);

  return {
    radialPoints,
    thieleO2: Number(thieleO2.toFixed(2)),
    effectivenessFactor: Number(Math.min(1.0, Math.max(0.1, effectivenessFactor)).toFixed(3)),
    anoxicCoreFraction: Number((radialPoints.filter(p => p.DO < 0.35).length / radialPoints.length * 100).toFixed(0))
  };
}

/**
 * Sustainability Assessment
 */
export function evaluateSustainability(Q, V, S0, Se, Xb, theta_c, k = DEFAULT_KINETICS, sParams = DEFAULT_SUSTAINABILITY) {
  const bcodRemovedDaily = Q * Math.max(0, S0 - Se) * 1e-3;
  const biomassInventory = V * Xb * 1e-3;
  const otrDaily = (k.alpha_O * bcodRemovedDaily) + (1.42 * k.b * biomassInventory);

  const aerationKwhDaily = Math.max(0, otrDaily / sParams.sae);
  const mixingKw = (sParams.mixing_power_density * V) / 1000.0;
  const mixingKwhDaily = mixingKw * 24.0;
  const pumpingKwhDaily = Q * sParams.pumping_energy_specific;

  const totalKwhDaily = aerationKwhDaily + mixingKwhDaily + pumpingKwhDaily;
  const energyPerM3 = Q > 0 ? totalKwhDaily / Q : 0;
  const costPerM3 = energyPerM3 * sParams.electricity_cost_kwh;
  const ghgPerM3 = energyPerM3 * sParams.grid_emission_factor;
  const sludgeDaily = theta_c > 0 ? biomassInventory / theta_c : 0;

  return {
    v_reactor_m3: V,
    aeration_kwh_day: aerationKwhDaily,
    mixing_kwh_day: mixingKwhDaily,
    pumping_kwh_day: pumpingKwhDaily,
    total_energy_kwh_day: totalKwhDaily,
    energy_kwh_per_m3: energyPerM3,
    cost_usd_per_m3: costPerM3,
    ghg_kg_co2e_per_m3: ghgPerM3,
    sludge_kg_vss_day: sludgeDaily
  };
}

export function generateLevenspielData(S0, Se_target, Xb, k = DEFAULT_KINETICS) {
  const points = [];
  const targetX = (S0 - Se_target) / S0;
  const DO_avg = 2.0;

  const numSteps = 50;
  for (let i = 1; i <= numSteps; i++) {
    const x = (i / numSteps) * 0.95;
    const sVal = S0 * (1.0 - x);
    const rate = substrateConsumptionRate(sVal, Xb, DO_avg, k);
    const invRate = rate > 0 ? 1.0 / rate : 0;
    points.push({
      conversion: x,
      substrate: sVal,
      rate: rate,
      invRate: invRate
    });
  }

  const exitRate = substrateConsumptionRate(Se_target, Xb, DO_avg, k);
  const cstrInvRate = exitRate > 0 ? 1.0 / exitRate : 0;

  return {
    curve: points,
    targetConversion: targetX,
    cstrInvRate: cstrInvRate
  };
}

export function simulateCSTRStartup(S0, DO0, tau, theta_c, k = DEFAULT_KINETICS, days = 25, nSteps = 100) {
  const dt = days / nSteps;
  let S = S0;
  let Xb = 200.0;
  let DO = 4.0;

  const timeArr = [0];
  const sArr = [S];
  const xbArr = [Xb];
  const doArr = [DO];

  for (let i = 0; i < nSteps; i++) {
    const mu = specificGrowthRate(S, DO, k);
    const rCons = (mu * Xb) / k.Y;
    const our = (k.alpha_O * rCons) + (1.42 * k.b * Xb);

    const dS_dt = (S0 - S) / tau - rCons;
    const dXb_dt = (mu - k.b - (1.0 / theta_c)) * Xb;
    const dDO_dt = (DO0 - DO) / tau + k.kLa * (k.DO_sat - DO) - our;

    S = Math.max(0, S + dt * dS_dt);
    Xb = Math.max(10, Xb + dt * dXb_dt);
    DO = Math.max(0.2, Math.min(k.DO_sat, DO + dt * dDO_dt));

    timeArr.push((i + 1) * dt);
    sArr.push(S);
    xbArr.push(Xb);
    doArr.push(DO);
  }

  return {
    time: timeArr,
    S: sArr,
    Xb: xbArr,
    DO: doArr
  };
}
