/**
 * Vermeulen/Sodergard equation for calculating free testosterone.
 *
 * Used as a fallback when the patient submits Total T + SHBG + Albumin
 * but does not have a directly measured Free T result.
 *
 * Reference: Vermeulen A, Verdonck L, Kaufman JM (1999).
 * "A critical evaluation of simple methods for the estimation of free testosterone in serum."
 * J Clin Endocrinol Metab 84(10):3666-72.
 */

// Binding constants at 37°C
const KA_SHBG = 1.0e9;   // SHBG association constant (L/mol)
const KA_ALBUMIN = 3.6e4; // Albumin association constant (L/mol)

/**
 * Calculate free testosterone using the Vermeulen equation.
 *
 * @param totalT_ngdl  Total testosterone in ng/dL (canonical unit in our system)
 * @param shbg_nmol    SHBG in nmol/L (canonical unit)
 * @param albumin_gdl  Albumin in g/dL (default 4.3 — population average)
 * @returns Free testosterone in pg/mL (canonical unit in our system)
 */
export function calculateFreeTestosterone(
  totalT_ngdl: number,
  shbg_nmol: number,
  albumin_gdl: number = 4.3
): number {
  // Convert inputs to SI units for the equation
  const totalT_nmol = totalT_ngdl / 28.842;          // ng/dL → nmol/L
  const albumin_mol = (albumin_gdl * 10) / 66430;    // g/dL → g/L → mol/L (MW albumin = 66,430 g/mol)
  const shbg_mol = shbg_nmol * 1e-9;                 // nmol/L → mol/L
  const totalT_mol = totalT_nmol * 1e-9;             // nmol/L → mol/L

  // Solve quadratic for free T concentration
  // From: T_total = T_free + T_bound_SHBG + T_bound_albumin
  // T_bound_SHBG = (KA_SHBG * T_free * SHBG) / (1 + KA_SHBG * T_free)
  // T_bound_albumin = KA_ALBUMIN * T_free * Albumin
  //
  // Rearranges to: a*Tf^2 + b*Tf + c = 0
  const a = KA_SHBG * KA_ALBUMIN * albumin_mol + KA_SHBG;
  const b = 1 + KA_ALBUMIN * albumin_mol + KA_SHBG * (shbg_mol - totalT_mol);
  const c = -totalT_mol;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return 0; // Should not happen with valid inputs

  const freeT_mol = (-b + Math.sqrt(discriminant)) / (2 * a);

  // Convert back: mol/L → nmol/L → pg/mL
  const freeT_nmol = freeT_mol * 1e9;
  const freeT_pgml = freeT_nmol * 2.8842 * 100; // nmol/L → pg/mL (1 nmol/L = 288.42 pg/mL)

  return Math.round(freeT_pgml * 10) / 10; // Round to 1 decimal
}
