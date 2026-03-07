export interface BiomarkerDef {
  id: string;
  name: string;
  unit_primary: string;
  standard_range_low: number;
  standard_range_high: number;
  optimal_range_low: number;
  optimal_range_high: number;
  description: string;
  category: string;
}

export const BIOMARKERS: BiomarkerDef[] = [
  { id: 'total_t', name: 'Total Testosterone', unit_primary: 'ng/dL', standard_range_low: 300, standard_range_high: 1000, optimal_range_low: 600, optimal_range_high: 900, description: 'Primary male sex hormone', category: 'hormones' },
  { id: 'free_t', name: 'Free Testosterone', unit_primary: 'pg/mL', standard_range_low: 50, standard_range_high: 210, optimal_range_low: 120, optimal_range_high: 200, description: 'Unbound, biologically active testosterone', category: 'hormones' },
  { id: 'shbg', name: 'SHBG', unit_primary: 'nmol/L', standard_range_low: 10, standard_range_high: 57, optimal_range_low: 20, optimal_range_high: 40, description: 'Sex hormone binding globulin', category: 'hormones' },
  { id: 'estradiol', name: 'Estradiol (E2)', unit_primary: 'pg/mL', standard_range_low: 10, standard_range_high: 40, optimal_range_low: 20, optimal_range_high: 30, description: 'Primary estrogen; balance with testosterone is key', category: 'hormones' },
  { id: 'lh', name: 'LH', unit_primary: 'mIU/mL', standard_range_low: 1.5, standard_range_high: 9.3, optimal_range_low: 3, optimal_range_high: 7, description: 'Luteinizing hormone — signals testes to produce testosterone', category: 'hormones' },
  { id: 'fsh', name: 'FSH', unit_primary: 'mIU/mL', standard_range_low: 1.5, standard_range_high: 12.4, optimal_range_low: 2, optimal_range_high: 8, description: 'Follicle stimulating hormone — fertility indicator', category: 'hormones' },
  { id: 'prolactin', name: 'Prolactin', unit_primary: 'ng/mL', standard_range_low: 2, standard_range_high: 18, optimal_range_low: 2, optimal_range_high: 12, description: 'Elevated prolactin suppresses testosterone', category: 'hormones' },
  { id: 'vitamin_d', name: 'Vitamin D', unit_primary: 'ng/mL', standard_range_low: 20, standard_range_high: 100, optimal_range_low: 60, optimal_range_high: 90, description: 'Critical for testosterone synthesis and immune function', category: 'metabolic' },
  { id: 'cortisol', name: 'Cortisol', unit_primary: 'mcg/dL', standard_range_low: 6, standard_range_high: 23, optimal_range_low: 8, optimal_range_high: 15, description: 'Chronic elevation suppresses testosterone', category: 'metabolic' },
  { id: 'tsh', name: 'TSH', unit_primary: 'mIU/L', standard_range_low: 0.4, standard_range_high: 4.0, optimal_range_low: 1.0, optimal_range_high: 2.5, description: 'Thyroid function affects testosterone metabolism', category: 'thyroid' },
  { id: 'glucose', name: 'Fasting Glucose', unit_primary: 'mg/dL', standard_range_low: 70, standard_range_high: 100, optimal_range_low: 70, optimal_range_high: 90, description: 'Insulin resistance lowers testosterone', category: 'metabolic' },
  { id: 'hematocrit', name: 'Hematocrit', unit_primary: '%', standard_range_low: 38.3, standard_range_high: 50, optimal_range_low: 42, optimal_range_high: 50, description: 'Red blood cell percentage', category: 'metabolic' },
  { id: 'dht', name: 'DHT', unit_primary: 'pg/mL', standard_range_low: 250, standard_range_high: 990, optimal_range_low: 400, optimal_range_high: 800, description: 'Potent androgen derived from testosterone', category: 'hormones' },
];

export const CORE_PANEL_IDS = ['total_t', 'free_t', 'shbg', 'estradiol', 'lh', 'fsh', 'prolactin', 'vitamin_d', 'cortisol'];
export const EXTENDED_PANEL_IDS = ['tsh', 'glucose', 'hematocrit', 'dht'];
