import { NextResponse } from 'next/server';
import { FoodMatcher } from '../../../lib/nutrition/foodMatcher';
import { ParsedFoodItem } from '../../../lib/ai/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { item } = body as { item: ParsedFoodItem };

    if (!item || !item.food) {
      return NextResponse.json(
        { success: false, error: 'Parsed food item is required.' },
        { status: 400 }
      );
    }

    const matcher = new FoodMatcher();
    const matchResult = await matcher.matchFoodItem(item);

    return NextResponse.json({ success: true, data: matchResult });
  } catch (error: any) {
    console.error('[API /api/match-food Error]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to match food candidate.' },
      { status: 500 }
    );
  }
}
