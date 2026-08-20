import { NextResponse } from "next/server";
import { Snaptrade } from "snaptrade-typescript-sdk";
import { prisma } from "@/lib/prisma";

function getSnapTradeClient() {
  const clientId = process.env.SNAPTRADE_CLIENT_ID;
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;

  if (!clientId || !consumerKey) {
    throw new Error(
      "Missing SnapTrade API credentials. Check SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY in .env.local"
    );
  }

  return new Snaptrade({
    clientId,
    consumerKey,
  } as any);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!userId) {
    console.error("SnapTrade Callback Error: Missing userId parameter.");
    return NextResponse.redirect(`${baseUrl}/dashboard?error=missing_user`);
  }

  try {
    const snaptrade = getSnapTradeClient();

    // 1. Fetch user's stored SnapTrade connection credentials
    const connection = await prisma.brokerageConnection.findFirst({
      where: { userId },
    });

    if (!connection) {
      console.error(`SnapTrade Callback Error: Connection record not found for userId ${userId}`);
      return NextResponse.redirect(`${baseUrl}/dashboard?userId=${userId}&error=no_connection`);
    }

    // 2. Fetch fresh user holdings directly from SnapTrade
    const holdingsResponse = await snaptrade.accountInformation.getAllUserHoldings({
      userId: connection.snaptradeUserId,
      userSecret: connection.snaptradeUserSecret,
    });

    const accountsWithHoldings = (holdingsResponse.data as any[]) || [];

    // 3. Upsert holdings into PostgreSQL via Prisma
    const syncPromises: Promise<any>[] = [];

    for (const accountHolding of accountsWithHoldings) {
      const positions = accountHolding.positions || [];

      for (const position of positions) {
        const ticker =
          typeof position.symbol === "string"
            ? position.symbol
            : position.symbol?.symbol?.raw_symbol ||
              position.symbol?.symbol ||
              "UNKNOWN";

        const name = position.symbol?.description || ticker;
        const totalShares = position.units ?? 0;
        const avgCostBasis = position.average_purchase_price ?? 0;
        const currentPrice = position.price ?? avgCostBasis;
        const totalValue = totalShares * currentPrice;
        const totalCost = totalShares * avgCostBasis;
        const unrealizedGain = totalValue - totalCost;
        const unrealizedGainPct = totalCost > 0 ? (unrealizedGain / totalCost) * 100 : 0;

        if (ticker === "UNKNOWN") continue;

        syncPromises.push(
          prisma.holding.upsert({
            where: {
              userId_ticker: {
                userId,
                ticker,
              },
            },
            update: {
              totalShares,
              avgCostBasis,
              currentPrice,
              totalValue,
              unrealizedGain,
              unrealizedGainPct,
              updatedAt: new Date(),
            },
            create: {
              userId,
              ticker,
              name,
              totalShares,
              avgCostBasis,
              currentPrice,
              totalValue,
              unrealizedGain,
              unrealizedGainPct,
            },
          })
        );
      }
    }

    await Promise.all(syncPromises);

    // 4. Redirect user back to dashboard
    return NextResponse.redirect(`${baseUrl}/dashboard?userId=${userId}&connected=true`);
  } catch (error: any) {
    console.error("SnapTrade Callback Route Error:", error?.response?.data || error.message);
    return NextResponse.redirect(`${baseUrl}/dashboard?userId=${userId}&error=sync_failed`);
  }
}