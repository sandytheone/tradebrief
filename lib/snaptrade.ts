import { Snaptrade } from "snaptrade-typescript-sdk";

export function getSnapTradeClient() {
  const clientId = process.env.SNAPTRADE_CLIENT_ID;
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;

  if (!clientId || !consumerKey) {
    throw new Error(
      `Missing SnapTrade credentials in environment variables. ` +
      `Received clientId: ${clientId ? "SET" : "UNDEFINED"}, consumerKey: ${consumerKey ? "SET" : "UNDEFINED"}`
    );
  }

  // Passing consumerKey and clientId explicitly to the SDK constructor
  return new Snaptrade({
    clientId,
    consumerKey,
  } as any);
}