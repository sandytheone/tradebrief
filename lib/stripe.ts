import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export const PLANS = {
  MONTHLY: { id: "price_monthly_5_usd", amount: 500, interval: "month" },
  QUARTERLY: { id: "price_quarterly_10_usd", amount: 1000, interval: "quarter" },
};