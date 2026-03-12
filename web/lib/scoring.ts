import { SYMPTOMS } from '../constants/symptoms';
import type { Phase1Data, Phase2Data, Phase3Data } from '../types';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface KeyFactor {
  title: string;
  explanation: string;
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

  // --- Phase 2: Lifestyle (max 25) ---
  let p2 = 0;

  // Sleep hours
  let sleepPts = 0;
  if (phase2.avg_sleep_hours < 5) sleepPts = 15;
  else if (phase2.avg_sleep_hours < 6) sleepPts = 10;
  else if (phase2.avg_sleep_hours < 7) sleepPts = 5;
  else if (phase2.avg_sleep_hours < 8) sleepPts = 2;

  // Sleep quality modifier: low quality amplifies sleep risk, high quality reduces it
  if (phase2.sleep_quality <= 2) sleepPts = Math.round(sleepPts * 1.2);
  else if (phase2.sleep_quality >= 4) sleepPts = Math.max(0, sleepPts - 3);
  p2 += sleepPts;

  // Beer (penalized more — hops phytoestrogens)
  const beerScore: Record<string, number> = { never: 0, '1-2x_week': 2, '3x_week': 5, '4-6x_week': 10, daily: 15 };
  p2 += beerScore[phase2.beer_frequency] ?? 0;

  // Spirits / wine
  const spiritsScore: Record<string, number> = { never: 0, '1-2x_week': 2, '3x_week': 4, '4-6x_week': 8, daily: 12 };
  p2 += spiritsScore[phase2.spirits_wine_frequency] ?? 0;

  // Smoking
  if (phase2.smoking_status === 'daily') p2 += 10;
  else if (phase2.smoking_status === 'occasional') p2 += 5;

  // Sugar consumption
  if (phase2.sugar_consumption === 'very_high') p2 += 10;
  else if (phase2.sugar_consumption === 'frequent') p2 += 6;
  else if (phase2.sugar_consumption === 'moderate') p2 += 3;

  // Sedentary hours
  if (phase2.sedentary_hours >= 10) p2 += 8;
  else if (phase2.sedentary_hours >= 7) p2 += 5;
  else if (phase2.sedentary_hours >= 4) p2 += 2;

  // Stress — pregnenolone steal: cortisol production competes with testosterone synthesis
  if (phase2.stress_level >= 5) p2 += 10;
  else if (phase2.stress_level >= 4) p2 += 6;

  // Coffee
  if (phase2.coffee_per_day === '6+') p2 += 4;
  else if (phase2.coffee_per_day === '4-5') p2 += 2;

  // Exercise — Goldilocks scoring
  if (phase2.exercise_frequency === 'none') p2 += 10;
  else if (phase2.exercise_frequency === '3-4x' || phase2.exercise_frequency === '5-6x') p2 = Math.max(0, p2 - 5);
  else if (phase2.exercise_frequency === 'daily') p2 += 5; // overtraining risk

  // Morning erections — direct proxy for nocturnal testosterone surge (updated weights)
  const mefScore: Record<string, number> = { daily: 0, '4-6x_week': 4, '2-3x_week': 10, rarely: 15, never: 18 };
  p2 += mefScore[phase2.morning_erection_frequency] ?? 0;

  // Libido rating slider (≤2 = clinically significant suppression)
  if (phase2.libido_rating <= 2) p2 += 15;

  // Erectile quality slider (≤2 = clinically significant dysfunction)
  if ((phase2.erectile_rating ?? 3) <= 2) p2 += 15;

  const p2_capped = Math.min(p2, 25);

  // --- Phase 3: Medical History (max 35) ---
  let p3 = 0;
  const conditions = phase1.medical_conditions || [];

  if (conditions.some(c => c.toLowerCase().includes('sleep apnea'))) p3 += 12;
  if (conditions.some(c => c.toLowerCase().includes('diabetes') || c.toLowerCase().includes('insulin resistance'))) p3 += 10;
  if (conditions.some(c => c.toLowerCase().includes('testicular'))) p3 += 8;
  if (conditions.some(c => c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('cardiovascular'))) p3 += 5;
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

  // Supplement resistance: taking foundational T-support but still low libido/energy
  const symptoms = symptomIds.filter(id => id !== 'none');
  const suppCats = phase3.supplement_categories || [];
  const hasLowLibidoOrEnergy = phase2.libido_rating <= 2 || symptoms.includes('low_energy');
  if (phase3.taking_supplements && suppCats.includes('t_support_basics') && hasLowLibidoOrEnergy) p3 += 5;

  const p3_capped = Math.min(p3, 35);

  // --- Phase 4: Symptoms (max 40) ---
  const primaryWeights: Record<string, number> = { low_libido: 15, ed: 15, fat_gain: 10 };

  let p4 = 0;
  const secondaryCount = symptoms.filter(id => !(id in primaryWeights)).length;
  for (const id of symptoms) {
    p4 += primaryWeights[id] ?? 0;
  }
  p4 += secondaryCount * 5;

  const p4_capped = Math.min(p4, 40);

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
    case 'critical': return '#FF5252';
    case 'high': return '#FF8C00';
    case 'moderate': return '#FFB300';
    case 'low': return '#00E676';
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

  // 1. Sleep
  const highCoffee = phase2.coffee_per_day === '4-5' || phase2.coffee_per_day === '6+';
  const highStress = (phase2.stress_level ?? 3) >= 4;

  if (phase2.avg_sleep_hours < 6) {
    let explanation = `Sleeping less than 6 hours reduces testosterone by 10–15% within a single week. This is one of the most significant and reversible risk factors you have.`;
    if (highCoffee && highStress) explanation += ` With ${phase2.coffee_per_day} coffees/day and high chronic stress, both late caffeine and elevated cortisol are likely compressing your sleep — addressing all three together will have a compounding effect.`;
    else if (highCoffee) explanation += ` With ${phase2.coffee_per_day} coffees/day, late caffeine intake is likely a direct contributor — caffeine has a 5–6 hour half-life and significantly delays sleep onset and reduces deep sleep.`;
    else if (highStress) explanation += ` Chronic stress at your reported level elevates cortisol into the evening, which actively suppresses melatonin and fragments deep sleep — making stress management a prerequisite for sleep improvement.`;
    factors.push({ title: `Sleep deprivation (${phase2.avg_sleep_hours}h average)`, explanation });
  } else if (phase2.avg_sleep_hours < 7) {
    let explanation = `Most testosterone is produced during deep sleep stages. Consistently sleeping under 7 hours measurably suppresses your nocturnal T production surge.`;
    if (highCoffee) explanation += ` Your coffee intake (${phase2.coffee_per_day}/day) may be reducing sleep quality even if it doesn't shorten duration — caffeine suppresses deep sleep stages where testosterone production peaks.`;
    else if (highStress) explanation += ` High stress raises evening cortisol, which competes with the hormonal recovery that happens during deep sleep — reducing the actual quality of the hours you do get.`;
    factors.push({ title: `Suboptimal sleep (${phase2.avg_sleep_hours}h average)`, explanation });
  }

  // 2. Beer
  if (phase2.beer_frequency === 'daily' || phase2.beer_frequency === '4-6x_week') {
    factors.push({
      title: `Heavy beer consumption (${phase2.beer_frequency.replace(/_/g, ' ')})`,
      explanation: 'Beer contains phytoestrogens from hops that raise estrogen while suppressing testosterone. Daily or near-daily intake creates a significant hormonal imbalance.',
    });
  } else if (phase2.beer_frequency === '3x_week') {
    factors.push({
      title: 'Frequent beer use (3x/week)',
      explanation: 'Regular beer intake introduces hops-derived phytoestrogens and alcohol, both of which suppress testosterone and elevate estrogen over time.',
    });
  }

  // 3. Spirits / wine
  if (phase2.spirits_wine_frequency === 'daily' || phase2.spirits_wine_frequency === '4-6x_week') {
    factors.push({
      title: `High spirits/wine consumption (${phase2.spirits_wine_frequency.replace(/_/g, ' ')})`,
      explanation: 'Frequent alcohol consumption disrupts sleep architecture, increases cortisol, and directly suppresses Leydig cell testosterone production.',
    });
  }

  // 4. Smoking
  if (phase2.smoking_status === 'daily') {
    factors.push({
      title: 'Daily smoking',
      explanation: 'Chronic nicotine exposure disrupts the HPT axis, elevates cortisol, and impairs Leydig cell function — measurably reducing testosterone over time.',
    });
  } else if (phase2.smoking_status === 'occasional') {
    factors.push({
      title: 'Occasional smoking',
      explanation: 'Even intermittent smoking introduces oxidative stress and cortisol spikes that affect testosterone production and androgen receptor sensitivity.',
    });
  }

  // 5. Morning erections
  if (phase2.morning_erection_frequency === 'never') {
    factors.push({
      title: 'Absent morning erections',
      explanation: 'Morning erections are driven by the nocturnal testosterone surge during REM sleep. Their complete absence is one of the most objective clinical indicators of suppressed androgen levels and warrants investigation.',
    });
  } else if (phase2.morning_erection_frequency === 'rarely') {
    factors.push({
      title: 'Rare morning erections',
      explanation: 'Morning erections reflect the quality of your testosterone surge during sleep. Occurring rarely (less than once a week) is a strong signal of suboptimal androgen production.',
    });
  }

  // 6. Sedentary
  const highSugar = phase2.sugar_consumption === 'very_high' || phase2.sugar_consumption === 'frequent';
  if (phase2.sedentary_hours >= 10) {
    let explanation = 'Prolonged sitting is independently associated with reduced testosterone and elevated insulin resistance — even in men who exercise.';
    if (highSugar) explanation += ` Combined with your high sugar intake, this creates a compounding insulin resistance loop: inactivity reduces glucose uptake, sugar spikes insulin further, and chronic high insulin directly suppresses testosterone synthesis and accelerates aromatization of T to estrogen.`;
    factors.push({ title: `Highly sedentary lifestyle (${phase2.sedentary_hours}h/day)`, explanation });
  } else if (phase2.sedentary_hours >= 7) {
    let explanation = 'Extended daily sitting impairs circulation and metabolic health, reducing the effectiveness of testosterone synthesis.';
    if (highSugar) explanation += ` With frequent sugar consumption on top of this, insulin sensitivity is likely impaired — elevated insulin promotes fat storage and aromatase activity, converting more of your testosterone to estrogen.`;
    factors.push({ title: `Moderately sedentary (${phase2.sedentary_hours}h/day)`, explanation });
  }

  // 7. Exercise (no exercise)
  if (phase2.exercise_frequency === 'none') {
    factors.push({
      title: 'No regular exercise',
      explanation: 'Physical activity is one of the most powerful natural testosterone stimulators. Men who do not exercise have significantly lower baseline testosterone than those who train consistently.',
    });
  }

  // 8. Sugar
  if (phase2.sugar_consumption === 'very_high') {
    factors.push({
      title: 'Very high sugar consumption',
      explanation: 'Chronic high sugar intake drives insulin resistance, which directly suppresses testosterone synthesis and elevates SHBG — reducing both total and free testosterone.',
    });
  }

  // 9. Age
  if (phase1.age >= 45) {
    factors.push({
      title: `Age ${phase1.age} — accelerated decline phase`,
      explanation: 'Testosterone declines 1–2% per year after 30. By your mid-40s this cumulative loss is clinically significant — making bloodwork essential to know where you stand.',
    });
  } else if (phase1.age >= 35) {
    factors.push({
      title: `Age ${phase1.age} — natural decline has begun`,
      explanation: 'Testosterone naturally begins declining in the mid-30s. Optimizing your lifestyle now can significantly slow this decline.',
    });
  }

  // 10. Body fat
  if (phase1.body_fat_percent && phase1.body_fat_percent >= 25) {
    factors.push({
      title: `Elevated body fat (${phase1.body_fat_percent}%) — aromatization risk`,
      explanation: 'Fat tissue converts testosterone into estrogen via aromatase. At 25%+ body fat, this conversion is significant enough to measurably reduce both total and free testosterone.',
    });
  } else if (!phase1.body_fat_percent && phase1.height_cm && phase1.weight_kg) {
    const bmi = phase1.weight_kg / Math.pow(phase1.height_cm / 100, 2);
    if (bmi >= 30) {
      factors.push({
        title: 'Elevated body weight — aromatization risk',
        explanation: 'Fat tissue contains aromatase, which converts testosterone into estrogen. The more body fat you carry, the more testosterone is converted — reducing both total and free T.',
      });
    } else if (bmi >= 25) {
      factors.push({
        title: 'Slightly elevated BMI',
        explanation: 'Even moderately elevated body fat increases aromatization. Reducing body fat is one of the most impactful testosterone interventions.',
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
        explanation: 'Anabolic steroid use suppresses the HPT axis. Without post-cycle therapy, natural testosterone production may still be significantly impaired or never fully recovered. LH and FSH will reveal whether the axis has restarted.',
      });
    } else {
      factors.push({
        title: `Prior anabolic steroid use${agoDisplay}`,
        explanation: 'Previous steroid use suppresses the HPT axis. Depending on cycle count and time since stopping, your natural production may still be in recovery. LH and FSH are essential to assess axis status.',
      });
    }
  }

  // 13. Libido slider
  if (phase2.libido_rating <= 2) {
    factors.push({
      title: `Very low libido reported (${phase2.libido_rating}/5)`,
      explanation: 'A libido score this low is a strong clinical signal of androgen insufficiency. Sexual drive is one of the most testosterone-sensitive functions in the male body.',
    });
  }

  // 14. Erectile quality slider
  if ((phase2.erectile_rating ?? 3) <= 2) {
    factors.push({
      title: `Poor erectile quality reported (${phase2.erectile_rating ?? '?'}/5)`,
      explanation: 'Erectile dysfunction at this severity implicates both androgen levels and vascular health. Testosterone, nitric oxide signaling, and cardiovascular status all contribute.',
    });
  }

  // 15. Stress
  const poorSleep = phase2.avg_sleep_hours < 7;
  if ((phase2.stress_level ?? 3) >= 5) {
    let explanation = 'At this stress level, your body is likely diverting pregnenolone — the shared precursor to both cortisol and testosterone — almost entirely toward cortisol production. This is one of the most underdiagnosed causes of hormonal suppression in otherwise healthy men.';
    if (poorSleep) explanation += ` The interaction with your sleep deprivation creates a vicious cycle: high cortisol degrades sleep quality, and poor sleep raises cortisol further — continuously draining your testosterone precursor pool from both directions.`;
    factors.push({ title: 'Severe chronic stress — pregnenolone steal', explanation });
  } else if ((phase2.stress_level ?? 3) >= 4) {
    let explanation = 'Sustained high stress elevates cortisol, which competes with testosterone for the same biochemical precursors. Chronically elevated cortisol directly suppresses LH signaling and testosterone production.';
    if (poorSleep) explanation += ` This is compounded by your sleep deficit — cortisol and poor sleep are mutually reinforcing, and breaking one often improves the other significantly.`;
    factors.push({ title: 'High chronic stress — cortisol competition', explanation });
  }

  // 16. Keto / low-carb diet (no points — SHBG warning only)
  if (phase2.keto_diet) {
    factors.push({
      title: 'Chronic low-carb / Keto diet — SHBG elevation risk',
      explanation: 'Prolonged ketogenic dieting significantly raises SHBG — the protein that binds testosterone and makes it unavailable to tissues. Your total testosterone may appear normal while free (active) testosterone is suppressed. SHBG is in your core panel.',
    });
  }

  // 17. Medication categories
  const medCats = phase3.medication_categories || [];

  if (medCats.includes('opioids')) {
    factors.push({
      title: 'Opioid medication — opioid-induced androgen deficiency (OPIAD)',
      explanation: 'Opioids directly suppress the hypothalamic-pituitary-testicular axis, reducing LH and FSH output — the hormones that signal testosterone production. OPIAD affects the majority of men on long-term opioids and is severely underdiagnosed.',
    });
  }

  if (medCats.includes('corticosteroids')) {
    factors.push({
      title: 'Corticosteroid medication — HPT axis suppression',
      explanation: 'Corticosteroids like prednisone suppress LH and FSH secretion and compete with testosterone at the receptor level. Chronic use is one of the most reliable pharmacological causes of secondary hypogonadism.',
    });
  }

  if (medCats.includes('ssri_snri')) {
    factors.push({
      title: 'Antidepressant (SSRI/SNRI) — prolactin elevation risk',
      explanation: 'SSRIs and SNRIs raise prolactin levels. Elevated prolactin suppresses GnRH and LH — the signals that drive testosterone production. This drug-hormone interaction is frequently missed in standard care.',
    });
  }

  if (medCats.includes('statins')) {
    factors.push({
      title: 'Statin medication — CoQ10 depletion + testosterone precursor concern',
      explanation: 'Statins lower cholesterol — the direct molecular precursor to testosterone — and deplete CoQ10, which powers the mitochondria in Leydig cells. Long-term statin use correlates with measurably lower testosterone in some men.',
    });
  }

  if (medCats.includes('androgen_blockers')) {
    factors.push({
      title: 'Androgen blocker / 5-ARI — DHT and androgen signalling impact',
      explanation: 'Finasteride, dutasteride, and spironolactone reduce DHT or block androgen receptors directly. Their effect on libido, erectile function, and body composition can persist well beyond the treatment period in some men.',
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
  ];

  for (const s of flaggedSymptoms) {
    if (symptoms.includes(s.id)) {
      factors.push({ title: s.title, explanation: s.explanation });
    }
  }

  return factors.slice(0, 6);
}

export function getPersonalizedExtendedTests(
  phase1: Phase1Data,
  phase2: Phase2Data,
  phase3: Phase3Data,
  symptomIds: string[]
): string[] {
  const tests = new Set<string>();
  const symptoms = symptomIds.filter(id => id !== 'none');
  const conditions = phase1.medical_conditions || [];

  // Estradiol: heavy beer OR elevated body fat
  const heavyBeer = phase2.beer_frequency === '4-6x_week' || phase2.beer_frequency === 'daily';
  const highBodyFat = (phase1.body_fat_percent ?? 0) > 25;
  if (heavyBeer || highBodyFat) tests.add('estradiol');

  // LH + FSH: past steroid use (HPT axis assessment)
  if (phase3.steroid_history === 'past') {
    tests.add('lh');
    tests.add('fsh');
  }

  // Hemochromatosis → ferritin (primary marker) + LH/FSH (assess pituitary damage)
  if (conditions.some(c => c.toLowerCase().includes('hemochromatosis'))) {
    tests.add('ferritin');
    tests.add('lh');
    tests.add('fsh');
  }

  // Pituitary disorder → prolactin (adenomas often prolactin-secreting) + LH/FSH + cortisol_am (ACTH axis) + thyroid (pituitary controls TSH)
  if (conditions.some(c => c.toLowerCase().includes('pituitary'))) {
    tests.add('prolactin');
    tests.add('lh');
    tests.add('fsh');
    tests.add('cortisol_am');
    tests.add('tsh');
    tests.add('free_t4');
  }

  // Liver disease → estradiol (impaired estrogen clearance) + vitamin_d (liver activates vitamin D)
  if (conditions.some(c => c.toLowerCase().includes('liver'))) {
    tests.add('estradiol');
    tests.add('vitamin_d');
  }

  // Chronic kidney disease → LH/FSH (HPT axis suppression assessment) + vitamin_d (kidney activates vitamin D)
  if (conditions.some(c => c.toLowerCase().includes('kidney'))) {
    tests.add('lh');
    tests.add('fsh');
    tests.add('vitamin_d');
  }

  const medCats = phase3.medication_categories || [];

  // Prolactin: low libido OR ED symptom OR depression/anxiety condition OR SSRIs
  if (
    symptoms.includes('low_libido') ||
    symptoms.includes('ed') ||
    conditions.some(c => c.toLowerCase().includes('depression') || c.toLowerCase().includes('anxiety')) ||
    medCats.includes('ssri_snri')
  ) {
    tests.add('prolactin');
  }

  // Statins → CoQ10 + Vitamin D
  if (medCats.includes('statins')) {
    tests.add('coq10');
    tests.add('vitamin_d');
  }

  // Opioids + Corticosteroids → LH + FSH (HPT axis suppression)
  if (medCats.includes('opioids') || medCats.includes('corticosteroids')) {
    tests.add('lh');
    tests.add('fsh');
  }

  // Androgen blockers / 5-ARIs → DHT
  if (medCats.includes('androgen_blockers')) {
    tests.add('dht');
  }

  // Supplement categories
  const suppCats = phase3.supplement_categories || [];
  // DHT reducers (Saw Palmetto etc.) → DHT (same mechanism as finasteride)
  if (suppCats.includes('dht_reducers')) tests.add('dht');
  // Estrogen modulators (DIM etc.) → Estradiol (user suspects estrogen imbalance)
  if (suppCats.includes('estrogen_modulators')) tests.add('estradiol');

  // TSH + Free T3 + Free T4: brain fog, depression symptoms, OR hypothyroidism condition
  if (
    symptoms.includes('brain_fog') ||
    symptoms.includes('depression') ||
    conditions.some(c => c.toLowerCase().includes('hypothyroidism'))
  ) {
    tests.add('tsh');
    tests.add('free_t3');
    tests.add('free_t4');
  }

  // DHT: hair loss or 5-alpha reductase inhibitor use
  if (
    symptoms.includes('hair_loss') ||
    (phase3.medications || []).some(m => m.toLowerCase().includes('finasteride') || m.toLowerCase().includes('dutasteride'))
  ) {
    tests.add('dht');
  }

  // Glucose + Fasting Insulin: diabetes condition, very high sugar, OR highly sedentary
  // High sedentary hours is an independent driver of insulin resistance
  if (
    conditions.some(c => c.toLowerCase().includes('diabetes')) ||
    phase2.sugar_consumption === 'very_high' ||
    phase2.sedentary_hours >= 10
  ) {
    tests.add('glucose');
  }
  if (phase2.sedentary_hours >= 10) {
    tests.add('fasting_insulin');
  }

  // Fasting Insulin + HbA1c: obesity condition
  if (conditions.some(c => c.toLowerCase().includes('obesity'))) {
    tests.add('fasting_insulin');
    tests.add('hba1c');
  }

  // Lipid panel: hypertension or cardiovascular disease condition
  if (conditions.some(c => c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('cardiovascular'))) {
    tests.add('hdl');
    tests.add('ldl');
    tests.add('triglycerides');
  }

  // Vascular correlation: high libido rating BUT poor erectile quality OR rare morning erections
  // → suggests vascular rather than hormonal cause → add lipid panel + prolactin
  const erectileRating = phase2.erectile_rating ?? 3;
  const morningErectionPoor = phase2.morning_erection_frequency === 'rarely' || phase2.morning_erection_frequency === 'never';
  if (phase2.libido_rating >= 4 && (erectileRating <= 2 || morningErectionPoor)) {
    tests.add('hdl');
    tests.add('ldl');
    tests.add('triglycerides');
    tests.add('prolactin');
  }

  // Morning Cortisol: high stress (pregnenolone steal)
  if ((phase2.stress_level ?? 3) >= 4) {
    tests.add('cortisol_am');
  }

  // Hematocrit: always include as safety baseline
  tests.add('hematocrit');

  return Array.from(tests);
}
