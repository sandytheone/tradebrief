import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.SNAPTRADE_CLIENT_ID;
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;

  return NextResponse.json({
    hasClientId: Boolean(clientId),
    clientIdLength: clientId ? clientId.length : 0,
    clientIdStart: clientId ? clientId.substring(0, 5) + "..." : null,
    hasConsumerKey: Boolean(consumerKey),
    consumerKeyLength: consumerKey ? consumerKey.length : 0,
    consumerKeyStart: consumerKey ? consumerKey.substring(0, 5) + "..." : null,
  });
}