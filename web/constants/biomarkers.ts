export interface UnitAlternative {
  unit: string;
  /** Multiply entered value by this to get the canonical unit value */
  toCanonical: number;
}

export interface BiomarkerDef {
  id: string;
  name: string;
  unit_primary: string;
  unit_alternatives?: UnitAlternative[];
  standard_range_low: number;
  standard_range_high: number;
  optimal_range_low: number;
  optimal_range_high: number;
  description: string;
  category: string;
}

export const BIOMARKERS: BiomarkerDef[] = [
  {
    id: 'total_t', name: 'Total Testosterone', unit_primary: 'ng/dL',
    unit_alternatives: [{ unit: 'nmol/L', toCanonical: 28.842 }],
    standard_range_low: 300, standard_range_high: 1000, optimal_range_low: 600, optimal_range_high: 900,
    description: 'Primary male sex hormone', category: 'hormones',
  },
  {
    id: 'free_t', name: 'Free Testosterone', unit_primary: 'pg/mL',
    unit_alternatives: [{ unit: 'pmol/L', toCanonical: 0.2882 }, { unit: 'ng/dL', toCanonical: 10 }],
    standard_range_low: 50, standard_range_high: 210, optimal_range_low: 120, optimal_range_high: 200,
    description: 'Unbound, biologically active testosterone', category: 'hormones',
  },
  {
    id: 'shbg', name: 'SHBG', unit_primary: 'nmol/L',
    standard_range_low: 10, standard_range_high: 57, optimal_range_low: 20, optimal_range_high: 40,
    description: 'Sex hormone binding globulin', category: 'hormones',
  },
  {
    id: 'estradiol', name: 'Estradiol (E2)', unit_primary: 'pg/mL',
    unit_alternatives: [{ unit: 'pmol/L', toCanonical: 0.2724 }],
    standard_range_low: 10, standard_range_high: 40, optimal_range_low: 20, optimal_range_high: 30,
    description: 'Primary estrogen; balance with testosterone is key', category: 'hormones',
  },
  {
    id: 'lh', name: 'LH', unit_primary: 'mIU/mL',
    standard_range_low: 1.5, standard_range_high: 9.3, optimal_range_low: 3, optimal_range_high: 7,
    description: 'Luteinizing hormone — signals testes to produce testosterone', category: 'hormones',
  },
  {
    id: 'fsh', name: 'FSH', unit_primary: 'mIU/mL',
    standard_range_low: 1.5, standard_range_high: 12.4, optimal_range_low: 2, optimal_range_high: 8,
    description: 'Follicle stimulating hormone — fertility indicator', category: 'hormones',
  },
  {
    id: 'prolactin', name: 'Prolactin', unit_primary: 'ng/mL',
    unit_alternatives: [{ unit: 'mIU/L', toCanonical: 0.04717 }],
    standard_range_low: 2, standard_range_high: 18, optimal_range_low: 2, optimal_range_high: 12,
    description: 'Elevated prolactin suppresses testosterone', category: 'hormones',
  },
  {
    id: 'vitamin_d', name: 'Vitamin D', unit_primary: 'ng/mL',
    unit_alternatives: [{ unit: 'nmol/L', toCanonical: 0.4006 }],
    standard_range_low: 20, standard_range_high: 100, optimal_range_low: 60, optimal_range_high: 90,
    description: 'Critical for testosterone synthesis and immune function', category: 'metabolic',
  },
  {
    id: 'cortisol', name: 'Cortisol', unit_primary: 'mcg/dL',
    unit_alternatives: [{ unit: 'nmol/L', toCanonical: 0.03625 }],
    standard_range_low: 6, standard_range_high: 23, optimal_range_low: 8, optimal_range_high: 15,
    description: 'Chronic elevation suppresses testosterone', category: 'metabolic',
  },
  {
    id: 'tsh', name: 'TSH', unit_primary: 'mIU/L',
    standard_range_low: 0.4, standard_range_high: 4.0, optimal_range_low: 1.0, optimal_range_high: 2.5,
    description: 'Thyroid function affects testosterone metabolism', category: 'thyroid',
  },
  {
    id: 'free_t3', name: 'Free T3', unit_primary: 'pg/mL',
    unit_alternatives: [{ unit: 'pmol/L', toCanonical: 0.6512 }],
    standard_range_low: 2.3, standard_range_high: 4.2, optimal_range_low: 3.0, optimal_range_high: 4.0,
    description: 'Active thyroid hormone — low levels impair testosterone production', category: 'thyroid',
  },
  {
    id: 'free_t4', name: 'Free T4', unit_primary: 'ng/dL',
    unit_alternatives: [{ unit: 'pmol/L', toCanonical: 0.07772 }],
    standard_range_low: 0.8, standard_range_high: 1.8, optimal_range_low: 1.0, optimal_range_high: 1.6,
    description: 'Thyroid hormone — dysfunction mimics low testosterone symptoms', category: 'thyroid',
  },
  {
    id: 'glucose', name: 'Fasting Glucose', unit_primary: 'mg/dL',
    unit_alternatives: [{ unit: 'mmol/L', toCanonical: 18.016 }],
    standard_range_low: 70, standard_range_high: 100, optimal_range_low: 70, optimal_range_high: 90,
    description: 'Insulin resistance lowers testosterone', category: 'metabolic',
  },
  {
    id: 'fasting_insulin', name: 'Fasting Insulin', unit_primary: 'mU/L',
    unit_alternatives: [{ unit: 'pmol/L', toCanonical: 0.1440 }],
    standard_range_low: 2.6, standard_range_high: 24.9, optimal_range_low: 2.6, optimal_range_high: 10,
    description: 'Chronic hyperinsulinemia suppresses testosterone and raises SHBG', category: 'metabolic',
  },
  {
    id: 'hba1c', name: 'HbA1c', unit_primary: '%',
    standard_range_low: 4.0, standard_range_high: 5.6, optimal_range_low: 4.0, optimal_range_high: 5.2,
    description: 'Long-term glucose control marker; elevated levels correlate with low testosterone', category: 'metabolic',
  },
  {
    id: 'hdl', name: 'HDL Cholesterol', unit_primary: 'mg/dL',
    unit_alternatives: [{ unit: 'mmol/L', toCanonical: 38.67 }],
    standard_range_low: 40, standard_range_high: 100, optimal_range_low: 60, optimal_range_high: 100,
    description: 'Protective cholesterol; low HDL is associated with androgen deficiency', category: 'lipids',
  },
  {
    id: 'ldl', name: 'LDL Cholesterol', unit_primary: 'mg/dL',
    unit_alternatives: [{ unit: 'mmol/L', toCanonical: 38.67 }],
    standard_range_low: 0, standard_range_high: 130, optimal_range_low: 0, optimal_range_high: 100,
    description: 'Cardiovascular risk marker; cholesterol is a precursor to testosterone', category: 'lipids',
  },
  {
    id: 'triglycerides', name: 'Triglycerides', unit_primary: 'mg/dL',
    unit_alternatives: [{ unit: 'mmol/L', toCanonical: 88.57 }],
    standard_range_low: 0, standard_range_high: 150, optimal_range_low: 0, optimal_range_high: 100,
    description: 'Elevated triglycerides indicate insulin resistance and correlate with low testosterone', category: 'lipids',
  },
  {
    id: 'hematocrit', name: 'Hematocrit', unit_primary: '%',
    standard_range_low: 38.3, standard_range_high: 50, optimal_range_low: 42, optimal_range_high: 50,
    description: 'Red blood cell percentage', category: 'metabolic',
  },
  {
    id: 'dht', name: 'DHT', unit_primary: 'pg/mL',
    unit_alternatives: [{ unit: 'nmol/L', toCanonical: 289.5 }],
    standard_range_low: 250, standard_range_high: 990, optimal_range_low: 400, optimal_range_high: 800,
    description: 'Potent androgen derived from testosterone', category: 'hormones',
  },
  {
    id: 'albumin', name: 'Albumin', unit_primary: 'g/dL',
    unit_alternatives: [{ unit: 'g/L', toCanonical: 0.1 }],
    standard_range_low: 3.5, standard_range_high: 5.0, optimal_range_low: 4.0, optimal_range_high: 5.0,
    description: 'Required to calculate free testosterone accurately', category: 'metabolic',
  },
  {
    id: 'coq10', name: 'CoQ10 (Coenzyme Q10)', unit_primary: 'mcg/mL',
    standard_range_low: 0.5, standard_range_high: 1.7, optimal_range_low: 1.0, optimal_range_high: 1.7,
    description: 'Depleted by statin medications; essential for mitochondrial energy and testosterone synthesis', category: 'metabolic',
  },
  {
    id: 'cortisol_am', name: 'Morning Cortisol', unit_primary: 'mcg/dL',
    unit_alternatives: [{ unit: 'nmol/L', toCanonical: 0.03625 }],
    standard_range_low: 6, standard_range_high: 23, optimal_range_low: 10, optimal_range_high: 20,
    description: 'Elevated AM cortisol drives pregnenolone steal — diverts testosterone building blocks toward stress hormones', category: 'hormones',
  },
  {
    id: 'psa', name: 'PSA (Prostate-Specific Antigen)', unit_primary: 'ng/mL',
    standard_range_low: 0, standard_range_high: 4.0, optimal_range_low: 0, optimal_range_high: 2.5,
    description: 'Mandatory monitoring on TRT — androgenic stimulation can accelerate prostate tissue growth', category: 'metabolic',
  },
  {
    id: 'ferritin', name: 'Ferritin', unit_primary: 'ng/mL',
    standard_range_low: 12, standard_range_high: 300, optimal_range_low: 50, optimal_range_high: 150,
    description: 'Iron storage marker — elevated ferritin (hemochromatosis) deposits iron in the pituitary and testes, directly suppressing testosterone production', category: 'metabolic',
  },
  {
    id: 'alt', name: 'ALT (Alanine Aminotransferase)', unit_primary: 'U/L',
    standard_range_low: 7, standard_range_high: 56, optimal_range_low: 7, optimal_range_high: 30,
    description: 'Liver enzyme — elevated levels indicate hepatocellular damage; the liver regulates SHBG production and estrogen clearance', category: 'liver',
  },
  {
    id: 'ast', name: 'AST (Aspartate Aminotransferase)', unit_primary: 'U/L',
    standard_range_low: 10, standard_range_high: 40, optimal_range_low: 10, optimal_range_high: 30,
    description: 'Liver/muscle enzyme — elevated with liver damage or intense exercise; liver dysfunction impairs testosterone metabolism and SHBG regulation', category: 'liver',
  },
];

export const CORE_PANEL_IDS = ['total_t', 'free_t', 'shbg', 'albumin'];
export const EXTENDED_PANEL_IDS = ['estradiol', 'lh', 'fsh', 'prolactin', 'vitamin_d', 'cortisol', 'cortisol_am', 'tsh', 'free_t3', 'free_t4', 'glucose', 'fasting_insulin', 'hba1c', 'hdl', 'ldl', 'triglycerides', 'hematocrit', 'dht', 'coq10', 'ferritin', 'alt', 'ast'];
// TRT / active hormone monitoring panel — shown to excluded users
export const TRT_PANEL_IDS = ['total_t', 'free_t', 'estradiol', 'hematocrit', 'lh', 'albumin', 'shbg', 'psa'];
