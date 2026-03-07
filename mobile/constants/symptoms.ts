import type { SymptomDefinition } from '../types';

export const SYMPTOMS: SymptomDefinition[] = [
  // Energy & Vitality
  { id: 'chronic_fatigue', name: 'Chronic fatigue or low energy throughout the day', category: 'Energy & Vitality', description: 'Persistent tiredness not relieved by rest — one of the strongest correlates of low testosterone.', correlation_weight: 0.9, related_biomarkers: ['total_t', 'free_t', 'tsh', 'cortisol'] },
  { id: 'tired_after_sleep', name: 'Tired even after 7–8 hours of sleep', category: 'Energy & Vitality', description: 'Waking unrefreshed despite adequate sleep duration.', correlation_weight: 0.8, related_biomarkers: ['total_t', 'cortisol', 'tsh'] },
  { id: 'afternoon_crash', name: 'Afternoon energy crashes (2–4 PM)', category: 'Energy & Vitality', description: 'The classic mid-afternoon slump is linked to cortisol rhythm disruption.', correlation_weight: 0.7, related_biomarkers: ['cortisol', 'glucose'] },
  { id: 'reduced_stamina', name: 'Reduced physical stamina compared to before', category: 'Energy & Vitality', description: 'Noticeable decline in endurance and recovery capacity.', correlation_weight: 0.75, related_biomarkers: ['total_t', 'free_t', 'hematocrit'] },
  { id: 'slow_recovery', name: 'Needing more recovery time after exercise', category: 'Energy & Vitality', description: 'Slower muscle recovery is a hallmark of declining anabolic hormones.', correlation_weight: 0.7, related_biomarkers: ['total_t', 'free_t'] },

  // Body Composition
  { id: 'belly_fat', name: 'Unexplained weight gain, especially around the abdomen', category: 'Body Composition', description: 'Visceral fat accumulation correlates directly with lower testosterone and higher estrogen.', correlation_weight: 0.85, related_biomarkers: ['total_t', 'estradiol', 'glucose'] },
  { id: 'cant_build_muscle', name: 'Difficulty building muscle despite regular training', category: 'Body Composition', description: 'Testosterone is the primary driver of muscle protein synthesis.', correlation_weight: 0.85, related_biomarkers: ['total_t', 'free_t'] },
  { id: 'muscle_loss', name: 'Loss of muscle mass or strength', category: 'Body Composition', description: 'Muscle catabolism is accelerated when anabolic hormones are low.', correlation_weight: 0.9, related_biomarkers: ['total_t', 'free_t'] },
  { id: 'fat_gain', name: 'Increased body fat despite no diet/exercise changes', category: 'Body Composition', description: 'Low T shifts body composition toward fat storage over muscle.', correlation_weight: 0.8, related_biomarkers: ['total_t', 'estradiol', 'glucose'] },

  // Sexual Health
  { id: 'low_libido', name: 'Noticeably reduced sex drive / libido', category: 'Sexual Health', description: 'Libido is one of the most testosterone-sensitive functions in men.', correlation_weight: 0.95, related_biomarkers: ['total_t', 'free_t', 'prolactin'] },
  { id: 'erectile_difficulty', name: 'Erectile difficulty (achieving or maintaining)', category: 'Sexual Health', description: 'Testosterone supports nitric oxide production critical for erectile function.', correlation_weight: 0.9, related_biomarkers: ['total_t', 'free_t', 'estradiol'] },
  { id: 'no_morning_erections', name: 'Fewer or absent morning erections', category: 'Sexual Health', description: 'Morning erections are a direct indicator of nocturnal testosterone levels.', correlation_weight: 0.95, related_biomarkers: ['total_t', 'free_t'] },
  { id: 'reduced_orgasm', name: 'Reduced intensity of orgasms', category: 'Sexual Health', description: 'Orgasm intensity and satisfaction are modulated by androgen levels.', correlation_weight: 0.75, related_biomarkers: ['total_t', 'free_t'] },

  // Mood & Cognition
  { id: 'irritability', name: 'Persistent irritability or short temper', category: 'Mood & Cognition', description: 'Low testosterone causes emotional dysregulation and irritability.', correlation_weight: 0.8, related_biomarkers: ['total_t', 'estradiol'] },
  { id: 'low_motivation', name: 'Low motivation or drive (feeling "flat")', category: 'Mood & Cognition', description: 'Dopaminergic drive is linked to testosterone — low T causes apathy.', correlation_weight: 0.85, related_biomarkers: ['total_t', 'free_t'] },
  { id: 'brain_fog', name: 'Brain fog — difficulty concentrating or thinking clearly', category: 'Mood & Cognition', description: 'Testosterone receptors in the brain affect cognitive sharpness and focus.', correlation_weight: 0.8, related_biomarkers: ['total_t', 'free_t', 'tsh'] },
  { id: 'memory_problems', name: 'Memory problems or difficulty recalling details', category: 'Mood & Cognition', description: 'Cognitive decline is a documented effect of testosterone deficiency.', correlation_weight: 0.7, related_biomarkers: ['total_t', 'free_t'] },
  { id: 'sadness_apathy', name: 'Feelings of sadness, apathy, or mild depression', category: 'Mood & Cognition', description: 'Low testosterone is strongly linked to depressive symptoms in men.', correlation_weight: 0.85, related_biomarkers: ['total_t', 'free_t', 'prolactin'] },
  { id: 'anxiety', name: 'Increased anxiety without clear cause', category: 'Mood & Cognition', description: 'Hormonal imbalance — particularly elevated cortisol or estrogen — drives anxiety.', correlation_weight: 0.7, related_biomarkers: ['cortisol', 'estradiol'] },

  // Sleep
  { id: 'cant_fall_asleep', name: 'Difficulty falling asleep', category: 'Sleep', description: 'Low testosterone disrupts the normal sleep architecture.', correlation_weight: 0.65, related_biomarkers: ['cortisol', 'total_t'] },
  { id: 'waking_at_night', name: 'Waking frequently during the night', category: 'Sleep', description: 'Night waking is associated with cortisol rhythm disruption.', correlation_weight: 0.7, related_biomarkers: ['cortisol', 'total_t'] },
  { id: 'unrefreshed', name: 'Waking up feeling unrefreshed', category: 'Sleep', description: 'Poor sleep quality suppresses the nocturnal testosterone production surge.', correlation_weight: 0.8, related_biomarkers: ['total_t', 'cortisol'] },
  { id: 'night_sweats', name: 'Night sweats or hot flashes', category: 'Sleep', description: 'Vasomotor symptoms can indicate significant hormonal imbalance.', correlation_weight: 0.65, related_biomarkers: ['total_t', 'estradiol'] },

  // Physical Signs
  { id: 'hair_thinning', name: 'Hair thinning or accelerated hair loss', category: 'Physical Signs', description: 'DHT-driven hair follicle miniaturization. High DHT or genetic sensitivity.', correlation_weight: 0.5, related_biomarkers: ['dht'] },
  { id: 'joint_pain', name: 'Joint or muscle aches without injury', category: 'Physical Signs', description: 'Testosterone has anti-inflammatory effects; low T increases joint pain sensitivity.', correlation_weight: 0.6, related_biomarkers: ['total_t', 'free_t'] },
  { id: 'gynecomastia', name: 'Breast tissue tenderness or slight enlargement', category: 'Physical Signs', description: 'Gynecomastia indicates high estrogen relative to testosterone.', correlation_weight: 0.9, related_biomarkers: ['estradiol', 'prolactin'] },
];

export const SYMPTOM_CATEGORIES = [
  'Energy & Vitality',
  'Body Composition',
  'Sexual Health',
  'Mood & Cognition',
  'Sleep',
  'Physical Signs',
];

export const SYMPTOM_MAP = Object.fromEntries(SYMPTOMS.map(s => [s.id, s]));
