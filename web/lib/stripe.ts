import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
});

// Single price ID for the LAB package — set in env
export const LAB_PRICE_ID = process.env.STRIPE_LAB_PRICE_ID!;
