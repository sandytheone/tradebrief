import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, weightings } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (!weightings || !Array.isArray(weightings)) {
      return NextResponse.json({ error: "Invalid weightings payload" }, { status: 400 });
    }

    const totalWeight = weightings.reduce(
      (sum: number, w: { percentage: number }) => sum + w.percentage,
      0
    );
    if (totalWeight !== 100) {
      return NextResponse.json(
        { error: "Archetype percentages must sum to 100%" },
        { status: 400 }
      );
    }

    const profile = await prisma.investorProfile.upsert({
      where: { userId },
      update: {
        weightings: {
          deleteMany: {},
          create: weightings.map((w: { archetype: string; percentage: number }) => ({
            archetype: w.archetype as any,
            percentage: w.percentage,
          })),
        },
      },
      create: {
        userId,
        weightings: {
          create: weightings.map((w: { archetype: string; percentage: number }) => ({
            archetype: w.archetype as any,
            percentage: w.percentage,
          })),
        },
      },
      include: { weightings: true },
    });

    return NextResponse.json(profile);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID parameter required" }, { status: 400 });
    }

    // Query user along with their profile, weightings, and holdings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            weightings: true,
          },
        },
        holdings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}