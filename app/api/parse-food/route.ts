import { NextResponse } from 'next/server';
import { SmartFoodInputService } from '../../../lib/ai/smartFoodInputService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Text input is required.' },
        { status: 400 }
      );
    }

    const service = new SmartFoodInputService();
    const result = await service.parseFoodInput(text);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[API /api/parse-food Error]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to parse food input.' },
      { status: 500 }
    );
  }
}
