import { NextResponse } from 'next/server';
import { rateLimit } from '@/utils/rate-limit';
import { safeJsonParse } from '@/utils/sanitize';
import dbConnect from '@/lib/db/mongodb';
import { UserProgress } from '@/lib/models/UserProgress';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    if (!rateLimit(ip, 50, 60000)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const bodyText = await request.text();
    const body = safeJsonParse(bodyText);

    if (!body || !body.userId) {
      return NextResponse.json({ error: 'Missing userId in payload' }, { status: 400 });
    }

    await dbConnect();

    // Use findOneAndUpdate with upsert to create or update progress cleanly
    const updatePayload = {
      ...(body.completedShrines && { completedShrines: body.completedShrines }),
      ...(body.completedKoroks && { completedKoroks: body.completedKoroks }),
      updatedAt: new Date()
    };

    const progress = await UserProgress.findOneAndUpdate(
      { userId: body.userId.toString() },
      { $set: updatePayload },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, data: progress });
  } catch (error: any) {
    console.error('Progress Post Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save progress' },
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
    }

    await dbConnect();
    let progress = await UserProgress.findOne({ userId: userId.toString() }).lean();
    
    if (!progress) {
       // Return empty skeleton instead of 404
       progress = { userId, completedShrines: [], completedKoroks: [] } as any;
    }

    return NextResponse.json({ success: true, data: progress });
  } catch (error: any) {
    console.error('Progress Get Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
