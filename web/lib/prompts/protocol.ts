import type { Phase1Data, Phase2Data, Phase3Data } from '@/types';

function san(val: unknown, maxLen = 150): string {
  if (val == null) return '';
  return String(val).replace(/[\u0000-\u001F\u007F-\u009F`]/g, '').trim().slice(0, maxLen);
}
function sanArr(arr: unknown[] | null | undefined, maxLen = 80): string {
  if (!Array.isArray(arr) || !arr.length) return 'none';
  return arr.map(v => san(v, maxLen)).filter(Boolean).join(', ') || 'none';
}

export interface CalibrationContext {
  foundationProtocol: {
    supplements: { name: string; dose: string; timing: string; reason: string }[];
    eating: string[];
    exercise: string[];
    sleep: string[];
    stress: string[];
    habits: string[];
  };
  inquiryResponses: {
    symptom_reassessment: Record<string, unknown>;
    supplement_adherence: Record<string, unknown>;
    directive_adherence: Record<string, unknown>;
    subjective_scores: Record<string, number>;
    new_symptoms?: string;
    notes?: string;
  } | null;
  wellbeingTrend: { energy: number; mood: number; libido: number; sleep_quality: number; mental_clarity: number; stress: number }[] | null;
}

export interface ProtocolPromptParams {
  phase1: Phase1Data;
  phase2: Phase2Data;
  phase3: Phase3Data;
  symptomIds: string[];
  bmi: string;
  analysisJson: string;
  calibrationContext?: CalibrationContext;
}

function buildCalibrationSection(ctx: CalibrationContext): string {
  const parts: string[] = [];

  parts.push(`### CALIBRATION MODE
This is a CALIBRATION protocol (days 46-90), not a Foundation protocol. You are refining and adjusting an existing protocol based on 45 days of real-world data. Do NOT generate from scratch. Build on what worked, adjust what did not, and drop what was consistently skipped.`);

  // Foundation protocol summary
  const fp = ctx.foundationProtocol;
  parts.push(`### FOUNDATION PROTOCOL (what was prescribed for days 1-45)
Supplements: ${fp.supplements?.map(s => `${s.name} ${s.dose} (${s.timing})`).join('; ') || 'none'}
Eating directives: ${fp.eating?.join('; ') || 'none'}
Exercise directives: ${fp.exercise?.join('; ') || 'none'}
Sleep directives: ${fp.sleep?.join('; ') || 'none'}
Stress directives: ${fp.stress?.join('; ') || 'none'}
Habit directives: ${fp.habits?.join('; ') || 'none'}`);

  // Wellbeing trend
  if (ctx.wellbeingTrend?.length) {
    const avg = (key: string) => {
      const vals = ctx.wellbeingTrend!.map(w => (w as Record<string, number>)[key]).filter(v => v != null);
      return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : '?';
    };
    parts.push(`### WELLBEING TREND (30-day averages from daily check-ins during Foundation phase)
Energy: ${avg('energy')}/10, Mood: ${avg('mood')}/10, Libido: ${avg('libido')}/10, Sleep quality: ${avg('sleep_quality')}/10, Mental clarity: ${avg('mental_clarity')}/10, Stress: ${avg('stress')}/10`);
  }

  // Inquiry responses
  if (ctx.inquiryResponses) {
    const ir = ctx.inquiryResponses;
    parts.push(`### 45-DAY INQUIRY RESPONSES
Symptom reassessment: ${JSON.stringify(ir.symptom_reassessment)}
Supplement adherence: ${JSON.stringify(ir.supplement_adherence)}
Directive adherence: ${JSON.stringify(ir.directive_adherence)}
Subjective scores: ${JSON.stringify(ir.subjective_scores)}
New symptoms: ${ir.new_symptoms || 'none'}
Notes: ${ir.notes || 'none'}`);
  }

  parts.push(`### CALIBRATION RULES
1. CARRY FORWARD what the patient followed consistently AND reported improvement on. Explicitly acknowledge: "Continuing [supplement/directive] - your data shows this is working."
2. ADJUST doses or timing for items the patient followed but reported no improvement on. Explain the adjustment rationale.
3. DROP items the patient consistently skipped. Replace with achievable alternatives. Acknowledge the skip: "Replacing [X] with [Y] since [X] proved impractical."
4. ADD new interventions only if the inquiry reveals new symptoms or if wellbeing data shows a metric that declined during the Foundation phase.
5. Frame the output as a refinement, not a restart. The opening line should reference the Foundation phase and what the data showed.`);

  return parts.join('\n\n');
}

export function buildProtocolPrompt(p: ProtocolPromptParams): string {
  const { phase1, phase2, phase3, symptomIds, bmi, analysisJson, calibrationContext } = p;

  const isCalibration = !!calibrationContext?.foundationProtocol;

  return `### ROLE
You are a Clinical Protocol Specialist translating a completed bloodwork analysis into a precise, personalised 45-day ${isCalibration ? 'Calibration' : 'Foundation'} protocol. The full analysis - marker-by-marker interpretations, key ratios, concerns, and executive summary - is provided below. Your job is to convert these findings into specific, actionable interventions. Do NOT re-analyse the bloodwork. Build directly from the findings.${isCalibration ? ' This is a CALIBRATION pass - you are refining an existing protocol, not starting from scratch.' : ''}

### MANDATORY RULES

1. COMPLETE COVERAGE: Every HIGH-severity concern from the analysis MUST be addressed by at least one specific intervention (lifestyle change, supplement, or medical referral). After generating the protocol, mentally verify: for each HIGH concern, which intervention addresses it? If any HIGH concern is unaddressed, add an intervention. MEDIUM concerns should also be addressed where possible.

2. MEDICAL REFERRALS FIRST: When the analysis indicates medical_referral_needed is true, the FIRST item in the "habits" array MUST be a specific specialist appointment directive. Include: which type of specialist (endocrinologist, urologist, etc.), which specific findings to bring up (cite the values), what tests to request, and a timeline (e.g., "within 2 weeks"). This is the highest-priority action in the entire protocol — it takes precedence over all lifestyle and supplement interventions.

3. LIFESTYLE BEFORE SUPPLEMENTS: Root-cause interventions (diet, exercise, habits) are primary. Supplements are adjuncts. If the analysis identifies sedentary behavior driving insulin resistance, the primary intervention is breaking up sedentary time — not a supplement for insulin sensitivity. Never lead with a supplement when a lifestyle change directly addresses the root cause identified in the analysis.

4. SUPPLEMENT RULES:
   - Maximum 4 supplements.
   - They must address the TOP concerns from the analysis. If the analysis identifies 3 independent problem areas (e.g., metabolic dysfunction, thyroid dysfunction, fertility/reproductive), distribute supplements across multiple areas — do not allocate all 4 to one problem.
   - Order supplements by clinical priority: the supplement addressing the highest-severity concern goes first.
   - Do NOT recommend Boron. Evidence base is limited and contested.
   - If the patient already takes a supplement (check both "Current supplements" AND "Supplement categories" below), do not recommend it again — acknowledge the existing use and adjust dose/timing if appropriate.

5. SPECIFICITY: Every directive must include quantities, frequencies, and timing. "Reduce coffee" is unacceptable. "Reduce coffee from ${san(phase2?.coffee_per_day)} cups to 1 cup per day, consumed before 10 AM" is acceptable. "Exercise more" is unacceptable. "Add 2 sessions of 30-minute resistance training per week on top of your current ${san(phase2?.exercise_frequency)} routine" is acceptable.

6. CONNECT TO FINDINGS: Every recommendation must explicitly reference the specific analysis finding it addresses, including the patient's actual biomarker values. "To support testosterone" is unacceptable. "To address your suppressed LH of 2.2 mIU/mL and low free testosterone of 10.2 pg/mL, which the analysis identified as secondary hypogonadism" is acceptable.

7. NO FILLER: If a lifestyle category is already strong based on the patient data, include ONE brief maintenance note — do not manufacture interventions.
   - Sleep: If quality is 4+/5 and hours are 7+, one sentence acknowledging this is sufficient. Do NOT generate 3 sleep hygiene directives for someone who sleeps well.
   - Stress: If stress level is 2/5 or lower, one sentence is sufficient. Do NOT prescribe meditation for someone with minimal stress.
   - Exercise: If the patient already trains 3-4x/week with resistance training, acknowledge this. Add specific adjustments only if the analysis findings warrant them.

8. SYMPTOM-SPECIFIC COVERAGE:
   - If "fertility_concerns" is in symptoms: at least one intervention must specifically address reproductive function. If FSH is suppressed, recommend fertility specialist referral. Consider CoQ10 (200-400mg) for sperm quality, zinc (30mg) for spermatogenesis, or selenium (200mcg) for sperm motility — but only if not already in the patient's supplement stack.
   - If "afternoon_crash" is in symptoms: at least one intervention must target the metabolic or thyroid mechanism the analysis identified as the cause. Do not just recommend "eat protein at lunch."
   - If "poor_memory" is in symptoms: connect to the analysis finding that explains it (low free T, thyroid dysfunction, etc.) and ensure the intervention addresses that root cause.

9. BEER/HOPS MECHANISM: When recommending reduction of beer/cider consumption, cite the actual mechanism: hops contain 8-prenylnaringenin, one of the most potent dietary phytoestrogens, which directly mimics estrogen and can elevate prolactin. Do NOT cite generic "liver health" or "metabolic support."

10. FORBIDDEN WORDS: "aggressive", "severe", "bottlenecked", "disastrous", "warrior", "biohack", "optimise your lifestyle".

### PATIENT PROFILE
- Age: ${phase1?.age ?? 'unknown'}, BMI: ${bmi}${phase1?.body_fat_percent ? `, Body fat: ${phase1.body_fat_percent}%` : ''}${phase1?.high_muscle_override ? ' (high muscle mass — BMI reflects muscle)' : ''}
- Medical conditions: ${sanArr(phase1?.medical_conditions)}
- Sleep: ${phase2?.avg_sleep_hours ?? '?'}h/night, quality ${phase2?.sleep_quality ?? '?'}/5
- Exercise: ${phase2?.exercise_frequency ?? 'unknown'}${phase2?.exercise_types?.length ? ` (${sanArr(phase2.exercise_types)})` : ''}
- Sedentary hours/day: ${phase2?.sedentary_hours ?? 'unknown'}
- Stress level: ${phase2?.stress_level ?? 'unknown'}/5
- Coffee/day: ${phase2?.coffee_per_day ?? 'unknown'}
- Sugar consumption: ${phase2?.sugar_consumption ?? 'unknown'}
- Beer/cider: ${phase2?.beer_frequency ?? 'unknown'}
- Spirits/wine: ${phase2?.spirits_wine_frequency ?? 'unknown'}
- Smoking: ${phase2?.smoking_status ?? 'unknown'}
- Keto/low-carb: ${phase2?.keto_diet ? 'yes' : 'no'}
- Libido: ${phase2?.libido_rating ?? 'unknown'}/5, Erectile function: ${phase2?.erectile_rating ?? 'unknown'}/5
- Morning erections: ${phase2?.morning_erection_frequency ?? 'unknown'}
- Steroid history: ${phase3?.steroid_history ?? 'never'}${phase3?.steroid_history === 'past' ? ` — stopped ${phase3?.steroid_stopped_ago ?? 'unknown'}, ${phase3?.steroid_cycle_count ?? 'unknown'} cycle(s), PCT: ${phase3?.steroid_pct ? 'yes' : 'no'}` : ''}
- TRT history: ${phase3?.trt_history ?? 'never'}
- Medications: ${sanArr(phase3?.medications)}
- Current supplements: ${sanArr(phase3?.supplements)}
- Supplement categories: ${sanArr(phase3?.supplement_categories)}
- Symptoms: ${symptomIds.join(', ') || 'none'}

### COMPLETE ANALYSIS (build your protocol from this - do not re-derive findings)
${analysisJson}

${isCalibration ? buildCalibrationSection(calibrationContext!) : ''}
### OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no code fences).
CRITICAL: "eating", "exercise", "sleep", "stress", and "habits" MUST be arrays of plain strings — NOT objects, NOT {directive: ...}, NOT {action: ...}. Each element is a single string sentence. Only "supplements" contains objects.
{
  "supplements": [
    {
      "name": "<supplement name>",
      "dose": "<exact dose with unit>",
      "timing": "<specific time/frequency, with or without food>",
      "reason": "<references the specific analysis finding it addresses, with actual biomarker values>"
    }
  ],
  "eating": ["<plain string directive>", "<plain string directive>"],
  "exercise": ["<plain string directive>", "<plain string directive>"],
  "sleep": ["<plain string directive>"],
  "stress": ["<plain string directive>"],
  "habits": ["<plain string directive>", "<plain string directive>"]
}`;
}
