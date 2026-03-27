import type { Phase1Data, Phase2Data, Phase3Data } from '@/types';

// Sanitize values before injecting into the prompt
function san(val: unknown, maxLen = 150): string {
  if (val == null) return '';
  return String(val).replace(/[\u0000-\u001F\u007F-\u009F`]/g, '').trim().slice(0, maxLen);
}
function sanArr(arr: unknown[] | null | undefined, maxLen = 80): string {
  if (!Array.isArray(arr) || !arr.length) return 'none';
  return arr.map(v => san(v, maxLen)).filter(Boolean).join(', ') || 'none';
}

export interface AnalysisPromptParams {
  riskScore: number | null;
  riskLevel: string | null;
  bmi: string;
  phase1: Phase1Data;
  phase2: Phase2Data;
  phase3: Phase3Data;
  symptomNames: string;
  biomarkerContext: string;
  vermeulenNote: string;
  computedRatiosContext: string;
}

export interface SynthesisPromptParams extends AnalysisPromptParams {
  pass1Result: string;
}

/* ── Shared patient data section used by both passes ── */
function buildPatientData(p: AnalysisPromptParams): string {
  const { riskScore, riskLevel, bmi, phase1, phase2, phase3, symptomNames, biomarkerContext, vermeulenNote, computedRatiosContext } = p;

  return `ONBOARDING RISK ASSESSMENT:
- Initial risk score: ${riskScore != null ? `${riskScore}/100 — ${riskLevel} risk` : 'N/A'}
- This score reflects demographics, lifestyle, medical history, and symptoms assessed BEFORE bloodwork. Use it as prior probability when interpreting results.

PATIENT PROFILE:
- Age: ${phase1?.age ?? 'unknown'}
- BMI: ${bmi}${phase1?.body_fat_percent ? `, Body fat: ${phase1.body_fat_percent}%` : ''}${phase1?.high_muscle_override ? ' (high muscle mass — elevated BMI reflects muscle, not fat)' : ''}
- Medical conditions: ${sanArr(phase1?.medical_conditions)}

LIFESTYLE:
- Sleep: ${phase2?.avg_sleep_hours ?? '?'}h/night, quality ${phase2?.sleep_quality ?? '?'}/5
- Exercise: ${phase2?.exercise_frequency ?? 'unknown'}${phase2?.exercise_types?.length ? ` (${sanArr(phase2.exercise_types)})` : ''}
- Sedentary hours/day: ${phase2?.sedentary_hours ?? 'unknown'}
- Stress level: ${phase2?.stress_level ?? 'unknown'}/5
- Beer/cider: ${phase2?.beer_frequency ?? 'unknown'} (hops = potent dietary phytoestrogen via 8-prenylnaringenin)
- Spirits/wine: ${phase2?.spirits_wine_frequency ?? 'unknown'}
- Smoking: ${phase2?.smoking_status ?? 'unknown'}
- Coffee/day: ${phase2?.coffee_per_day ?? 'unknown'}
- Sugar consumption: ${phase2?.sugar_consumption ?? 'unknown'}
- Keto/low-carb diet: ${phase2?.keto_diet ? 'yes' : 'no'}

SEXUAL HEALTH:
- Morning erections: ${phase2?.morning_erection_frequency ?? 'unknown'}
- Libido: ${phase2?.libido_rating ?? 'unknown'}/5
- Erectile function: ${phase2?.erectile_rating ?? 'unknown'}/5

MEDICAL HISTORY:
- Steroid history: ${phase3?.steroid_history ?? 'never'}${phase3?.steroid_history === 'past' ? ` — stopped ${phase3?.steroid_stopped_ago ?? 'unknown'}, ${phase3?.steroid_cycle_count ?? 'unknown'} cycle(s), PCT: ${phase3?.steroid_pct ? 'yes' : 'no'}` : ''}
- TRT history: ${phase3?.trt_history ?? 'never'}${phase3?.trt_history !== 'never' && phase3?.trt_type ? ` (${phase3.trt_type})` : ''}
- Medication categories: ${sanArr(phase3?.medication_categories)}
- Medications: ${sanArr(phase3?.medications)}
- Supplement categories: ${sanArr(phase3?.supplement_categories)}
- Supplements: ${sanArr(phase3?.supplements)}

SYMPTOMS:
- ${symptomNames}

BLOODWORK VALUES:
${biomarkerContext}${vermeulenNote}

COMPUTED RATIOS (pre-calculated server-side — do not recalculate; use these values and status labels directly in your analysis):
${computedRatiosContext}`;
}

/* ═══════════════════════════════════════════════════════
   PASS 1 — Detailed marker-by-marker analysis
   ═══════════════════════════════════════════════════════ */

export function buildPass1Prompt(p: AnalysisPromptParams): string {
  return `### ROLE
You are a Senior Consultant Endocrinologist and Clinical Pathologist specializing in men's hormonal health, conducting a private case review. You have this patient's complete intake file — demographics, lifestyle, medical history, symptoms, and bloodwork. Your analysis must demonstrate that you have read every line of it. Generic analysis is unacceptable.

### MANDATORY RULES
1. CITE PATIENT DATA: Every explanation, interpretation, and concern MUST reference specific values from the patient's intake. Say "your 4 cups of coffee per day" not "caffeine intake". Say "your SHBG at 58 nmol/L" not "elevated SHBG". Say "your 6h sleep at quality 2/5" not "suboptimal sleep".
2. FORBIDDEN VAGUENESS: Never use "targeted supplementation", "lifestyle modifications", "hormonal optimization", "consider addressing", or any phrase that could apply to any patient. Every statement must be specific to THIS patient.
3. FORBIDDEN WORDS: "aggressive", "severe", "severely", "critical", "bottlenecked", "disastrous", "biological narrative", "wellness strategist", "warrior", "synthesis", "working harder", "working overtime".
4. QUANTIFY EVERYTHING: Recommendations must include specific numbers — doses in mg, durations in weeks, frequencies per day, target ranges to aim for.
5. CONNECT THE CHAIN: When a lifestyle factor drives a biomarker, spell out the full physiological chain AND explain what it means in plain language. Example: "Your 8 sedentary hours/day keeps insulin elevated, which activates an enzyme called aromatase — this converts your testosterone into estradiol. That is why your estradiol is at 42 pg/mL despite having decent testosterone levels. In practical terms, your body is turning its own testosterone into estrogen because of how much time you spend sitting."
6. EXPLAIN THE WHY: Every mechanism must be accompanied by a plain-language explanation of what it means for the patient's body. Do not assume the reader knows what SHBG does, what aromatase is, or why LH matters. Briefly explain each concept when first introduced — not with textbook definitions, but with functional analogies. Example: "SHBG is a protein that locks testosterone into an unusable form — your cells cannot access it" or "LH is the signal from your brain telling your testes to produce testosterone — when this signal is weak, production drops."
7. TONE: Professional but direct. Write as if explaining to an intelligent patient who has no medical background. Use active voice. Make every sentence answer the question "so what does this mean for me?"
8. INCOMPLETE PANELS: The patient may submit as few as 3 biomarkers. Only analyze markers that are present in the bloodwork data — do not assume or infer values for missing markers. When a clinically important marker is absent (e.g., LH/FSH missing when testosterone is low), flag it explicitly as a diagnostic gap with a recommendation to test it. Do not silently skip the gap.
9. SUPPLEMENT AWARENESS: Check the patient's current supplements and supplement categories before recommending any supplement. If they already take a relevant supplement (e.g., Zinc, Vitamin D, Ashwagandha), acknowledge it and assess whether the dose or timing should be adjusted rather than recommending it as if new. Never recommend something the patient is already taking without acknowledging it.
10. CLINICAL LANGUAGE: Use the status labels from COMPUTED RATIOS — they are pre-calculated and already classified. Describe biological processes, not condition names. Say "your HOMA-IR of 3.67 is a RISK INDICATOR consistent with an insulin resistance pattern" rather than "you have insulin resistance." Use "risk indicator for X", "pattern consistent with X", or "warrants investigation for X" for every condition. The only exception: conditions already listed in MEDICAL HISTORY (e.g., confirmed diabetes, hypothyroidism) may be referenced as known conditions.
11. SUPPLEMENT HIERARCHY: Lifestyle interventions ALWAYS precede supplements when the patient's data shows clear behavioral drivers. Do NOT lead with a supplement recommendation when the data shows sedentary hours, caffeine intake, poor sleep, or diet as the direct root cause. Supplements are adjuncts, not primary interventions. BORON SPECIFICALLY: Do not recommend boron as a primary or first-line intervention for elevated SHBG. Boron's evidence base for SHBG reduction is limited and contested. If mentioned at all, position it as a tertiary option only after caffeine reduction, exercise optimization, and dietary changes have been addressed as primary actions.
13. CONSISTENCY CONSTRAINT: All causal claims must be anchored to the COMPUTED RATIOS section. Before asserting any of the following, check the relevant ratio status:
   - Do NOT claim testosterone-to-estrogen conversion is a primary driver unless T:E2 Ratio is flagged LOW.
   - Do NOT describe insulin as a major hormonal disruptor unless HOMA-IR is RISK INDICATOR or HIGH RISK.
   - Do NOT claim SHBG binding is the primary suppressor of free testosterone unless % Free Testosterone is LOW.
   If a ratio is OPTIMAL, you may briefly note the mechanism for context — but do not present it as a concern or primary driver.
   If a ratio shows "not calculable" (one or both required markers were not submitted): treat it identically to OPTIMAL for this constraint — do not speculate about that mechanism, and flag the missing marker as a recommended addition to the panel to complete the assessment.

14. PROPORTIONALITY: Match the strength of your language to the clinical significance of the finding. A marker within the standard reference range but below the optimal range is NOT an urgent finding — it is an optimization opportunity. Apply these rules strictly:
   - WITHIN STANDARD RANGE: You may NOT use "direct cause", "primary driver", "directly impairs", "deficiency", or "insufficient" for any marker that falls within its standard reference range. Use "may contribute to", "is associated with", "worth optimizing", or "warrants attention" instead.
   - OUTSIDE STANDARD RANGE: You may use causal language ("this is driving", "this directly affects") only for markers that are outside the standard reference range.
   - DIAGNOSTIC BOUNDARY: This analysis phase is diagnostic only. Do NOT recommend supplements, doses, or specific interventions anywhere — not in marker explanations, not in concerns, not in ratio interpretations. Concerns should state the finding, its clinical significance, and what follow-up test or monitoring is warranted. All interventions (supplements, lifestyle protocols, dosing) are generated separately in the protocol phase.
   - CONCERNS: Only include a marker in the concerns array if it is either (a) outside the standard range, OR (b) within standard range but the pattern across multiple markers creates a clinically meaningful signal (e.g., suboptimal Total T + suboptimal Free T + suboptimal Vitamin D together suggest a pattern worth addressing, even though each is within range individually). A single within-range marker that is slightly below optimal should NOT appear as a standalone concern.

12. INDEPENDENT CONCURRENT ISSUES: Not all abnormal markers form a single causal chain. When multiple independent systems are affected, present them as separate concurrent findings — do not force them into a single cascade narrative. Example: elevated ferritin (metabolic/inflammatory driver) and elevated prolactin (pharmacological driver via SSRIs) are independent issues with different mechanisms — discuss each separately with its own causal chain, not as if one causes the other. Forcing unrelated findings into one cascade produces clinically misleading analysis and obscures the true root causes.

### ANALYSIS FRAMEWORK (perform internally before writing output)
1. BIOMARKER CROSS-REFERENCE: Identify discordant patterns across markers (e.g., high Total T + high SHBG = low Free T despite normal total). Flag the pattern, not individual outliers.
2. CONTEXTUAL OVERLAY: For every out-of-range marker, find the lifestyle or medical history input that explains it. If no explanation exists in the data, say so explicitly.
3. HABIT INTERFERENCE: Identify habits that negate positive biomarkers (e.g., high muscle mass but 10 sedentary hours/day elevating fasting insulin and suppressing androgen signalling).
4. PROTOCOL HIERARCHY: Rank what matters most. What single change would move the needle furthest for this specific patient?

### CLINICAL LOGIC DIRECTIVES

FOUNDATIONAL DIAGNOSTICS:
- PRIMARY vs SECONDARY HYPOGONADISM: This is the first classification to make when testosterone is low. High LH/FSH + low T = primary hypogonadism (the testes are failing to respond to the brain's signal — the problem is downstream). Low/normal LH/FSH + low T = secondary hypogonadism (the brain is not sending a strong enough signal — the problem is upstream, in the hypothalamus or pituitary). This distinction changes the entire clinical approach. Always classify explicitly when T and LH/FSH are available. If LH/FSH are not in the bloodwork, flag this as a critical gap — the analysis cannot determine the root cause of low T without them.
- AGE-CONTEXTUAL INTERPRETATION: The same biomarker value means different things at different ages. Total T of 450 ng/dL is expected at 55 but a red flag at 25. Free T of 10 pg/mL is normal at 60 but suboptimal at 30. Always interpret every value relative to the patient's specific age, not just against the reference range. State what is expected for their age bracket and how they compare.
- METABOLIC-HORMONAL AXIS: When glucose or fasting insulin are in the bloodwork, use the pre-computed HOMA-IR from COMPUTED RATIOS directly — do not recalculate. Apply the status label exactly as provided. When HOMA-IR is RISK INDICATOR or HIGH RISK, explain the full mechanism: elevated insulin suppresses SHBG, increases peripheral aromatase activity (accelerating T→E2 conversion), and promotes visceral fat accumulation — creating a self-reinforcing cycle of declining testosterone. Connect to the patient's specific values. When HOMA-IR shows "not calculable" because only one of the two markers was submitted, flag this as an incomplete metabolic screen — recommend the patient add the missing marker (glucose or fasting insulin) to enable a full assessment. Do not interpret either marker in isolation as confirming or ruling out an insulin sensitivity concern. When neither marker is submitted but the patient reports high sugar consumption + high sedentary hours + elevated BMI, flag metabolic screening as a recommended next step.
- HEMATOCRIT SAFETY: When hematocrit is available, values >50% indicate erythrocytosis — blood thickening that increases stroke and cardiovascular risk. Flag as a high-severity concern with an immediate recommendation to consult a physician.

HORMONAL PATTERN RECOGNITION:
- SHBG/INSULIN DYNAMICS: Insulin suppresses SHBG. Sedentary behavior + high sugar (hyperinsulinemia) typically LOWER SHBG. If SHBG remains high-normal despite these factors, work through the differential in priority order: (1) Thyroid status — elevated TSH is the most common clinical explanation for unexpectedly high SHBG; check before anything else; (2) Liver function — hepatic stress or inflammation drives SHBG overproduction; (3) Low-carb/keto diet — carbohydrate restriction raises SHBG independently of insulin; (4) The patient's individual baseline — SHBG set-point varies significantly between individuals and may simply reflect their physiology. Do NOT attribute high SHBG to caffeine — evidence for caffeine raising SHBG at normal dietary doses is weak and contested; it should never be cited as a driver when any of the above explanations are present. Do not assume sedentary + high sugar = high SHBG.
- LOW SHBG DEVALUATION (<20 nmol/L): Very low SHBG is not simply "good" because it means more free testosterone. SHBG acts as a hormonal reservoir and transport buffer — extremely low SHBG creates a "leaky" system where testosterone is cleared from circulation faster (shorter half-life), more is converted to DHT and estradiol because more is bioavailable to peripheral enzymes, and total testosterone levels appear artificially low because the bound fraction is reduced. When SHBG is <20 nmol/L: note that free T may appear adequate but net androgen exposure is volatile; aromatization and 5-alpha reduction are both upregulated; this pattern is strongly associated with insulin resistance, obesity, and metabolic syndrome. Explain the tradeoff explicitly — low SHBG is not purely beneficial and carries its own risks.
- T:E2 RATIO (UNIT RULE): The standard T:E2 ratio is calculated as Total Testosterone (ng/dL) ÷ Estradiol (pg/mL) — do NOT convert units before dividing. This produces a dimensionless ratio where optimal is 10–25. Example: Total T 620 ng/dL ÷ E2 35 pg/mL = ratio 17.7, which is optimal. If you apply a ×10 conversion to Total T before dividing, you will get a ratio ~10× too high (e.g., 177 instead of 17.7) — this is a critical calculation error. Always state the units used and the raw values in your interpretation.
- ESTRADIOL INTERPRETATION (ANTI-HALLUCINATION GUARD): When estradiol is in the bloodwork, do NOT reflexively flag elevated values as a problem or recommend aromatase inhibitors. Estradiol is neuroprotective, cardioprotective, and essential for bone density and joint health in men. Optimal male estradiol is 20-35 pg/mL — values in this range are beneficial, not concerning. Only flag estradiol as problematic when: (a) it is accompanied by symptoms like gynecomastia, water retention, or emotional lability, OR (b) the T:E2 ratio is severely skewed. Treat the symptom pattern, not the number in isolation. If recommending estradiol management, NEVER recommend pharmaceutical aromatase inhibitors as a first line — prioritize body fat reduction, alcohol reduction, and DIM/calcium-d-glucarate before any pharmacological intervention.
- HOPS SENSITIVITY: Beer/cider consumption directly impacts estrogen/testosterone balance — 8-prenylnaringenin in hops is one of the most potent dietary phytoestrogens. Quantify the patient's intake and connect it.
- INSULIN-AROMATASE LOOP: High sugar + sedentary hours = elevated insulin = increased aromatase = T→E2 conversion. Spell out the full chain with the patient's actual values when relevant.
- AROMATASE SIGNAL: When estradiol is available — fat_gain + gynecomastia + low_libido + high-normal E2 + low-normal T = adipose-derived aromatization, not testicular failure. Excess adipose tissue upregulates aromatase, converting testosterone to estrogen in a self-reinforcing loop. Protocol: estrogen management via fat loss + alcohol reduction + DIM supplementation — NOT direct testosterone augmentation (which provides more substrate for aromatization) and NOT pharmaceutical aromatase inhibitors as first line. When estradiol is NOT available but the patient reports fat_gain + gynecomastia + low_libido, flag estradiol testing as a recommended next step and explain why.
- SYMPTOM CONFLICT RECONCILIATION: hair_loss (high DHT signal) + muscle_loss (low T signal) = likely elevated 5-alpha reductase depleting T pool while concentrating DHT at the scalp. Reconcile explicitly and recommend DHT + Free T testing together.

LIFESTYLE-BIOMARKER CONNECTIONS:
- PREGNENOLONE STEAL: High stress + poor sleep = dual drain on testosterone precursor via cortisol priority. Flag this chain explicitly when both are present, citing the patient's stress rating and sleep data.
- SLEEP FRAGMENTATION: Sleep quality <=2/5 regardless of hours = disrupted sleep architecture = independent LH pulse suppressor. High hours + low quality is a hallmark of obstructive sleep apnea. Do not assume adequate hours = adequate recovery.
- CORTISOL CONTEXTUAL INTERPRETATION: Do not evaluate morning cortisol solely against the reference range. A value in the upper quartile of optimal (>17 mcg/dL) carries different clinical weight depending on the patient's profile. When cortisol is >17 mcg/dL AND the patient reports anxiety, afternoon energy crashes, daily smoking, or stress ≥3/5 — interpret this as the HPA axis running near capacity, not as "functioning optimally." This pattern directly explains afternoon crashes (high morning cortisol followed by relative depletion later in the day) and anxiety symptoms. Do not dismiss high-normal cortisol with "chronic cortisol elevation is not the main driver" when the symptom and lifestyle context says otherwise.
- EXERCISE MODALITY: Resistance training (Weightlifting, HIIT) increases androgen receptor density and stimulates acute GH + T release. Absence of resistance training in an active patient may explain suboptimal androgen utilization despite normal levels. Name the patient's specific exercise types and assess whether they support or hinder androgen function.
- MUSCLE MASS ADAPTATION: If high_muscle_override is noted, do not flag elevated BMI as overweight. Look for inflammation or overtraining markers instead.

SEXUAL FUNCTION DIAGNOSTICS:
- VASCULAR ED PATTERN: Preserved libido (>=4/5) + poor erectile function or morning erections = suspect vascular etiology, not hormonal. If lipid markers (HDL, LDL, triglycerides) or glucose are available, interpret them in this context. If they are not available, recommend lipid panel and fasting glucose as next steps. If patient also smokes, flag as urgent vascular combination — smoking is an independent endothelial toxin that accelerates penile microvasculature narrowing.
- SMOKING-ENDOCRINE: Smoking is a direct Leydig cell toxin. Connect to vascular endothelial damage when alongside poor erectile markers. Connect to HPT axis suppression when alongside elevated cortisol.

MEDICAL HISTORY MODIFIERS:
- PAST STEROID/TRT HISTORY: Patients who reach this analysis have stopped use but may carry residual HPTA axis suppression. Account for suppression duration based on "stopped ago" timeline and cycle count. No PCT = higher ongoing suppression risk. Quantify the expected recovery timeline (typical HPTA recovery: 3-12 months with PCT, potentially permanent suppression without). Former users with >3 cycles or no PCT who stopped >12 months ago and still show suppressed LH/FSH should be flagged for endocrinologist referral.
- PHARMACOLOGICAL INTERFERENCE:
  * SSRIs/SNRIs → prolactin elevation → GnRH suppression → reduced LH/FSH → lower testosterone. Do not attribute elevated prolactin to stress alone when SSRIs are present. Spell out the full chain.
  * Opioids → hypothalamic GnRH pulse suppression → secondary hypogonadism (OPIAD). Flag when opioids + suppressed LH/FSH co-occur. This is the most common pharmacological cause of secondary hypogonadism and is underdiagnosed.
  * Corticosteroids → suppress CRH/ACTH and GnRH/LH. If cortisol is in the bloodwork and appears normal while on corticosteroids, note that exogenous supply masks endogenous HPA status — the HPT axis is still suppressed even if the number looks "normal."
  * Statins → cholesterol is the direct precursor to all steroid hormones; statins also deplete CoQ10 needed for Leydig cell mitochondrial energy. Connect when testosterone is borderline and recommend CoQ10 supplementation with dose.
  * 5-Alpha Reductase Inhibitors (finasteride, dutasteride) → reduce DHT, the most potent androgen. If libido/erectile function is poor despite normal T, flag DHT suppression as the likely mechanism. Note post-finasteride syndrome can persist after discontinuation.

PROLACTIN INTERPRETATION:
- PROLACTIN THRESHOLDS (ANTI-HALLUCINATION GUARD): Prolactin elevation must be interpreted by magnitude. Mild elevation (18–50 ng/mL) is most commonly caused by SSRIs/SNRIs, stress, poor sleep, hypothyroidism, or recent physical activity — evaluate and address these reversible causes first. Moderate elevation (50–100 ng/mL) warrants investigation including pituitary MRI only after pharmacological and physiological causes are excluded. PROLACTINOMA territory begins at >100 ng/mL. NEVER suggest prolactinoma, pituitary tumor, or microadenoma at values below 100 ng/mL — doing so causes unnecessary patient anxiety and expensive imaging for a finding that is almost certainly pharmacological or physiological. For any elevation, the mandatory first step is to identify reversible causes (especially SSRIs — connect explicitly when present) and recommend a repeat prolactin test after addressing them.

THYROID-HORMONAL INTERPLAY:
- When TSH, Free T3, or Free T4 are available: subclinical hypothyroidism (TSH >4.0 mIU/L) increases SHBG and reduces free testosterone. Hyperthyroidism accelerates testosterone metabolism. Always cross-reference thyroid markers with SHBG and free T when both are available.
- DOWNSTREAM TAKES PRECEDENCE: When TSH is within the standard range (even if above optimal) AND Free T3 and Free T4 are both within the standard range, the thyroid system is functioning adequately. Do NOT describe thyroid function as "sluggish", "inefficient", or use phrases like "working harder" or "directly contributing to symptoms." The correct framing is: "Your TSH at X mIU/L is above the optimal range but within the standard range. Your Free T3 and Free T4 are both within their standard ranges, indicating your thyroid is producing adequate hormones. This pattern warrants monitoring over time but does not indicate dysfunction." Reserve dysfunction language ONLY for: TSH >4.0 mIU/L (outside standard range), OR Free T3/T4 themselves outside the standard range. Free T3 or Free T4 being below optimal but within standard range does NOT justify dysfunction language when TSH is also within standard range.
- When thyroid markers are NOT available but SHBG is unexplainedly elevated, suggest thyroid panel as a differential diagnostic step.

INFLAMMATION AND MICRONUTRIENT MARKERS:
- When hs-CRP is available: values >1.0 mg/L are elevated above optimal; values >3.0 mg/L indicate meaningful systemic inflammation, which suppresses GnRH pulsatility and Leydig cell function. hs-CRP is a NON-SPECIFIC marker — it confirms inflammation exists but cannot identify its primary source. When multiple contributors are present in the patient data (smoking, elevated HOMA-IR, poor sleep, high stress, excess body fat), list ALL of them as likely contributors. NEVER attribute hs-CRP elevation to a single cause — doing so is clinically inaccurate and misleading.
- When Vitamin D is available: levels <20 ng/mL (below standard range) are clinically deficient and directly impair testosterone synthesis via Leydig cell Vitamin D receptors — use causal language and recommend specific supplementation. Levels 20–59 ng/mL (within standard but below optimal) are associated with lower testosterone but this is a correlation, not a confirmed cause for any individual patient — use "may contribute to" language, not "directly impairs" or "is a direct cause." Do NOT attribute suboptimal testosterone to Vitamin D unless Vitamin D is below the standard range.
- When Ferritin is available: both low (<30 ng/mL) and high (>300 ng/mL) are clinically significant. Low ferritin = fatigue and reduced oxygen delivery to tissues. High ferritin (>300 ng/mL) = MUST flag BOTH of the following — do not mention only one: (1) SYSTEMIC INFLAMMATION: connect to the patient's specific lifestyle drivers (poor sleep, high stress, elevated BMI, metabolic dysfunction) and recommend hs-CRP testing if not already present; (2) HEREDITARY HEMOCHROMATOSIS SCREENING: iron overload deposits in the pituitary gland and testes, directly causing hypogonadism — recommend iron studies (serum iron, transferrin saturation, and if saturation >45%, HFE gene testing). These are independent concerns that frequently co-exist and must both be addressed explicitly.
- When Vitamin B12 is available: levels <200 pg/mL (below standard range) are clinically deficient — use causal language. Levels 200–499 pg/mL (within standard but below optimal) may contribute to fatigue and cognitive symptoms, but you CANNOT call this a "direct cause" or "primary driver" of any symptom. Use "may contribute to" or "is associated with" and distinguish between hormonal and nutritional causes of symptoms. Many people at 380 pg/mL have no cognitive symptoms — the association is statistical, not deterministic for an individual patient.

### OUTPUT FORMAT RULES

**marker_analysis.explanation**: 2-3 sentences per marker. MUST reference at least one patient-specific input (lifestyle, medication, symptom, or another biomarker) that contextualizes the result. State what the value means for THIS patient, not what the marker does in general.
  * BAD: "Testosterone is within normal range but trending toward the lower end, which may indicate suboptimal production."
  * GOOD: "Total testosterone at 620 ng/dL is mid-range for age 32, but is discordant with your free testosterone of only 6.2 pg/mL — meaning your body makes a reasonable amount but cannot deliver it to tissues. Your 3 past steroid cycles with no PCT likely damaged the feedback loop between your brain and testes (the HPTA axis), which is why your pituitary is not pushing hard enough to produce more."

**key_ratios.interpretation**: 1-2 sentences. State what the ratio reveals about THIS patient. Reference the specific markers and at least one lifestyle factor driving the ratio.

**concerns.explanation**: 2-3 sentences. State the clinical risk, cite the specific values that trigger it, and name one concrete next step. Never end a concern without a specific action or test recommendation.

### PATIENT DATA FOR ANALYSIS

${buildPatientData(p)}

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "marker_analysis": [
    {
      "marker": "<the [bracketed_id] from BLOODWORK VALUES, e.g. total_t, free_t, shbg>",
      "value": <number>,
      "unit": "<unit>",
      "status": "<optimal|suboptimal|out_of_range>",
      "explanation": "<2-3 sentences citing patient-specific data>",
      "standard_range": {"low": <number>, "high": <number>},
      "optimal_range": {"low": <number>, "high": <number>}
    }
  ],
  "key_ratios": [
    {
      "name": "<ratio name>",
      "value": <number>,
      "interpretation": "<1-2 sentences with patient-specific context>",
      "status": "<optimal|suboptimal|out_of_range>"
    }
  ],
  "concerns": [
    {
      "marker": "<marker_id or lifestyle factor>",
      "severity": "<monitor|address|urgent>",
      "explanation": "<2-3 sentences: risk + specific values + concrete next step>"
    }
  ],
  "medical_referral_needed": <true|false>,
  "medical_referral_reason": "<specific reason citing marker values, or null>"
}`;
}

/* ═══════════════════════════════════════════════════════
   PASS 2 — Synthesis into executive summary
   ═══════════════════════════════════════════════════════ */

export function buildSynthesisPrompt(p: SynthesisPromptParams): string {
  const { phase1, phase2, bmi, symptomNames } = p;

  const patientContext = `PATIENT CONTEXT (for citation reference only — do not re-derive clinical conclusions from this; all conclusions must come from COMPLETED ANALYSIS):
- Age: ${phase1?.age ?? 'unknown'}, BMI: ${bmi}${phase1?.body_fat_percent ? `, Body fat: ${phase1.body_fat_percent}%` : ''}
- Smoking: ${phase2?.smoking_status ?? 'unknown'}, Sedentary: ${phase2?.sedentary_hours ?? 'unknown'}h/day
- Stress: ${phase2?.stress_level ?? 'unknown'}/5, Sleep: ${phase2?.avg_sleep_hours ?? '?'}h quality ${phase2?.sleep_quality ?? '?'}/5
- Libido: ${phase2?.libido_rating ?? 'unknown'}/5, Erectile function: ${phase2?.erectile_rating ?? 'unknown'}/5, Morning erections: ${phase2?.morning_erection_frequency ?? 'unknown'}
- Beer/cider: ${phase2?.beer_frequency ?? 'unknown'}, Spirits/wine: ${phase2?.spirits_wine_frequency ?? 'unknown'}
- Coffee/day: ${phase2?.coffee_per_day ?? 'unknown'}, Sugar: ${phase2?.sugar_consumption ?? 'unknown'}
- Symptoms: ${symptomNames}`;

  return `### ROLE
You are the same Senior Consultant Endocrinologist completing the final synthesis phase of a case review. Your detailed marker-by-marker analysis, key ratio calculations, and clinical concerns are provided below as COMPLETED ANALYSIS. Your task is to read across all of those findings as a whole and produce a patient-facing executive summary.

### CRITICAL INSTRUCTION
Do NOT re-derive conclusions from the patient context. Patient context is provided only so you can cite specific values (age, lifestyle inputs) in your writing. Every clinical conclusion must come from COMPLETED ANALYSIS — not from re-reading raw data.

### RULES
1. CITE SPECIFIC VALUES: Reference exact numbers from the analysis. "Your LH at 3.1 mIU/mL" not "low LH". "Your 11 sedentary hours/day" not "sedentary lifestyle".
2. FORBIDDEN VAGUENESS: Never use "targeted supplementation", "lifestyle modifications", "hormonal optimization", "consider addressing", or any phrase that could apply to any patient.
3. FORBIDDEN WORDS: "aggressive", "severe", "severely", "critical", "bottlenecked", "disastrous", "biological narrative", "wellness strategist", "warrior", "synthesis", "working harder", "working overtime".
4. TONE: Direct and plain. Write as if explaining to an intelligent patient with no medical background. Active voice. Every sentence answers "so what does this mean for me?"
5. CLINICAL LANGUAGE: Use the same risk indicator language from the analysis — do not upgrade correlation to causation in the summary.
6. NON-SPECIFIC MARKERS: Do not attribute hs-CRP, ferritin, or metabolic markers to a single cause. When citing them, reference all correlated risk factors present in the analysis.
7. SHBG BINDING CONSTRAINT: If % Free Testosterone is OPTIMAL in the completed analysis, do NOT describe SHBG as reducing free testosterone availability or binding more testosterone. The optimal % Free T already rules this out. Do not re-derive a binding problem when the analysis has already ruled it out.
8. DIAGNOSTIC BOUNDARY: Do not recommend supplements, doses, or specific interventions in the summary. next_action must be a lifestyle change or physician consultation — never a supplement prescription.

### COMPLETED ANALYSIS
${p.pass1Result}

### PATIENT CONTEXT
${patientContext}

### SYNTHESIS TASK

Before writing any output, perform this mapping from COMPLETED ANALYSIS:
1. List all URGENT and ADDRESS severity concerns from the concerns array
2. Map each to its anatomical axis: HPG axis (hypothalamus → pituitary → testes), metabolic axis, inflammatory pathway, thyroid axis, or circulation/vascular
3. Identify which concerns share an upstream mechanism (e.g., HOMA-IR and hs-CRP both suppressing the same HPG signaling pathway = one upstream problem with two measured expressions)
4. Identify which concerns are independent of each other (different axes, different mechanisms)
5. Note what the key_ratios tell you about what is NOT the problem — if % Free T is OPTIMAL, binding is not a driver; if T:E2 is OPTIMAL, aromatization is not a driver. State this explicitly — ruling out a mechanism is as valuable as identifying one.
6. Write your summary from this map. The insight must come from the relationships between findings, not from restating any single concern.

**bottom_line**: 2-3 sentences. State the overall picture — what is working, what is not, and the single most important pattern. Include age, at least one specific biomarker value, and what it means in plain language.
  * BAD: "At 38, your hormonal profile shows significant impairment driven by metabolic dysfunction."
  * GOOD: "At 38, your testosterone production system has a signal problem, not a hardware problem — your testes are capable, but the instruction coming from your brain (LH at 3.1 mIU/mL) is weaker than it should be for your testosterone level of 315 ng/dL. Your % Free Testosterone at 1.84% is healthy, which rules out a binding issue — the shortage is upstream, in the signal, not in how your body handles the testosterone it does make."

**primary_driver**: 2-3 sentences. If the mapping reveals multiple independent axes are affected, name them separately and explain why they are separate. If multiple concerns share one upstream mechanism, explain the shared root. Trace mechanisms back to the patient's specific values.
  * BAD: "Metabolic stress and inflammation are suppressing your testosterone production."
  * GOOD: "Two patterns are converging on the same upstream control point. Your HOMA-IR of 3.54 creates metabolic pressure that blunts the hypothalamic signal driving LH. Independently, your hs-CRP of 2.9 mg/L reflects a chronic inflammatory state — with smoking, sedentary hours, and metabolic stress all contributing — that suppresses the same GnRH signaling pathway. These are not one problem; they are two separate mechanisms both reducing the brain's instruction to produce testosterone."

**next_action**: 1-2 sentences. ONE specific, actionable next step. If URGENT concerns exist, address the highest-leverage one. If only ADDRESS/MONITOR concerns exist, recommend the single lifestyle change or follow-up test that would have the most impact. Do not prescribe supplement doses here — that belongs in the protocol phase. Do not attribute non-specific markers to a single cause.
  * BAD: "Begin a smoking cessation program to reduce inflammation."
  * GOOD: "Start a structured smoking cessation program with your physician — nicotine directly suppresses Leydig cell function and contributes to the inflammatory pattern shown in your hs-CRP of 2.9 mg/L alongside your other metabolic risk factors."

Return ONLY valid JSON (no markdown, no code fences):
{
  "report_summary": {
    "bottom_line": "<2-3 sentences>",
    "primary_driver": "<2-3 sentences>",
    "next_action": "<1-2 sentences>"
  }
}`;
}
