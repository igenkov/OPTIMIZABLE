export interface SymptomDef {
  id: string;
  name: string;
  category: string;
  correlation_weight: number;
}

export const SYMPTOM_CATEGORIES = [
  'Energy & Vitality',
  'Body Composition',
  'Sexual Health',
  'Mood & Cognition',
  'Sleep',
  'Physical Signs',
];

export const SYMPTOMS: SymptomDef[] = [
  { id: 'low_energy', name: 'Persistent fatigue or low energy', category: 'Energy & Vitality', correlation_weight: 0.9 },
  { id: 'afternoon_crash', name: 'Afternoon energy crashes', category: 'Energy & Vitality', correlation_weight: 0.7 },
  { id: 'low_motivation', name: 'Loss of drive or motivation', category: 'Energy & Vitality', correlation_weight: 0.85 },
  { id: 'reduced_endurance', name: 'Reduced exercise endurance', category: 'Energy & Vitality', correlation_weight: 0.75 },
  { id: 'muscle_loss', name: 'Muscle loss or difficulty building muscle', category: 'Body Composition', correlation_weight: 0.9 },
  { id: 'fat_gain', name: 'Fat gain (especially around belly/chest)', category: 'Body Composition', correlation_weight: 0.85 },
  { id: 'gynecomastia', name: 'Breast tissue development (gynecomastia)', category: 'Body Composition', correlation_weight: 0.95 },
  { id: 'reduced_strength', name: 'Significant strength reduction', category: 'Body Composition', correlation_weight: 0.8 },
  { id: 'low_libido', name: 'Low sex drive', category: 'Sexual Health', correlation_weight: 0.95 },
  { id: 'ed', name: 'Erectile dysfunction', category: 'Sexual Health', correlation_weight: 0.9 },
  { id: 'reduced_ejaculate', name: 'Reduced ejaculate volume', category: 'Sexual Health', correlation_weight: 0.8 },
  { id: 'fertility_concerns', name: 'Fertility concerns', category: 'Sexual Health', correlation_weight: 0.75 },
  { id: 'depression', name: 'Low mood or depression', category: 'Mood & Cognition', correlation_weight: 0.85 },
  { id: 'anxiety', name: 'Increased anxiety or irritability', category: 'Mood & Cognition', correlation_weight: 0.75 },
  { id: 'brain_fog', name: 'Brain fog or poor concentration', category: 'Mood & Cognition', correlation_weight: 0.8 },
  { id: 'poor_memory', name: 'Poor memory or recall', category: 'Mood & Cognition', correlation_weight: 0.7 },
  { id: 'insomnia', name: 'Difficulty falling or staying asleep', category: 'Sleep', correlation_weight: 0.75 },
  { id: 'non_restorative', name: 'Waking unrefreshed', category: 'Sleep', correlation_weight: 0.7 },
  { id: 'sleep_apnea', name: 'Snoring or suspected sleep apnea', category: 'Sleep', correlation_weight: 0.8 },
  { id: 'hair_loss', name: 'Accelerated hair loss', category: 'Physical Signs', correlation_weight: 0.65 },
  { id: 'dry_skin', name: 'Dry skin or reduced body hair', category: 'Physical Signs', correlation_weight: 0.6 },
  { id: 'hot_flashes', name: 'Hot flashes or night sweats', category: 'Physical Signs', correlation_weight: 0.85 },
  { id: 'joint_pain', name: 'Joint aches or pain', category: 'Physical Signs', correlation_weight: 0.7 },
  { id: 'testicular_ache', name: 'Testicular discomfort', category: 'Physical Signs', correlation_weight: 0.8 },
  { id: 'slow_recovery', name: 'Slow recovery from exercise', category: 'Physical Signs', correlation_weight: 0.75 },
  { id: 'none', name: 'None of the above', category: 'Physical Signs', correlation_weight: 0 },
];
