import { NextResponse } from "next/server";
import { getSnapTradeClient } from "@/lib/snaptrade";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Initialize SnapTrade client
    const snaptrade = getSnapTradeClient();

    let connection = await prisma.brokerageConnection.findFirst({
      where: { userId },
    });

    let snaptradeUserId = connection?.snaptradeUserId;
    let snaptradeUserSecret = connection?.snaptradeUserSecret;

    // 1. Register new SnapTrade user if no DB record exists
    if (!connection) {
      snaptradeUserId = `user_${userId}`;

      const registerResponse = await snaptrade.authentication.registerSnapTradeUser({
        snapTradeRegisterUserRequestBody: {
          userId: snaptradeUserId,
        },
      });

      snaptradeUserSecret = registerResponse.data?.userSecret;

      if (!snaptradeUserSecret) {
        throw new Error("Failed to retrieve user secret from SnapTrade registration.");
      }

      connection = await prisma.brokerageConnection.create({
        data: {
          userId,
          snaptradeUserId,
          snaptradeUserSecret,
          brokerageName: "Charles Schwab",
        },
      });
    }

    // 2. Generate connection portal link
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/brokerage/callback?userId=${userId}`;

    const loginResponse = await snaptrade.authentication.loginSnapTradeUser({
      userId: snaptradeUserId!,
      userSecret: snaptradeUserSecret!,
      broker: "SCHWAB",
      customRedirect: redirectUrl,
      immediateRedirect: true,
    });

    const loginData = loginResponse.data as any;
    const redirectURI = loginData?.redirectURI || loginData?.loginRedirectURI;

    if (!redirectURI) {
      throw new Error("Failed to retrieve redirect URI from SnapTrade response.");
    }

    return NextResponse.json({ redirectUrl: redirectURI });
  } catch (error: any) {
    console.error("SnapTrade Connection Error:", error?.response?.data || error.message);
    return NextResponse.json(
      { error: error?.response?.data?.detail || error.message || "Failed to initialize Schwab connection." },
      { status: 500 }
    );
  }
}