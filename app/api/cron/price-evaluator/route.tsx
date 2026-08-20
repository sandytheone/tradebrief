import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import webpush from "web-push";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

webpush.setVapidDetails(
  "mailto:alerts@tradebrief.ai",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  const { ticker, priceChangePercent, currentPrice, newsHeadlines } = await req.json();

  // Retrieve users holding this ticker with active alert preferences
  const holdings = await prisma.holding.findMany({
    where: { ticker },
    include: {
      user: {
        include: {
          investorProfile: { include: { weightings: true } },
          pushSubscriptions: true,
        },
      },
      taxLots: true,
    },
  });

  for (const holding of holdings) {
    const profile = holding.user.investorProfile?.weightings
      .map((w) => `${w.archetype}: ${w.percentage}%`)
      .join(", ");

    const prompt = `
    Analyze this intraday price event for ${ticker}:
    - Intraday Move: ${priceChangePercent}%
    - Current Price: $${currentPrice}
    - User Cost Basis: $${holding.avgCostBasis}
    - Tax Duration: ${holding.taxLots.some((l) => l.isLongTerm) ? "Long-Term (Lower Tax)" : "Short-Term"}
    - User Strategy Weighting: ${profile}
    - Recent News: ${JSON.stringify(newsHeadlines)}

    Determine if this event warrants a push notification.
    Respond ONLY in valid JSON format:
    {
      "recommendation": "BUY_MORE" | "HOLD" | "SELL_PARTIAL" | "SELL_ALL",
      "rationale": "2-sentence push notification text detailing action and core reason."
    }
    `;

    const aiRes = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const decision = JSON.parse(aiRes.content[0].type === "text" ? aiRes.content[0].text : "{}");

    // FILTER CONSTRAINT: Suppress notification if HOLD
    if (["BUY_MORE", "SELL_PARTIAL", "SELL_ALL"].includes(decision.recommendation)) {
      for (const sub of holding.user.pushSubscriptions) {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: `TradeBrief Alert: ${ticker} [${decision.recommendation.replace("_", " ")}]`,
            body: decision.rationale,
            url: `/dashboard?ticker=${ticker}`,
          })
        );
      }
    }
  }

  return NextResponse.json({ processed: holdings.length });
}