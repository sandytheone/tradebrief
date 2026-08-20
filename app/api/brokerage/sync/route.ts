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

export async function POST(req: Request) {
  try {
    const snaptrade = getSnapTradeClient();
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    // 1. Fetch user's stored SnapTrade credentials from PostgreSQL
    const connection = await prisma.brokerageConnection.findFirst({
      where: { userId },
    });

    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          error: "No connected brokerage account found for this user.",
        },
        { status: 404 }
      );
    }

    // 2. Fetch all user holdings across linked accounts from SnapTrade
    const holdingsResponse = await snaptrade.accountInformation.getAllUserHoldings({
      userId: connection.snaptradeUserId,
      userSecret: connection.snaptradeUserSecret,
    });

    const accountsWithHoldings = (holdingsResponse.data as any[]) || [];

    // 3. Upsert holdings into Prisma database
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

    return NextResponse.json({
      success: true,
      message: "Holdings successfully synchronized.",
      syncedAccountsCount: accountsWithHoldings.length,
    });
  } catch (error: any) {
    console.error("SnapTrade Sync Error:", error?.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error:
          error?.response?.data?.detail ||
          error.message ||
          "Failed to sync holdings from Charles Schwab.",
      },
      { status: 500 }
    );
  }
}