import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function generatePortfolioDigest(
  holdings: Array<{
    ticker: string;
    shares: number;
    costBasis: number;
    currentPrice: number;
    unrealizedGainPct: number;
    isLongTerm: boolean;
  }>,
  profileMatrix: Array<{ archetype: string; percentage: number }>
) {
  const profileContext = profileMatrix
    .map((p) => `${p.archetype} (${p.percentage}%)`)
    .join(", ");

  const prompt = `
You are the primary analytical engine for TradeBrief AI.
Analyze the user's portfolio below based on their exact weighted investor profile matrix:
${profileContext}

Holdings:
${JSON.stringify(holdings, null, 2)}

Provide structured JSON analysis for every ticker. Format:
{
  "digest": [
    {
      "ticker": "STRING",
      "summary": "2-3 sentence overview of latest market activity, earnings, or sector context.",
      "recommendation": "BUY_MORE" | "HOLD" | "TRIM_PARTIAL_SELL" | "SELL_ALL",
      "rationale": "Concise reasoning factoring in cost basis, tax duration (Long-Term vs Short-Term), and weighted profile."
    }
  ]
}
`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  return JSON.parse(response.content[0].type === "text" ? response.content[0].text : "{}");
}