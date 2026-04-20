import Stripe from 'stripe';

// Lazy singleton — not instantiated at module evaluation time so the build
// succeeds even when STRIPE_SECRET_KEY is absent from the build environment.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    _stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia', typescript: true });
  }
  return _stripe;
}

// Single price ID for the LAB package — set in env
export const LAB_PRICE_ID = process.env.STRIPE_LAB_PRICE_ID ?? '';
