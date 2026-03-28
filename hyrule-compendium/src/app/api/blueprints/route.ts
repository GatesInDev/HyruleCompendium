import { NextResponse } from 'next/server';
import { rateLimit } from '@/utils/rate-limit';
import { safeJsonParse, sanitizeInput } from '@/utils/sanitize';
import dbConnect from '@/lib/db/mongodb';
import { Blueprint } from '@/lib/models/Blueprint';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    if (!rateLimit(ip, 20, 60000)) { // Stricter limit for POST
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const bodyText = await request.text();
    const body = safeJsonParse(bodyText);

    if (!body || !body.name || !body.parts) {
      return NextResponse.json({ error: 'Invalid blueprint payload' }, { status: 400 });
    }

    await dbConnect();

    // The sanitization utility already stripped $ operators, but let's be explicitly safe
    const newBlueprint = new Blueprint({
      name: body.name.toString(),
      creator: body.creator ? body.creator.toString() : 'Anonymous Hero',
      parts: body.parts.map((p: any) => ({
        partName: p.partName.toString(),
        quantity: Number(p.quantity) || 1
      })),
      totalEnergyDrain: Number(body.totalEnergyDrain) || 0,
    });

    const saved = await newBlueprint.save();
    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error: any) {
    console.error('Blueprint Post Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save blueprint' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    if (!rateLimit(ip, 100, 60000)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    await dbConnect();
    const blueprints = await Blueprint.find().sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({ success: true, data: blueprints });
  } catch (error: any) {
    console.error('Blueprint Get Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blueprints' },
      { status: 500 }
    );
  }
}
