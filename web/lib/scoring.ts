import { SYMPTOMS } from '../constants/symptoms';
import { ALWAYS_ESSENTIAL_IDS } from '../constants/biomarkers';
import type { Phase1Data, Phase2Data, Phase3Data } from '../types';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface KeyFactor {
  title: string;
  explanation: string;
}

export interface ProtectiveFactor {
  title: string;
  explanation: string;
}

// --- Dynamic panel tiering types ---
export type BiomarkerTier = 'essential' | 'recommended' | 'extended';

export interface TieredMarker {
  id: string;
  tier: BiomarkerTier;
  reasons: string[];
}

export interface PersonalizedPanel {
  essential: TieredMarker[];
  recommended: TieredMarker[];
  extended: TieredMarker[];
  allIds: string[];
}

export function isExcluded(phase3: Phase3Data): boolean {
  return phase3.trt_history === 'current' || phase3.steroid_history === 'current';
}

export function calculateRiskScore(
  phase1: Phase1Data,
  phase2: Phase2Data,
  phase3: Phase3Data,
  symptomIds: string[]
): number | null {
  if (isExcluded(phase3)) return null;

  // --- Phase 1: Demographics (max 25) ---
  let p1 = 0;

  if (phase1.age >= 55) p1 += 20;
  else if (phase1.age >= 45) p1 += 15;
  else if (phase1.age >= 35) p1 += 8;
  else if (phase1.age >= 25) p1 += 3;

  // Body composition — muscle override halves the fat-related risk points
  let bfPoints = 0;
  if (phase1.body_fat_percent) {
    if (phase1.body_fat_percent >= 30) bfPoints = 20;
    else if (phase1.body_fat_percent >= 25) bfPoints = 12;
    else if (phase1.body_fat_percent >= 20) bfPoints = 7;
    else if (phase1.body_fat_percent >= 15) bfPoints = 3;
  } else if (phase1.height_cm && phase1.weight_kg) {
    const bmi = phase1.weight_kg / Math.pow(phase1.height_cm / 100, 2);
    if (bmi >= 35) bfPoints = 12;
    else if (bmi >= 30) bfPoints = 8;
    else if (bmi >= 25) bfPoints = 4;
  }
  if (phase1.high_muscle_override) bfPoints = Math.round(bfPoints * 0.5);
  p1 += bfPoints;

  const p1_capped = Math.min(p1, 25);

  // --- Phase 2: Lifestyle sub-score (max 15) + Endocrine indicators sub-score (max 20) ---
  // Separated so lifestyle inputs remain visible even when endocrine symptoms are maxed (prevents information shadowing)

  let p2_lifestyle = 0;

  // Sleep hours
  let sleepPts = 0;
  if (phase2.avg_sleep_hours < 5) sleepPts = 15;
  else if (phase2.avg_sleep_hours < 6) sleepPts = 10;
  else if (phase2.avg_sleep_hours < 7) sleepPts = 5;
  else if (phase2.avg_sleep_hours < 8) sleepPts = 2;

  // Sleep quality: amplifies hour-based risk AND adds standalone penalty for LH pulse fragmentation
  if (phase2.sleep_quality <= 2) {
    sleepPts = Math.round(sleepPts * 1.2);
    sleepPts += 5; // independent penalty: fragmented sleep disrupts pulsatile LH regardless of duration
  } else if (phase2.sleep_quality >= 4) {
    sleepPts = Math.max(0, sleepPts - 3);
  }
  p2_lifestyle += sleepPts;

  // Beer (penalized more — hops phytoestrogens)
  const beerScore: Record<string, number> = { never: 0, '1-2x_week': 2, '3x_week': 5, '4-6x_week': 10, daily: 15 };
  p2_lifestyle += beerScore[phase2.beer_frequency] ?? 0;

  // Spirits / wine
  const spiritsScore: Record<string, number> = { never: 0, '1-2x_week': 2, '3x_week': 4, '4-6x_week': 8, daily: 12 };
  p2_lifestyle += spiritsScore[phase2.spirits_wine_frequency] ?? 0;

  // Smoking
  if (phase2.smoking_status === 'daily') p2_lifestyle += 10;
  else if (phase2.smoking_status === 'occasional') p2_lifestyle += 5;

  // Sugar consumption
  if (phase2.sugar_consumption === 'very_high') p2_lifestyle += 10;
  else if (phase2.sugar_consumption === 'frequent') p2_lifestyle += 6;
  else if (phase2.sugar_consumption === 'moderate') p2_lifestyle += 3;

  // Sedentary hours
  if (phase2.sedentary_hours >= 10) p2_lifestyle += 8;
  else if (phase2.sedentary_hours >= 7) p2_lifestyle += 5;
  else if (phase2.sedentary_hours >= 4) p2_lifestyle += 2;

  // Stress — pregnenolone steal: cortisol production competes with testosterone synthesis
  if (phase2.stress_level >= 5) p2_lifestyle += 10;
  else if (phase2.stress_level >= 4) p2_lifestyle += 6;

  // Coffee
  if (phase2.coffee_per_day === '6+') p2_lifestyle += 4;
  else if (phase2.coffee_per_day === '4-5') p2_lifestyle += 2;

  // Exercise — Goldilocks scoring
  if (phase2.exercise_frequency === 'none') p2_lifestyle += 10;
  else if (phase2.exercise_frequency === '3-4x' || phase2.exercise_frequency === '5-6x') p2_lifestyle = Math.max(0, p2_lifestyle - 5);
  else if (phase2.exercise_frequency === 'daily') p2_lifestyle += 5; // overtraining risk

  // Exercise type — anabolic stimulus gradient: resistance/HIIT increases AR density + GH pulse amplitude
  const anabolicTypes = ['Weightlifting', 'HIIT'];
  const hasAnabolicTraining = (phase2.exercise_types || []).some((t: string) => anabolicTypes.includes(t));
  if (hasAnabolicTraining && phase2.exercise_frequency !== 'none' && phase2.exercise_frequency !== 'daily') {
    p2_lifestyle = Math.max(0, p2_lifestyle - 3); // anabolic stimulus bonus
  }
  if (phase2.exercise_frequency === 'daily' && hasAnabolicTraining) {
    p2_lifestyle += 3; // daily high-intensity amplifies overtraining cortisol risk
  }

  const p2_lifestyle_capped = Math.min(p2_lifestyle, 15);

  // Endocrine indicators sub-score (max 20) — kept separate so they don't shadow lifestyle inputs
  let p2_endocrine = 0;

  // Morning erections — direct proxy for nocturnal testosterone surge
  const mefScore: Record<string, number> = { daily: 0, '4-6x_week': 4, '2-3x_week': 10, rarely: 15, never: 18 };
  p2_endocrine += mefScore[phase2.morning_erection_frequency] ?? 0;

  // Libido rating (≤2 = clinically significant suppression)
  if (phase2.libido_rating <= 2) p2_endocrine += 15;

  // Erectile quality (≤2 = clinically significant dysfunction)
  if ((phase2.erectile_rating ?? 3) <= 2) p2_endocrine += 15;

  const p2_endocrine_capped = Math.min(p2_endocrine, 20);

  const p2_capped = p2_lifestyle_capped + p2_endocrine_capped; // max 35

  // --- Phase 3: Medical History (max 35) ---
  let p3 = 0;
  const conditions = phase1.medical_conditions || [];

  if (conditions.some(c => c.toLowerCase().includes('sleep apnea'))) p3 += 12;
  if (conditions.some(c => c.toLowerCase().includes('diabetes') || c.toLowerCase().includes('insulin resistance'))) p3 += 10;
  if (conditions.some(c => c.toLowerCase().includes('testicular'))) p3 += 8;
  if (conditions.some(c => c.toLowerCase().includes('hypertension'))) p3 += 5;
  if (conditions.some(c => c.toLowerCase().includes('cardiovascular'))) p3 += 8;
  // Hypothyroidism: elevates SHBG, impairs T3-driven androgen receptor sensitivity, slows testosterone utilization
  if (conditions.some(c => c.toLowerCase().includes('hypothyroidism'))) p3 += 6;
  // Depression/Anxiety: chronic HPA axis overactivation elevates cortisol → suppresses GnRH/LH → reduces testosterone
  if (conditions.some(c => c.toLowerCase().includes('depression') || c.toLowerCase().includes('anxiety'))) p3 += 5;
  if (conditions.some(c => c.toLowerCase().includes('obesity'))) p3 += 12;
  // Hemochromatosis: iron deposits destroy pituitary + Leydig cells → secondary hypogonadism
  if (conditions.some(c => c.toLowerCase().includes('hemochromatosis'))) p3 += 10;
  // Pituitary disorder: direct source of LH/FSH; any dysfunction = secondary hypogonadism
  if (conditions.some(c => c.toLowerCase().includes('pituitary'))) p3 += 12;
  // Liver disease: dysregulates SHBG + impairs estrogen clearance → elevated E2, suppressed free T
  if (conditions.some(c => c.toLowerCase().includes('liver'))) p3 += 8;
  // Chronic kidney disease: uremia suppresses HPT axis, impairs testosterone synthesis
  if (conditions.some(c => c.toLowerCase().includes('kidney'))) p3 += 8;

  if (phase3.steroid_history === 'past') {
    const basePoints = phase3.steroid_pct === false ? 15 : 10;

    // Time-decay: the longer ago use stopped, the more HPT axis recovery is expected
    const timeDecay: Record<string, number> = {
      lt_6mo: 1.0,   // still very likely suppressed
      '6_12mo': 0.8, // partial recovery window
      '1_3yr': 0.6,  // most men partially recovered
      '3_5yr': 0.4,
      '5plus_yr': 0.2,
    };
    const decay = phase3.steroid_stopped_ago ? (timeDecay[phase3.steroid_stopped_ago] ?? 1.0) : 1.0;

    // Cycle count: more cycles = more cumulative HPT axis stress
    const cycleMulti: Record<string, number> = {
      '1': 0.8,
      '2_3': 1.0,
      '4_10': 1.2,
      '10plus': 1.4,
    };
    const cycles = phase3.steroid_cycle_count ? (cycleMulti[phase3.steroid_cycle_count] ?? 1.0) : 1.0;

    p3 += Math.round(basePoints * decay * cycles);
  }
  if (phase3.trt_history === 'past') p3 += 5;

  // Medication categories — drug classes with documented HPT axis impact
  const medCats = phase3.medication_categories || [];
  if (medCats.includes('opioids')) p3 += 10;       // OPIAD: suppresses LH/FSH → testosterone
  if (medCats.includes('corticosteroids')) p3 += 8; // direct HPT axis suppression
  if (medCats.includes('ssri_snri')) p3 += 5;      // prolactin elevation → GnRH suppression → reduced LH/FSH → testosterone

  // Supplement resistance: taking foundational T-support but still low libido/energy
  const symptoms = symptomIds.filter(id => id !== 'none');
  const suppCats = phase3.supplement_categories || [];
  const hasLowLibidoOrEnergy = phase2.libido_rating <= 2 || symptoms.includes('low_energy');
  if (phase3.taking_supplements && suppCats.includes('t_support_basics') && hasLowLibidoOrEnergy) p3 += 5;

  const p3_capped = Math.min(p3, 35);

  // --- Phase 4: Symptoms (max 40) ---
  const primaryWeights: Record<string, number> = {
    low_libido: 15,
    ed: 15,
    gynecomastia: 15,    // most objective sign of E2/T imbalance
    fat_gain: 10,
    hot_flashes: 10,     // strong estrogen signal in men
    testicular_ache: 10, // direct anatomical indicator
    muscle_loss: 8,      // primary anabolic deficiency signal
    reduced_strength: 7,
  };

  let p4 = 0;
  const secondaryCount = symptoms.filter(id => !(id in primaryWeights)).length;
  for (const id of symptoms) {
    p4 += primaryWeights[id] ?? 0;
  }
  p4 += secondaryCount * 5;

  let p4_capped = Math.min(p4, 40);

  // Objective physiological signs (gynecomastia, testicular_ache) are not subjective complaints —
  // when present alongside enough symptoms to hit the cap, they distinguish "Full Metabolic Suite"
  // from purely subjective symptom clusters, preventing clinical under-weighting
  if (p4 > 40 && (symptoms.includes('gynecomastia') || symptoms.includes('testicular_ache'))) {
    p4_capped += 5;
  }

  return Math.min(p1_capped + p2_capped + p3_capped + p4_capped, 100);
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 86) return 'critical';
  if (score >= 61) return 'high';
  if (score >= 31) return 'moderate';
  return 'low';
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'critical': return '#E88080';
    case 'high': return '#FF8C00';
    case 'moderate': return '#E8C470';
    case 'low': return '#4ade80';
  }
}

export function getRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'critical': return 'Critical Risk';
    case 'high': return 'High Risk';
    case 'moderate': return 'Moderate Risk';
    case 'low': return 'Low Risk';
  }
}

export function getRiskAction(level: RiskLevel): string {
  switch (level) {
    case 'critical': return 'Immediate bloodwork required — consult a physician.';
    case 'high': return 'Bloodwork strongly recommended within 30 days.';
    case 'moderate': return 'Schedule bloodwork and begin lifestyle optimization.';
    case 'low': return 'Good baseline — establish bloodwork for reference.';
  }
}

export function scoreSymptoms(selectedIds: string[]) {
  const filtered = selectedIds.filter(id => id !== 'none');
  const weighted_score = filtered.reduce((sum, id) => {
    const s = SYMPTOMS.find(s => s.id === id);
    return sum + (s?.correlation_weight ?? 0);
  }, 0);
  return { weighted_score: Math.round(weighted_score * 10) / 10, symptom_count: filtered.length };
}

export function getKeyFactors(
  phase1: Phase1Data,
  phase2: Phase2Data,
  phase3: Phase3Data,
  symptomIds: string[]
): KeyFactor[] {
  const factors: KeyFactor[] = [];
  const symptoms = symptomIds.filter(id => id !== 'none');
  const conditions = phase1.medical_conditions || [];

  // Protective context — used to qualify deterministic-sounding risk factors
  const activeExercise = phase2.exercise_frequency === '3-4x' || phase2.exercise_frequency === '5-6x';
  const protectedBodyComp = (phase1.body_fat_percent != null && phase1.body_fat_percent < 23) || !!phase1.high_muscle_override;
  const metabolicallyProtected = activeExercise && protectedBodyComp;
  const strongAndrogen = (phase2.libido_rating ?? 0) >= 4 &&
    (phase2.morning_erection_frequency === 'daily' || phase2.morning_erection_frequency === '4-6x_week');

  // 1. Sleep
  const highCoffee = phase2.coffee_per_day === '4-5' || phase2.coffee_per_day === '6+';
  const highStress = (phase2.stress_level ?? 3) >= 4;

  if (phase2.avg_sleep_hours < 6) {
    let explanation = `Studies show restricting sleep to 5 hours suppresses testosterone by roughly 10–15% within a week — one of the more consistent findings in sleep-hormone research. Whether that exact magnitude applies to you depends on your individual sleep architecture and baseline, but under 6 hours is reliably in the suppressive range for most men. It's also the most reversible variable in this profile.`;
    if (highCoffee && highStress) explanation += ` With ${phase2.coffee_per_day} coffees/day and your reported stress level, both late caffeine and elevated evening cortisol are plausible contributors to why sleep is compressed — addressing all three together is likely more effective than targeting sleep in isolation.`;
    else if (highCoffee) explanation += ` With ${phase2.coffee_per_day} coffees/day, late caffeine is a plausible contributor — caffeine has a 5–6 hour half-life and delays sleep onset and reduces deep sleep in most people, though sensitivity varies.`;
    else if (highStress) explanation += ` At your reported stress level, elevated evening cortisol is a plausible reason sleep is fragmented or shortened — high cortisol suppresses melatonin and reduces the slow-wave stages where most testosterone is produced.`;
    factors.push({ title: `Sleep deprivation (${phase2.avg_sleep_hours}h average)`, explanation });
  } else if (phase2.avg_sleep_hours < 7) {
    let explanation = `Most testosterone is produced during the deep sleep stages that occur in the latter half of the night. Consistently under 7 hours compresses this window — and population data shows measurable suppression at the group level. Whether it's a meaningful driver for you depends on your sleep architecture and what else in your profile is adding pressure. It rarely acts alone, but when multiple suppressive factors are present, it amplifies them.`;
    if (highCoffee) explanation += ` Your coffee intake (${phase2.coffee_per_day}/day) is worth examining — caffeine's half-life means afternoon cups still reduce deep sleep architecture even if they don't keep you awake.`;
    else if (highStress) explanation += ` At your reported stress level, evening cortisol is likely reducing the restorative quality of the hours you do get — the number on paper may be better than what's actually happening in your sleep stages.`;
    factors.push({ title: `Suboptimal sleep (${phase2.avg_sleep_hours}h average)`, explanation });
  }

  // 1b. Sleep quality — fragmentation independent of hours
  if (phase2.sleep_quality <= 2 && phase2.avg_sleep_hours >= 7) {
    factors.push({
      title: 'Poor sleep quality — LH pulse fragmentation risk',
      explanation: `Sleep architecture — specifically the REM and deep sleep stages — drives the pulsatile release of LH, which is the brain's overnight signal to the testes to produce testosterone. Fragmented or non-restorative sleep can disrupt this pulse even when total hours look adequate. The degree of hormonal impact varies: some men with disrupted sleep maintain normal testosterone, others don't. If your labs show suppressed LH alongside low-normal testosterone, sleep quality is a primary variable to investigate further.`,
    });
  }

  // 2. Beer
  if (phase2.beer_frequency === 'daily' || phase2.beer_frequency === '4-6x_week') {
    factors.push({
      title: `Heavy beer consumption (${phase2.beer_frequency.replace(/_/g, ' ')})`,
      explanation: 'Hops contain 8-prenylnaringenin, one of the more potent dietary phytoestrogens. At this frequency, the accumulated estrogenic load is worth testing for — population-level data associates regular beer intake with elevated estradiol and suppressed testosterone, though the magnitude varies significantly by individual metabolism and total volume. Estradiol is in your panel to show whether this conversion is happening at a clinically relevant level for you.',
    });
  } else if (phase2.beer_frequency === '3x_week') {
    factors.push({
      title: 'Frequent beer use (3x/week)',
      explanation: 'At 3x per week, hops-derived phytoestrogens and alcohol are two overlapping inputs that can influence the testosterone-to-estrogen balance. The effect at this frequency is modest and individual — some men show no measurable hormonal impact, others do. It\'s a variable worth noting in the context of a full panel rather than treating as a confirmed driver.',
    });
  }

  // 3. Spirits / wine
  if (phase2.spirits_wine_frequency === 'daily' || phase2.spirits_wine_frequency === '4-6x_week') {
    factors.push({
      title: `High spirits/wine consumption (${phase2.spirits_wine_frequency.replace(/_/g, ' ')})`,
      explanation: 'At this frequency, alcohol has three potential pathways to hormonal disruption: it fragments deep sleep (where most testosterone is produced), raises cortisol (which competes with testosterone for the same biosynthetic precursors), and at chronic doses can directly impair Leydig cell function. How much of this applies depends on total intake and liver metabolism. The liver panel in your extended markers is relevant context here.',
    });
  } else if (phase2.spirits_wine_frequency === '3x_week') {
    factors.push({
      title: 'Regular spirits/wine use (3x/week)',
      explanation: 'At 3x per week, the more consistently supported effect is on sleep architecture — alcohol compresses REM sleep, reducing the overnight testosterone production window. Direct testicular toxicity at this frequency is debated in the literature; it becomes more relevant at daily intake. The sleep effect is the more likely active mechanism here, particularly if sleep quality is already suboptimal.',
    });
  }

  // 4. Smoking
  if (phase2.smoking_status === 'daily') {
    factors.push({
      title: 'Daily smoking',
      explanation: 'The research on smoking and testosterone is mixed — some studies show lower total testosterone in smokers, others find no significant difference or slight elevation via SHBG lowering. What is more consistent is smoking\'s effect on cortisol, vascular endothelial function, and systemic inflammation. The more reliable concern here is the vascular side: smoking is an independent endothelial toxin that affects the microvasculature, including penile blood flow. The net hormonal impact depends on whether the cortisol and vascular effects outweigh any SHBG-related changes — the panel will help characterize this.',
    });
  } else if (phase2.smoking_status === 'occasional') {
    factors.push({
      title: 'Occasional smoking',
      explanation: 'At occasional frequency, the effect on testosterone production is likely modest. The more relevant concerns are cortisol spikes from nicotine and the cumulative vascular impact — particularly relevant if erectile function is also suboptimal.',
    });
  }

  // 4b. Coffee — standalone factor (high intake competes with testosterone precursors)
  if (phase2.coffee_per_day === '6+') {
    factors.push({
      title: 'Very high caffeine (6+ units/day) — cortisol competition',
      explanation: 'At 6+ units daily, caffeine chronically elevates cortisol — and cortisol and testosterone share the same upstream precursor (pregnenolone). When cortisol demand is persistently high, pregnenolone is preferentially routed toward cortisol. How much testosterone synthesis is affected depends on adrenal reserve and stress load. The compounding effect on sleep architecture is arguably the more consistent concern at this intake: caffeine\'s half-life means the last cup of the day is still active well into the night, suppressing the deep sleep stages where testosterone is produced.',
    });
  } else if (phase2.coffee_per_day === '4-5') {
    factors.push({
      title: 'High caffeine intake (4-5 units/day)',
      explanation: 'At 4–5 units daily, caffeine\'s half-life means afternoon consumption is still affecting sleep architecture hours later — compressing the testosterone production window overnight. The cortisol-pregnenolone competition is a secondary concern at this level. The main variable is how late the last cup lands relative to your sleep time.',
    });
  }

  // 5. Morning erections
  if (phase2.morning_erection_frequency === 'never') {
    factors.push({
      title: 'Absent morning erections',
      explanation: 'Morning erections are driven by the nocturnal testosterone surge during REM sleep — their presence or absence is one of the more reliable functional proxies for what\'s happening hormonally overnight. Complete absence is consistently associated with suppressed androgen levels in the literature, though some men with normal testosterone lose morning erections due to age-related changes in sleep architecture or vascular factors. It\'s one of the stronger signals in this profile — the labs will clarify whether the cause is hormonal, vascular, or both.',
    });
  } else if (phase2.morning_erection_frequency === 'rarely') {
    factors.push({
      title: 'Rare morning erections',
      explanation: 'Morning erections occurring less than once a week are associated with suboptimal androgen production in population data — but the same pattern also appears in disrupted REM sleep and vascular dysfunction. Distinguishing the cause is what LH, FSH, and the vascular-related markers in your panel are designed to do.',
    });
  }

  // 5b. Vascular ED pattern — smoking amplifies urgency
  const vascularPattern =
    (phase2.libido_rating ?? 3) >= 4 &&
    ((phase2.erectile_rating ?? 3) <= 2 ||
      phase2.morning_erection_frequency === 'rarely' ||
      phase2.morning_erection_frequency === 'never');
  if (vascularPattern && (phase2.smoking_status === 'daily' || phase2.smoking_status === 'occasional')) {
    factors.push({
      title: 'Vascular ED pattern — smoking elevates urgency',
      explanation: 'Your combination of high libido but poor erectile function points to a vascular rather than hormonal cause. Smoking is an independent endothelial toxin that accelerates arterial narrowing — including the penile microvasculature. This combination warrants urgent lipid panel and physician review.',
    });
  }

  // 6. Sedentary
  const highSugar = phase2.sugar_consumption === 'very_high' || phase2.sugar_consumption === 'frequent';
  if (phase2.sedentary_hours >= 10) {
    let explanation = 'Prolonged sitting is independently associated with reduced testosterone and markers of insulin resistance — even in men who exercise regularly. The mechanisms are partly circulatory (reduced blood flow) and partly metabolic (sustained insulin elevation from inactivity).';
    if (highSugar) explanation += ` Combined with high sugar intake, this raises the probability of an insulin resistance pattern: inactivity reduces glucose uptake, sugar spikes insulin further, and chronically elevated insulin can suppress testosterone synthesis and increase aromatase activity. Whether this cascade is active in your case depends on your metabolic phenotype — fasting insulin and glucose in your panel will answer that directly.`;
    if (metabolicallyProtected) explanation += ` Your exercise frequency and body composition reduce the probability of this cascade being fully engaged — the independent circulatory effects of prolonged sitting still apply, but the metabolic component is less likely to be the primary driver.`;
    factors.push({ title: `Highly sedentary lifestyle (${phase2.sedentary_hours}h/day)`, explanation });
  } else if (phase2.sedentary_hours >= 7) {
    let explanation = 'Extended daily sitting is associated with impaired circulation and modestly elevated insulin, both of which can reduce the efficiency of testosterone synthesis. The effect at this level is real but typically modest — it becomes more significant when combined with other suppressive inputs.';
    if (highSugar) explanation += ` With frequent sugar consumption on top of this, the probability of elevated baseline insulin increases — which over time can suppress SHBG and increase aromatase activity. Whether that loop is engaged is what fasting insulin in your panel is designed to show.`;
    if (metabolicallyProtected) explanation += ` Your exercise frequency and body composition reduce the probability of this being a primary driver — the risk is present but less likely to be fully engaged at this combination.`;
    factors.push({ title: `Moderately sedentary (${phase2.sedentary_hours}h/day)`, explanation });
  }

  // 7. Exercise (no exercise)
  if (phase2.exercise_frequency === 'none') {
    factors.push({
      title: 'No regular exercise',
      explanation: 'Population studies consistently show lower testosterone in sedentary men compared to those who train regularly — the association is strong and the mechanism is well-understood: exercise increases androgen receptor density, improves insulin sensitivity, and stimulates acute testosterone and GH release. The magnitude of effect depends on exercise type and intensity. In your profile, the absence of exercise removes one of the most modifiable inputs for hormonal support.',
    });
  }

  // 8. Sugar
  if (phase2.sugar_consumption === 'very_high') {
    let explanation = 'Chronic high sugar intake is associated with insulin resistance at a population level — and when insulin resistance is present, it can suppress testosterone synthesis, elevate SHBG, and increase aromatase activity. The full chain from high sugar to measurably lower testosterone is real but not universal. It depends on individual insulin sensitivity, metabolic phenotype, and how the sugar is distributed through the day. Fasting insulin and glucose in your panel will tell you whether the metabolic component is currently active.';
    if (metabolicallyProtected) explanation += ' Your body composition and exercise frequency reduce the probability of the full cascade being engaged — but the glycemic load effect on SHBG is less body-composition-dependent and worth monitoring regardless.';
    factors.push({ title: 'Very high sugar consumption', explanation });
  } else if (phase2.sugar_consumption === 'frequent') {
    let explanation = 'Frequent sugar consumption triggers repeated insulin spikes that can suppress SHBG production over time. When SHBG is low, free testosterone increases momentarily but is also metabolized more rapidly — in some men this faster turnover means tissues receive less sustained androgen exposure, producing symptoms resembling low testosterone even when total levels appear normal. In others, the higher moment-to-moment free testosterone is sufficient and no symptoms arise. Measuring total T, free T, and SHBG together is what distinguishes these scenarios.';
    if (metabolicallyProtected) explanation += ' Your exercise frequency and body composition reduce the probability of the full insulin resistance loop — the SHBG-suppressing effect of glycemic load is the more likely active mechanism here.';
    factors.push({ title: 'Frequent sugar intake — glycemic load & SHBG disruption', explanation });
  }

  // 9. Age
  if (phase1.age >= 45) {
    let explanation = 'Population studies show average testosterone declining by roughly 1–2% per year from the mid-30s onward. By the mid-40s, the cumulative effect is statistically meaningful at the group level — but individual trajectories vary considerably. Some men maintain robust levels well into their 50s; others show earlier decline. What this age range does mean is that additional suppressive factors in your profile carry more weight than they would at 30, because the hormonal reserve is smaller. Bloodwork is the only way to know where your individual baseline actually sits.';
    if (strongAndrogen) explanation += ' Your libido and morning erection frequency suggest functional androgen status is currently adequate — the age-related decline is a real trend but may not yet be clinically significant at your individual baseline.';
    factors.push({ title: `Age ${phase1.age} — natural decline is a factor`, explanation });
  } else if (phase1.age >= 35) {
    let explanation = 'Population averages show testosterone beginning to decline in the mid-30s — roughly 1–2% per year. For most men at this age this isn\'t yet clinically significant on its own, but it does mean the hormonal environment is less forgiving of other suppressive factors than it was at 25. At 35–44, any additional inputs — poor sleep, prior steroid use, metabolic stress — are working against a baseline that is no longer at peak.';
    if (strongAndrogen) explanation += ' Your libido and morning erection frequency are reassuring signs that functional androgen status remains intact at this stage.';
    factors.push({ title: `Age ${phase1.age} — natural decline has begun`, explanation });
  }

  // 10. Body fat
  if (phase1.body_fat_percent && phase1.body_fat_percent >= 25) {
    factors.push({
      title: `Elevated body fat (${phase1.body_fat_percent}%) — aromatization risk`,
      explanation: 'Adipose tissue contains aromatase — the enzyme that converts testosterone into estrogen. At elevated body fat levels, this conversion can meaningfully shift the testosterone-to-estrogen ratio. The clinical significance depends on fat distribution (visceral fat is more metabolically active than subcutaneous), total aromatase activity, and baseline hormone levels. Estradiol in your panel will show whether this conversion is already affecting your ratio — it\'s the direct measure of the output, not just a proxy.',
    });
  } else if (!phase1.body_fat_percent && phase1.height_cm && phase1.weight_kg) {
    const bmi = phase1.weight_kg / Math.pow(phase1.height_cm / 100, 2);
    if (bmi >= 30) {
      factors.push({
        title: 'Elevated body weight — aromatization risk',
        explanation: 'Without a direct body fat measurement, BMI at this level suggests excess adipose tissue is likely — though it can be misleading for muscular individuals. If fat mass is elevated, aromatase activity is worth testing for. Estradiol in your panel will show whether the conversion is happening at a clinically meaningful level.',
      });
    } else if (bmi >= 25) {
      factors.push({
        title: 'Slightly elevated BMI',
        explanation: 'At this BMI, aromatization risk is present but typically modest — and highly dependent on fat distribution and body composition. Without a direct body fat measurement, it\'s a variable worth tracking alongside actual hormone values rather than treating as a confirmed driver.',
      });
    }
  }

  // 11. Medical conditions
  if (conditions.some(c => c.toLowerCase().includes('sleep apnea'))) {
    factors.push({
      title: 'Sleep apnea',
      explanation: 'Sleep apnea severely disrupts the nocturnal testosterone surge. It is both a symptom and a cause of low testosterone — a cycle that requires treatment to break.',
    });
  }

  if (conditions.some(c => c.toLowerCase().includes('diabetes') || c.toLowerCase().includes('insulin resistance'))) {
    factors.push({
      title: 'Type 2 diabetes / insulin resistance',
      explanation: 'Insulin resistance directly disrupts testosterone production. Men with T2D have testosterone levels 10–15% lower on average than metabolically healthy men of the same age.',
    });
  }

  if (conditions.some(c => c.toLowerCase().includes('testicular'))) {
    factors.push({
      title: 'Testicular trauma or varicocele',
      explanation: 'Physical damage or vascular abnormality in the testes directly impairs the Leydig cells responsible for testosterone production. Bloodwork is essential to assess the impact.',
    });
  }

  if (conditions.some(c => c.toLowerCase().includes('obesity'))) {
    factors.push({
      title: 'Obesity (diagnosed)',
      explanation: 'Obesity dramatically increases aromatization of testosterone to estrogen, suppresses LH signaling, and creates chronic inflammation — all of which impair testosterone production at multiple levels.',
    });
  }

  if (conditions.some(c => c.toLowerCase().includes('hypothyroidism'))) {
    factors.push({
      title: 'Hypothyroidism — SHBG elevation + androgen conversion impairment',
      explanation: 'Thyroid hormones regulate SHBG production and androgen receptor sensitivity. Hypothyroidism typically elevates SHBG — binding up free testosterone — and impairs T3-driven utilization of androgens at the tissue level. Your total testosterone may appear normal while free (active) testosterone is suppressed. TSH, Free T3, and Free T4 are essential context for your hormone panel.',
    });
  }

  if (conditions.some(c => c.toLowerCase().includes('depression') || c.toLowerCase().includes('anxiety'))) {
    factors.push({
      title: 'Depression / Anxiety — HPA axis dysregulation',
      explanation: 'Chronic depression and anxiety drive sustained HPA axis overactivation. Elevated cortisol chronically suppresses GnRH and LH signaling — reducing the downstream testosterone signal. Elevated prolactin (common in depression) further suppresses GnRH. This creates a hormonal environment where testosterone production is suppressed from multiple points in the axis simultaneously.',
    });
  }

  if (conditions.some(c => c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('cardiovascular'))) {
    factors.push({
      title: 'Hypertension / cardiovascular disease',
      explanation: 'Cardiovascular conditions and low testosterone share a bidirectional relationship. Reduced testosterone impairs endothelial function and lipid profiles — a lipid panel is essential context.',
    });
  }

  if (conditions.some(c => c.toLowerCase().includes('hemochromatosis'))) {
    factors.push({
      title: 'Hemochromatosis — iron-mediated hypogonadism',
      explanation: 'Excess iron from hemochromatosis deposits directly in the pituitary gland and testicular Leydig cells. This physically destroys the tissue responsible for LH/FSH production and testosterone synthesis — one of the most underdiagnosed causes of secondary hypogonadism. Ferritin is critical to track alongside your hormone panel.',
    });
  }

  if (conditions.some(c => c.toLowerCase().includes('pituitary'))) {
    factors.push({
      title: 'Pituitary disorder / adenoma — secondary hypogonadism source',
      explanation: 'The pituitary gland produces LH and FSH — the signals that drive testosterone production in the testes. Any pituitary disorder or adenoma disrupts this signaling at the source, causing secondary hypogonadism. Prolactin-secreting adenomas also directly suppress GnRH. LH, FSH, and Prolactin are essential markers for your situation.',
    });
  }

  if (conditions.some(c => c.toLowerCase().includes('liver'))) {
    factors.push({
      title: 'Liver disease / cirrhosis — SHBG dysregulation + estrogen impairment',
      explanation: 'The liver is the primary regulator of SHBG production and the main site of estrogen clearance. Liver dysfunction typically elevates SHBG (binding up free testosterone) while simultaneously impairing estrogen metabolism — resulting in both lower active testosterone and higher estrogen. Estradiol and SHBG context are essential.',
    });
  }

  if (conditions.some(c => c.toLowerCase().includes('kidney'))) {
    factors.push({
      title: 'Chronic kidney disease — uremic HPT axis suppression',
      explanation: 'CKD-related uremia suppresses the hypothalamic-pituitary-testicular axis at multiple levels and directly impairs testosterone synthesis in Leydig cells. CKD also causes anemia through erythropoietin deficiency, which interacts with hematocrit — a marker that appears in your panel.',
    });
  }

  // 12. Steroid history
  if (phase3.steroid_history === 'past') {
    const agoLabels: Record<string, string> = {
      lt_6mo: '< 6 months ago',
      '6_12mo': '6–12 months ago',
      '1_3yr': '1–3 years ago',
      '3_5yr': '3–5 years ago',
      '5plus_yr': '5+ years ago',
    };
    const agoDisplay = phase3.steroid_stopped_ago ? ` — stopped ${agoLabels[phase3.steroid_stopped_ago] ?? phase3.steroid_stopped_ago}` : '';
    if (phase3.steroid_pct === false) {
      factors.push({
        title: `Prior steroid use without PCT${agoDisplay}`,
        explanation: 'Anabolic steroid use suppresses the HPT axis. Without post-cycle therapy, natural testosterone production may still be significantly impaired or never fully recovered. LH and FSH will reveal whether the axis has restarted. Former users also frequently develop post-cycle aromatization — the body over-converts testosterone to estradiol — and a persistently elevated prolactin floor, both of which continue suppressing natural LH production. Estradiol and prolactin are included in your panel to detect this shadow of suppression.',
      });
    } else {
      factors.push({
        title: `Prior anabolic steroid use${agoDisplay}`,
        explanation: 'Previous steroid use suppresses the HPT axis. Depending on cycle count and time since stopping, your natural production may still be in recovery. LH and FSH are essential to assess axis status. Even years after cessation, former users can maintain a high prolactin floor or over-aromatize testosterone into estradiol — a "post-cycle shadow" that continues suppressing natural LH output. Prolactin and estradiol are included in your panel to detect this.',
      });
    }
  }

  // 12b. Past TRT — HPT axis suppression from exogenous testosterone
  if (phase3.trt_history === 'past') {
    factors.push({
      title: 'Prior TRT / hormone replacement',
      explanation: 'Exogenous testosterone suppresses the hypothalamic-pituitary-testicular axis by shutting down LH and FSH signaling. After stopping TRT, the axis must restart — a process that can take months to years and may never fully recover in some men. LH and FSH are essential to assess where your axis currently stands. Post-TRT patients also commonly develop elevated aromatase activity (converting T→estradiol) and a high prolactin floor — both of which continue suppressing natural recovery. Estradiol and prolactin are included in your panel to catch this.',
    });
  }

  // 13. Libido slider
  if (phase2.libido_rating <= 2) {
    factors.push({
      title: `Very low libido reported (${phase2.libido_rating}/5)`,
      explanation: 'Libido is one of the most testosterone-sensitive functions in the body — men with genuinely suppressed androgens almost always report reduced drive. A score this low is a meaningful signal, though some men experience low libido with technically normal testosterone due to elevated prolactin, cortisol, or thyroid dysfunction. The panel is designed to distinguish these pathways.',
    });
  }

  // 14. Erectile quality slider
  if ((phase2.erectile_rating ?? 3) <= 2) {
    factors.push({
      title: `Poor erectile quality reported (${phase2.erectile_rating ?? '?'}/5)`,
      explanation: 'Erectile function depends on testosterone, nitric oxide signaling, and vascular health — three systems that can fail independently. Dysfunction at this severity is a meaningful signal, but the root cause varies: in some men it\'s hormonal, in others vascular, in others both. The panel includes markers to assess each pathway.',
    });
  }

  // 15. Stress
  const poorSleep = phase2.avg_sleep_hours < 7;
  if ((phase2.stress_level ?? 3) >= 5) {
    let explanation = 'At high sustained stress levels, cortisol demand increases significantly. Cortisol and testosterone share the same upstream precursor — pregnenolone — and under chronic stress, pregnenolone is preferentially routed toward cortisol synthesis. How much testosterone production is affected depends on the duration of the stress, adrenal reserve, and whether the pattern is intermittent or constant. Morning cortisol in your panel will show whether HPA axis activation is at a level likely to be suppressing the testosterone pathway.';
    if (poorSleep) explanation += ` The combination with sleep deprivation compounds this: high cortisol fragments sleep, and poor sleep raises cortisol — draining the precursor pool from both directions simultaneously.`;
    factors.push({ title: 'High chronic stress — cortisol-testosterone competition', explanation });
  } else if ((phase2.stress_level ?? 3) >= 4) {
    let explanation = 'Elevated chronic stress raises cortisol, which competes with testosterone for the same biosynthetic precursors. At moderate stress levels, many men compensate adequately — the degree of hormonal suppression depends on how sustained the stress is and how well the HPA axis is regulated. Morning cortisol in your panel provides direct evidence of whether activation is at a suppressive level.';
    if (poorSleep) explanation += ` This is compounded by the sleep deficit — cortisol and poor sleep are mutually reinforcing, and addressing one typically improves the other.`;
    factors.push({ title: 'Elevated chronic stress — cortisol competition', explanation });
  }

  // 16. Keto / low-carb diet (no points — SHBG warning only)
  if (phase2.keto_diet) {
    factors.push({
      title: 'Chronic low-carb / Keto diet — SHBG elevation risk',
      explanation: 'Ketogenic and very low-carb diets have been associated with elevated SHBG in some studies — the mechanism involves carbohydrate restriction modulating insulin signaling, which regulates how much SHBG the liver produces. The evidence is real but the magnitude varies considerably between individuals. Some men on keto show no meaningful SHBG change; others do. SHBG is in your core panel — if it comes back elevated and you\'re restricting carbs significantly, that\'s one of the first variables to examine.',
    });
  }

  // 17. Medication categories
  const medCats = phase3.medication_categories || [];

  if (medCats.includes('opioids')) {
    factors.push({
      title: 'Opioid medication — opioid-induced androgen deficiency (OPIAD)',
      explanation: 'Opioid medications suppress the hypothalamic-pituitary-testicular axis by reducing LH and FSH output — the signals the brain sends to the testes to produce testosterone. This condition (OPIAD) is well-documented and affects a meaningful proportion of men on long-term opioids, though severity depends on dose, duration, and the specific opioid. LH and FSH in your panel will show whether this suppression is currently active and to what degree.',
    });
  }

  if (medCats.includes('corticosteroids')) {
    factors.push({
      title: 'Corticosteroid medication — HPT axis suppression',
      explanation: 'Corticosteroids suppress LH and FSH secretion and can compete with testosterone at the receptor level. The degree of suppression is dose- and duration-dependent — short courses at low doses typically have minimal lasting impact, while long-term or high-dose use is more consistently associated with secondary hypogonadism. LH and FSH in your panel will show whether HPT axis suppression is currently active.',
    });
  }

  if (medCats.includes('ssri_snri')) {
    factors.push({
      title: 'Antidepressant (SSRI/SNRI) — prolactin elevation risk',
      explanation: 'SSRIs and SNRIs raise prolactin in a subset of patients — the effect is drug- and dose-dependent, not universal. When prolactin is elevated, it suppresses GnRH and LH, reducing the downstream testosterone signal. Prolactin is in your panel specifically to determine whether this mechanism is active for you — the variation between individuals on the same medication is wide enough that you can\'t assume suppression without measuring it.',
    });
  }

  if (medCats.includes('statins')) {
    factors.push({
      title: 'Statin medication — CoQ10 depletion + testosterone precursor concern',
      explanation: 'Statins reduce cholesterol, which is the direct molecular precursor to all steroid hormones including testosterone. They also deplete CoQ10, which powers the mitochondria in the Leydig cells that produce testosterone. The clinical evidence for statins meaningfully reducing testosterone is mixed — some studies show a modest effect, others don\'t. Whether it\'s relevant depends on how aggressively your LDL is being managed and your baseline testosterone. It\'s a variable worth factoring into the interpretation of your results.',
    });
  }

  if (medCats.includes('androgen_blockers')) {
    factors.push({
      title: 'Androgen blocker / 5-ARI — DHT and androgen signalling impact',
      explanation: 'Finasteride, dutasteride, and similar medications reduce DHT — the most potent androgen — by blocking the enzyme that converts testosterone into it. The effect on libido and erectile function varies considerably: some men tolerate these medications without notable symptoms, while others experience significant effects that can persist after stopping. DHT in your extended panel will quantify how much conversion is being suppressed.',
    });
  }

  // 19. Supplement categories — key factors
  const suppCats = phase3.supplement_categories || [];

  if (suppCats.includes('t_boosters')) {
    factors.push({
      title: 'Testosterone booster / adaptogen use — self-optimization in progress',
      explanation: 'Taking compounds like Tongkat Ali, Fadogia Agrestis, or Ashwagandha indicates you are already attempting to optimize testosterone through supplementation. Bloodwork is essential context — it tells you whether these are working and what the actual baseline is.',
    });
  }

  if (suppCats.includes('dht_reducers')) {
    factors.push({
      title: 'DHT-reducing supplement (Saw Palmetto / Beta-sitosterol)',
      explanation: 'Saw Palmetto inhibits 5-alpha reductase — the same enzyme that finasteride targets. Chronic use can reduce DHT and affect libido, erectile function, and mood in some men, sometimes persistently. DHT is in your extended panel.',
    });
  }

  if (suppCats.includes('estrogen_modulators')) {
    factors.push({
      title: 'Estrogen modulator use (DIM / Calcium D-Glucarate)',
      explanation: 'Taking estrogen modulators suggests you may already suspect an elevated estrogen-to-testosterone ratio. Estradiol bloodwork will confirm this and determine if the intervention is appropriate.',
    });
  }

  // 20. Supplement resistance
  const hasLowLibidoOrEnergy = phase2.libido_rating <= 2 || symptoms.includes('low_energy');
  if (phase3.taking_supplements && suppCats.includes('t_support_basics') && hasLowLibidoOrEnergy) {
    factors.push({
      title: 'Supplement resistance — foundational support not resolving symptoms',
      explanation: 'You are already taking zinc, vitamin D, or magnesium — common first-line testosterone support — yet still experiencing low libido or energy. This suggests a deeper hormonal issue that warrants bloodwork rather than supplementation alone.',
    });
  }

  // 16. Flagged symptoms
  const flaggedSymptoms: { id: string; title: string; explanation: string }[] = [
    { id: 'low_libido', title: 'Low sex drive reported', explanation: 'Reduced libido is one of the strongest clinical predictors of suboptimal testosterone. It correlates with androgen levels more reliably than most other symptoms.' },
    { id: 'ed', title: 'Erectile dysfunction reported', explanation: 'Erectile function depends on testosterone, nitric oxide production, and cardiovascular health — all affected by hormonal imbalance. This is a high-priority symptom.' },
    { id: 'fat_gain', title: 'Unexplained fat gain reported', explanation: 'Accumulating fat despite unchanged diet or exercise — especially around the abdomen — is a hallmark sign of declining testosterone and worsening insulin sensitivity.' },
    { id: 'gynecomastia', title: 'Breast tissue development reported', explanation: 'Gynecomastia is almost always caused by an elevated estrogen-to-testosterone ratio. One of the clearest clinical signs of hormonal imbalance — warrants immediate bloodwork.' },
    { id: 'muscle_loss', title: 'Muscle loss or difficulty building muscle', explanation: 'Testosterone is the primary anabolic hormone. Losing muscle despite training, or being unable to build it, is a strong indicator of suboptimal androgen levels.' },
    { id: 'hot_flashes', title: 'Hot flashes or night sweats reported', explanation: 'Hot flashes in men are typically caused by estrogen fluctuation or rapid estrogen decline — the same mechanism as in menopause. This can occur with low testosterone, post-cycle, or with aromatase inhibitor use. Estradiol bloodwork is essential.' },
    { id: 'testicular_ache', title: 'Testicular discomfort reported', explanation: 'Chronic testicular pain or aching can indicate varicocele, epididymal inflammation, or primary hypogonadism — conditions where the testes themselves are compromised. LH and FSH will distinguish primary from secondary hypogonadism.' },
    { id: 'fertility_concerns', title: 'Fertility concerns reported', explanation: 'Male fertility depends on adequate LH and FSH signaling to drive sperm production, independent of testosterone levels. Fertility issues can exist even with normal testosterone — LH, FSH, and a semen analysis are the appropriate starting point. Prolactin is essential in this context: elevated prolactin silently suppresses pulsatile GnRH release, blunting the FSH signal needed for spermatogenesis. It is one of the most commonly missed causes of unexplained male infertility.' },
    { id: 'reduced_ejaculate', title: 'Reduced ejaculate volume reported', explanation: 'Ejaculate volume decline often reflects reduced testosterone and DHT driving accessory gland function (prostate and seminal vesicles), or early FSH/LH axis impairment. It correlates closely with total androgen status.' },
    { id: 'insomnia', title: 'Insomnia or poor sleep onset reported', explanation: 'Difficulty initiating or maintaining sleep is frequently linked to elevated evening cortisol — which directly suppresses the testosterone production that occurs during deep sleep stages. This creates a compounding cycle: poor sleep raises cortisol, high cortisol worsens sleep.' },
    { id: 'non_restorative', title: 'Waking unrefreshed despite adequate sleep', explanation: 'Unrefreshing sleep despite sufficient hours suggests disrupted sleep architecture — typically from elevated cortisol or undiagnosed sleep apnea. Both suppress the nocturnal testosterone surge. You may be logging hours but not achieving the deep sleep stages where testosterone is produced.' },
    { id: 'anxiety', title: 'Increased anxiety or irritability reported', explanation: 'Chronic anxiety elevates cortisol, which competes with testosterone for the same biosynthetic precursors (pregnenolone steal). Low testosterone itself also worsens mood stability and stress tolerance — the relationship is bidirectional.' },
    { id: 'afternoon_crash', title: 'Afternoon energy crashes reported', explanation: 'Afternoon crashes have many potential causes. In someone with high sedentary time and elevated sugar intake, blood glucose instability is one plausible explanation. Cortisol rhythm disruption is another — the HPA axis can produce a sharp morning cortisol peak followed by a relative afternoon depletion, which lands as an energy crash. The most common causes in the general population are simpler though: poor sleep quality, normal postprandial physiology, or inadequate protein at lunch. Morning cortisol and fasting glucose in your panel are designed to rule in or rule out the hormonal and metabolic explanations — a normal result doesn\'t mean the symptom isn\'t real, it means the cause lies elsewhere.' },
    { id: 'slow_recovery', title: 'Slow recovery from exercise reported', explanation: 'Impaired recovery from training is a hallmark of testosterone deficiency and elevated cortisol — both of which reduce the anabolic signaling required for muscle repair. Vitamin D deficiency also independently impairs recovery and is frequently overlooked.' },
    { id: 'low_energy', title: 'Persistent fatigue / low energy reported', explanation: 'Persistent low energy is reported across a wide range of conditions — low testosterone is one explanation, but thyroid dysfunction, cortisol dysregulation, vitamin D deficiency, poor sleep architecture, and B12 deficiency are equally common causes that can produce identical symptoms. The panel includes markers for each of these pathways. Until the results are in, the most accurate framing is that your energy symptoms indicate something in one or more of these systems is suboptimal — not that testosterone is the confirmed explanation.' },
    { id: 'depression', title: 'Low mood or depression reported', explanation: 'Low testosterone and low mood have a bidirectional relationship — suppressed androgens impair dopamine and serotonin signaling, and depression simultaneously elevates cortisol and prolactin, both of which suppress the hormonal axis. The direction of causality is often unclear: is the hormonal suppression driving the mood symptoms, or the reverse? The panel includes cortisol and prolactin to assess the HPA axis contribution. What the results can establish is whether a hormonal component is present — which then determines whether addressing the hormones is part of the answer.' },
    { id: 'brain_fog', title: 'Brain fog or poor concentration reported', explanation: 'Brain fog and cognitive dulling can reflect low testosterone — but they\'re also characteristic of subclinical thyroid dysfunction, elevated cortisol, B12 deficiency, and poor sleep architecture, any of which can produce identical symptoms at similar severity. The thyroid panel, cortisol, and B12 in your markers are there specifically because they\'re the most common non-hormonal mimickers. Identifying which system is responsible changes the intervention entirely.' },
    { id: 'reduced_strength', title: 'Significant strength reduction reported', explanation: 'Progressive strength loss despite consistent training is associated with androgen deficiency — testosterone drives the protein synthesis and neuromuscular efficiency that sustain strength over time. That said, strength decline also occurs with inadequate recovery, caloric deficit, overtraining, or cortisol excess acting as a catabolic signal. In the context of your other inputs, it\'s a meaningful signal to investigate — not a confirmed diagnosis of low testosterone on its own.' },
    { id: 'reduced_endurance', title: 'Reduced exercise endurance reported', explanation: 'Reduced endurance can reflect androgen deficiency — testosterone influences mitochondrial efficiency and red blood cell production, both of which affect aerobic capacity. It can equally reflect elevated cortisol suppressing aerobic recovery, iron deficiency, thyroid dysfunction, or accumulated fatigue. Cortisol is in your panel to assess the catabolic state; if cortisol and testosterone are both within range, the differential expands to non-hormonal causes.' },
    { id: 'low_motivation', title: 'Loss of drive or motivation reported', explanation: 'Loss of motivation can reflect suppressed dopamine signaling — which testosterone supports — and elevated prolactin, which directly suppresses both the testosterone axis and dopamine production. It\'s also one of the most sensitive indicators of mood dysregulation, cortisol excess, and sleep architecture disruption, independent of any hormonal component. Prolactin is in your panel to determine whether the hormonal pathway is active.' },
    { id: 'poor_memory', title: 'Poor memory or recall reported', explanation: 'Memory and recall difficulties have multiple potential drivers — testosterone, thyroid hormones, cortisol, B12, and ferritin all contribute to cognitive function through distinct mechanisms. Subclinical thyroid dysfunction is particularly worth ruling out: even mild hypothyroidism can impair working memory and word retrieval. B12 deficiency produces similar symptoms and is often overlooked in men who otherwise eat well. The thyroid panel and B12 in your markers are there to separate these causes from a testosterone-driven explanation — identifying which system is responsible changes the approach entirely.' },
  ];

  for (const s of flaggedSymptoms) {
    if (symptoms.includes(s.id)) {
      factors.push({ title: s.title, explanation: s.explanation });
    }
  }

  // Sleep apnea — only flag when poor sleep quality corroborates it.
  // Good reported quality largely rules out obstructive apnea as the active mechanism.
  if (symptoms.includes('sleep_apnea') && (phase2.sleep_quality ?? 3) <= 2) {
    factors.push({
      title: 'Snoring or suspected sleep apnea — poor sleep quality corroborates',
      explanation: 'Obstructive sleep apnea fragments the REM and deep sleep stages that drive pulsatile LH release — the primary overnight testosterone production signal. Sleep apnea is both a cause and a consequence of low testosterone, creating a self-reinforcing cycle that requires diagnosis to break. Hematocrit and cortisol are in your panel to assess downstream hormonal impact; TSH rules out hypothyroidism as a contributing cause.',
    });
  }

  return factors.slice(0, 6);
}

export function getProtectiveFactors(
  phase1: Phase1Data,
  phase2: Phase2Data,
): ProtectiveFactor[] {
  const factors: ProtectiveFactor[] = [];

  // Strong sleep profile
  if (phase2.avg_sleep_hours >= 7 && (phase2.sleep_quality ?? 3) >= 4) {
    factors.push({
      title: `Strong sleep profile (${phase2.avg_sleep_hours}h, quality ${phase2.sleep_quality}/5)`,
      explanation: 'Sleep duration and quality at this level means testosterone production is occurring across the full nocturnal LH surge window. Sleep is removed as a likely driver of any hormonal suppression.',
    });
  }

  // Strong libido
  if ((phase2.libido_rating ?? 0) >= 4) {
    factors.push({
      title: `Strong libido (${phase2.libido_rating}/5) — androgen activation likely adequate`,
      explanation: 'Libido is one of the most androgen-sensitive functions in the body. A score this high indicates androgen receptor activation in the brain is currently adequate — making profoundly low testosterone or a severely disrupted T:E2 ratio unlikely explanations for other reported symptoms.',
    });
  }

  // Good morning erections
  if (phase2.morning_erection_frequency === 'daily' || phase2.morning_erection_frequency === '4-6x_week') {
    factors.push({
      title: 'Nocturnal testosterone surge appears intact',
      explanation: 'Frequent morning erections are a direct proxy for the overnight LH-driven testosterone pulse during REM sleep. Their presence at this frequency indicates the HPT axis is producing a meaningful nocturnal testosterone surge.',
    });
  }

  // Good erectile function
  if ((phase2.erectile_rating ?? 3) >= 4) {
    factors.push({
      title: 'Erectile function within normal range',
      explanation: 'Erectile quality at this level indicates adequate nitric oxide signaling and vascular function — two systems that typically degrade early when testosterone or cardiovascular health are significantly compromised.',
    });
  }

  // Regular anabolic exercise
  if (phase2.exercise_frequency === '3-4x' || phase2.exercise_frequency === '5-6x') {
    factors.push({
      title: 'Regular training — anabolic and metabolic protection',
      explanation: 'Exercising 3+ times per week increases androgen receptor density, stimulates acute testosterone and GH release, and significantly reduces insulin resistance independent of diet. This is a meaningful counter-weight to sedentary and glycemic risk factors.',
    });
  }

  // Lean / muscular body composition
  const isLean = phase1.body_fat_percent != null && phase1.body_fat_percent < 20;
  const isMuscular = !!phase1.high_muscle_override;
  if (isLean || isMuscular) {
    const desc = isMuscular && isLean
      ? 'Muscular build with low body fat'
      : isMuscular
      ? 'Muscular build (elevated lean mass)'
      : `Lean body composition (${phase1.body_fat_percent}% body fat)`;
    factors.push({
      title: `${desc} — aromatization risk reduced`,
      explanation: 'Adipose tissue is the primary site of aromatase activity — the enzyme that converts testosterone to estrogen. Lower body fat directly reduces this conversion. The insulin resistance cascade is also less likely to be fully engaged at this body composition.',
    });
  }

  return factors;
}

// --- Weighted trigger accumulation for dynamic panel tiering ---

function addTrigger(
  triggers: Map<string, { weight: number; reasons: string[] }>,
  ids: string | string[],
  weight: number,
  reason: string,
) {
  const arr = Array.isArray(ids) ? ids : [ids];
  for (const id of arr) {
    const existing = triggers.get(id);
    if (existing) {
      existing.weight += weight;
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
    } else {
      triggers.set(id, { weight, reasons: [reason] });
    }
  }
}

const TIER_THRESHOLDS = { essential: 4, recommended: 2 } as const;

export function getPersonalizedPanel(
  phase1: Phase1Data,
  phase2: Phase2Data,
  phase3: Phase3Data,
  symptomIds: string[],
): PersonalizedPanel {
  const triggers = new Map<string, { weight: number; reasons: string[] }>();
  const symptoms = symptomIds.filter(id => id !== 'none');
  const conditions = phase1.medical_conditions || [];
  const medCats = phase3.medication_categories || [];
  const suppCats = phase3.supplement_categories || [];

  // ── CONDITION-BASED (weight 3 — clinically necessary) ──────────────

  // Past steroid/TRT → HPT axis recovery + post-cycle shadow
  if (phase3.steroid_history === 'past' || phase3.trt_history === 'past') {
    addTrigger(triggers, ['lh', 'fsh'], 3, 'Past AAS/TRT use (HPT axis recovery assessment)');
    addTrigger(triggers, ['prolactin', 'estradiol'], 3, 'Past AAS/TRT use (post-cycle shadow markers)');
  }

  // Hemochromatosis → ferritin (primary) + LH/FSH (pituitary damage)
  if (conditions.some(c => c.toLowerCase().includes('hemochromatosis'))) {
    addTrigger(triggers, 'ferritin', 3, 'Hemochromatosis diagnosis');
    addTrigger(triggers, ['lh', 'fsh'], 2, 'Hemochromatosis (pituitary iron deposition)');
  }

  // Pituitary disorder → full pituitary axis workup
  if (conditions.some(c => c.toLowerCase().includes('pituitary'))) {
    addTrigger(triggers, ['prolactin', 'lh', 'fsh'], 3, 'Pituitary disorder diagnosis');
    addTrigger(triggers, ['cortisol_am', 'tsh', 'free_t4'], 3, 'Pituitary disorder (axis assessment)');
  }

  // Liver disease → liver enzymes + estrogen clearance + vitamin D activation
  if (conditions.some(c => c.toLowerCase().includes('liver'))) {
    addTrigger(triggers, ['alt', 'ast'], 3, 'Liver disease diagnosis');
    addTrigger(triggers, 'estradiol', 2, 'Liver disease (impaired estrogen clearance)');
    addTrigger(triggers, 'vitamin_d', 1, 'Liver disease (vitamin D activation)');
  }

  // Kidney disease → HPT axis + vitamin D activation
  if (conditions.some(c => c.toLowerCase().includes('kidney'))) {
    addTrigger(triggers, ['lh', 'fsh'], 2, 'Chronic kidney disease (HPT axis)');
    addTrigger(triggers, 'vitamin_d', 2, 'Chronic kidney disease (vitamin D activation)');
  }

  // Hypothyroidism → thyroid panel tracking
  if (conditions.some(c => c.toLowerCase().includes('hypothyroidism'))) {
    addTrigger(triggers, ['tsh', 'free_t3', 'free_t4'], 3, 'Hypothyroidism diagnosis');
  }

  // Diabetes → metabolic panel
  if (conditions.some(c => c.toLowerCase().includes('diabetes'))) {
    addTrigger(triggers, 'glucose', 2, 'Diabetes diagnosis');
    addTrigger(triggers, ['fasting_insulin', 'hba1c'], 2, 'Diabetes diagnosis');
  }

  // Insulin resistance → direct markers
  if (conditions.some(c => c.toLowerCase().includes('insulin resistance'))) {
    addTrigger(triggers, ['glucose', 'fasting_insulin'], 2, 'Insulin resistance diagnosis');
  }

  // Obesity → metabolic screening
  if (conditions.some(c => c.toLowerCase().includes('obesity'))) {
    addTrigger(triggers, ['fasting_insulin', 'hba1c'], 2, 'Obesity diagnosis');
  }

  // Depression/Anxiety condition → cortisol + thyroid
  if (conditions.some(c => c.toLowerCase().includes('depression') || c.toLowerCase().includes('anxiety'))) {
    addTrigger(triggers, 'cortisol_am', 2, 'Depression/anxiety diagnosis (HPA axis)');
    addTrigger(triggers, 'tsh', 2, 'Depression/anxiety diagnosis (thyroid differential)');
  }

  // Hypertension / cardiovascular → lipid panel
  if (conditions.some(c => c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('cardiovascular'))) {
    addTrigger(triggers, ['hdl', 'ldl', 'triglycerides'], 1, 'Cardiovascular/hypertension condition');
  }

  // ── FERTILITY & SEXUAL FUNCTION (weight 2-3) ──────────────────────

  // Fertility concerns → essential fertility workup
  if (symptoms.includes('fertility_concerns')) {
    addTrigger(triggers, ['lh', 'fsh', 'prolactin'], 3, 'Fertility concerns (HPT axis + prolactin)');
  }

  // Low libido / ED → prolactin
  if (symptoms.includes('low_libido') || symptoms.includes('ed')) {
    addTrigger(triggers, 'prolactin', 2, 'Low libido / erectile dysfunction');
  }

  // Testicular ache → LH/FSH
  if (symptoms.includes('testicular_ache')) {
    addTrigger(triggers, ['lh', 'fsh'], 2, 'Testicular discomfort');
  }

  // Reduced ejaculate / hot flashes → HPT axis
  if (symptoms.includes('reduced_ejaculate')) {
    addTrigger(triggers, ['lh', 'fsh'], 1, 'Reduced ejaculate volume');
  }
  if (symptoms.includes('hot_flashes')) {
    addTrigger(triggers, ['lh', 'fsh'], 1, 'Hot flashes (HPT axis)');
    addTrigger(triggers, 'estradiol', 2, 'Hot flashes (estrogen fluctuation)');
  }

  // Vascular ED pattern: high libido + poor erections/morning erections
  const erectileRating = phase2.erectile_rating ?? 3;
  const morningErectionPoor = phase2.morning_erection_frequency === 'rarely' || phase2.morning_erection_frequency === 'never';
  if (phase2.libido_rating >= 4 && (erectileRating <= 2 || morningErectionPoor)) {
    addTrigger(triggers, ['hdl', 'ldl', 'triglycerides'], 2, 'Vascular ED pattern (lipid assessment)');
    addTrigger(triggers, 'prolactin', 1, 'Vascular ED pattern (prolactin differential)');
    if (phase2.smoking_status === 'daily' || phase2.smoking_status === 'occasional') {
      addTrigger(triggers, 'glucose', 1, 'Vascular ED + smoking (insulin sensitivity)');
    }
  }

  // ── MEDICATION-BASED (weight 2) ───────────────────────────────────

  // SSRIs → prolactin
  if (medCats.includes('ssri_snri')) {
    addTrigger(triggers, 'prolactin', 2, 'SSRI/SNRI medication (prolactin elevation risk)');
  }

  // Opioids / Corticosteroids → LH + FSH
  if (medCats.includes('opioids')) {
    addTrigger(triggers, ['lh', 'fsh'], 2, 'Opioid medication (OPIAD screening)');
  }
  if (medCats.includes('corticosteroids')) {
    addTrigger(triggers, ['lh', 'fsh'], 2, 'Corticosteroid medication (HPT suppression)');
  }

  // Statins → CoQ10 + Vitamin D
  if (medCats.includes('statins')) {
    addTrigger(triggers, 'coq10', 2, 'Statin medication (CoQ10 depletion)');
    addTrigger(triggers, 'vitamin_d', 1, 'Statin medication');
  }

  // Androgen blockers / 5-ARIs → DHT
  if (medCats.includes('androgen_blockers')) {
    addTrigger(triggers, 'dht', 2, 'Androgen blocker / 5-ARI medication');
  }

  // ── SUPPLEMENT-BASED (weight 1) ───────────────────────────────────

  if (suppCats.includes('dht_reducers')) addTrigger(triggers, 'dht', 1, 'DHT-reducing supplement use');
  if (suppCats.includes('estrogen_modulators')) addTrigger(triggers, 'estradiol', 1, 'Estrogen modulator supplement use');

  // ── LIFESTYLE-BASED (weight 1-2) ─────────────────────────────────

  // Heavy beer → estradiol
  const heavyBeer = phase2.beer_frequency === '4-6x_week' || phase2.beer_frequency === 'daily';
  if (heavyBeer) addTrigger(triggers, 'estradiol', 2, 'Heavy beer consumption (hops phytoestrogen)');

  // High body fat → estradiol
  if ((phase1.body_fat_percent ?? 0) > 25) addTrigger(triggers, 'estradiol', 2, 'Elevated body fat (aromatization risk)');

  // Heavy spirits → liver panel + lipids
  const heavySpirits = phase2.spirits_wine_frequency === '4-6x_week' || phase2.spirits_wine_frequency === 'daily';
  if (heavySpirits) {
    addTrigger(triggers, ['alt', 'ast'], 2, 'Heavy alcohol consumption (liver stress)');
    addTrigger(triggers, ['hdl', 'ldl', 'triglycerides'], 1, 'Heavy alcohol consumption (lipid impact)');
  }

  // High stress → cortisol
  if ((phase2.stress_level ?? 3) >= 4) addTrigger(triggers, 'cortisol_am', 2, 'High chronic stress level');

  // Smoking → cortisol, hematocrit, inflammation
  if (phase2.smoking_status === 'daily') {
    addTrigger(triggers, 'cortisol_am', 2, 'Daily smoking (HPT axis disruption via cortisol)');
    addTrigger(triggers, 'hematocrit', 1, 'Daily smoking (erythrocytosis risk)');
    addTrigger(triggers, 'hs_crp', 2, 'Daily smoking (systemic inflammation)');
  } else if (phase2.smoking_status === 'occasional') {
    addTrigger(triggers, 'cortisol_am', 1, 'Occasional smoking (cortisol spikes)');
  }

  // High sugar → metabolic markers
  if (phase2.sugar_consumption === 'very_high' || phase2.sugar_consumption === 'frequent') {
    addTrigger(triggers, 'glucose', 1, 'High sugar consumption');
    addTrigger(triggers, ['hba1c', 'fasting_insulin'], 1, 'High sugar (glycemic assessment)');
  }

  // Sedentary → metabolic markers
  if (phase2.sedentary_hours >= 8) {
    addTrigger(triggers, ['glucose', 'fasting_insulin'], 1, 'Sedentary lifestyle (>=8h/day)');
  }

  // ── SYMPTOM-BASED ─────────────────────────────────────────────────

  // Depression → cortisol, prolactin, thyroid, vitamin D, B12
  if (symptoms.includes('depression')) {
    addTrigger(triggers, ['cortisol_am', 'prolactin', 'tsh'], 2, 'Depression symptom');
    addTrigger(triggers, ['vitamin_d', 'vitamin_b12'], 1, 'Depression (mimicker exclusion)');
  }

  // Brain fog / poor memory → ferritin, thyroid, B12
  if (symptoms.includes('brain_fog') || symptoms.includes('poor_memory')) {
    addTrigger(triggers, 'ferritin', 1, 'Brain fog / poor memory (iron assessment)');
    addTrigger(triggers, ['tsh', 'free_t3', 'free_t4'], 2, 'Brain fog / poor memory (thyroid assessment)');
    addTrigger(triggers, 'vitamin_b12', 1, 'Brain fog / poor memory (B12 deficiency mimics low-T cognition)');
  }

  // Dry skin → thyroid
  if (symptoms.includes('dry_skin')) {
    addTrigger(triggers, ['tsh', 'free_t3', 'free_t4'], 1, 'Dry skin (thyroid differential)');
  }

  // Joint pain / slow recovery → inflammation
  if (symptoms.includes('joint_pain') || symptoms.includes('slow_recovery')) {
    addTrigger(triggers, 'hs_crp', 1, 'Joint pain / slow recovery (inflammation marker)');
  }

  // Muscle loss / reduced strength → cortisol
  if (symptoms.includes('muscle_loss') || symptoms.includes('reduced_strength')) {
    addTrigger(triggers, 'cortisol_am', 1, 'Muscle loss / reduced strength (catabolic state)');
  }

  // Sleep apnea → cortisol, thyroid, hematocrit
  if (symptoms.includes('sleep_apnea')) {
    addTrigger(triggers, 'cortisol_am', 1, 'Sleep apnea symptom');
    addTrigger(triggers, 'tsh', 1, 'Sleep apnea (hypothyroidism differential)');
    addTrigger(triggers, 'hematocrit', 1, 'Sleep apnea (polycythemia risk)');
  }

  // Poor sleep quality (≤2/5) → cortisol regardless of symptoms
  if ((phase2.sleep_quality ?? 3) <= 2) {
    addTrigger(triggers, 'cortisol_am', 2, 'Poor sleep quality (HPA axis / cortisol dysregulation)');
  }

  // Insomnia / non-restorative / afternoon crash → cortisol
  if (symptoms.includes('insomnia') || symptoms.includes('non_restorative')) {
    addTrigger(triggers, 'cortisol_am', 1, 'Sleep disruption');
  }
  if (symptoms.includes('afternoon_crash')) {
    addTrigger(triggers, 'cortisol_am', 2, 'Afternoon energy crashes (HPA axis depletion pattern)');
    addTrigger(triggers, ['glucose', 'fasting_insulin'], 1, 'Afternoon crashes (glycemic assessment)');
  }

  // Reduced endurance → cortisol (catabolic state)
  if (symptoms.includes('reduced_endurance')) {
    addTrigger(triggers, 'cortisol_am', 1, 'Reduced endurance (catabolic hormonal state)');
  }

  // Hair loss / finasteride → DHT
  if (
    symptoms.includes('hair_loss') ||
    (phase3.medications || []).some(m => m.toLowerCase().includes('finasteride') || m.toLowerCase().includes('dutasteride'))
  ) {
    addTrigger(triggers, 'dht', 2, 'Hair loss / finasteride use');
  }

  // Anxiety → cortisol, prolactin, thyroid (full panel — TSH alone is incomplete)
  if (symptoms.includes('anxiety')) {
    addTrigger(triggers, 'cortisol_am', 2, 'Anxiety (HPA axis overactivation)');
    addTrigger(triggers, 'prolactin', 1, 'Anxiety (GnRH suppression link)');
    addTrigger(triggers, ['tsh', 'free_t3', 'free_t4'], 1, 'Anxiety (hyperthyroidism differential)');
  }

  // Low motivation → prolactin
  if (symptoms.includes('low_motivation')) {
    addTrigger(triggers, 'prolactin', 1, 'Low motivation (dopamine-prolactin link)');
  }

  // Energy / recovery / joints → vitamin D + B12
  if (symptoms.includes('slow_recovery') || symptoms.includes('joint_pain') || symptoms.includes('low_energy')) {
    addTrigger(triggers, 'vitamin_d', 1, 'Recovery / energy / joint symptoms');
  }
  if (symptoms.includes('low_energy')) {
    addTrigger(triggers, 'vitamin_b12', 1, 'Low energy (B12 deficiency mimics low-T fatigue)');
  }

  // Gynecomastia → estradiol
  if (symptoms.includes('gynecomastia')) {
    addTrigger(triggers, 'estradiol', 2, 'Gynecomastia (estrogen assessment)');
  }

  // ── SAFETY BASELINE ───────────────────────────────────────────────

  addTrigger(triggers, 'estradiol', 2, 'T:E2 ratio requires estradiol — core to any testosterone analysis');
  addTrigger(triggers, ['lh', 'fsh'], 2, 'LH/FSH required to distinguish primary vs secondary hypogonadism — core to any testosterone analysis');
  addTrigger(triggers, 'prolactin', 2, 'Prolactin silently suppresses testosterone — core screen for any testosterone analysis');
  addTrigger(triggers, 'vitamin_d', 2, 'Vitamin D receptors on Leydig cells — deficiency directly impairs testosterone synthesis');
  addTrigger(triggers, 'tsh', 2, 'Thyroid function affects SHBG and free testosterone — core hormonal screen');
  addTrigger(triggers, 'hematocrit', 1, 'Safety baseline');
  addTrigger(triggers, 'albumin', 1, 'Backup free T calculation (Vermeulen equation) if Free T is not directly measured');

  // ── BUILD TIERED RESULT ───────────────────────────────────────────

  const essential: TieredMarker[] = [];
  const recommended: TieredMarker[] = [];
  const extended: TieredMarker[] = [];

  // Always-essential triad
  for (const id of ALWAYS_ESSENTIAL_IDS) {
    essential.push({ id, tier: 'essential', reasons: ['Testosterone triad — always required'] });
  }

  // Assign tiers based on accumulated weights
  for (const [id, { weight, reasons }] of triggers) {
    if (ALWAYS_ESSENTIAL_IDS.includes(id)) continue; // Already in essential
    if (weight >= TIER_THRESHOLDS.essential) {
      essential.push({ id, tier: 'essential', reasons });
    } else if (weight >= TIER_THRESHOLDS.recommended) {
      recommended.push({ id, tier: 'recommended', reasons });
    } else {
      extended.push({ id, tier: 'extended', reasons });
    }
  }

  const allIds = [
    ...essential.map(m => m.id),
    ...recommended.map(m => m.id),
    ...extended.map(m => m.id),
  ];

  return { essential, recommended, extended, allIds };
}

