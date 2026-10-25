import { NextRequest, NextResponse } from 'next/server';
import { ThinkingLevel, Type } from '@google/genai';
import { getGenAI, GEMINI_MODELS } from '../../../lib/gemini';

export interface ParsedQuickLog {
  weight_kg: number | null;
  steps: number | null;
  water_glasses: number | null;
  meal_status: 'clean' | 'cheat' | null;
  mood: 'good' | 'neutral' | 'bad' | null;
  source: 'deterministic' | 'ai';
  summary: string;
}

/**
 * Fast local deterministic parser for common quick-log sentences.
 * E.g. "Weighed 94.5 kg, walked 8k steps, 2.5L water, ate clean, feeling good"
 */
function parseDeterministically(input: string): ParsedQuickLog {
  const text = input.toLowerCase();
  let weight_kg: number | null = null;
  let steps: number | null = null;
  let water_glasses: number | null = null;
  let meal_status: 'clean' | 'cheat' | null = null;
  let mood: 'good' | 'neutral' | 'bad' | null = null;

  // 1. Weight (e.g., "94.5 kg", "weighed 94.5", "weight 94.5kg")
  const weightMatch =
    text.match(/(?:weighed|weight|wt|at)?\s*(\d{2,3}(?:\.\d{1,2})?)\s*(?:kg|kgs|kilo|kilos)\b/) ||
    text.match(/\b(?:weighed|weight|wt)\s*(?:is|was|:)?\s*(\d{2,3}(?:\.\d{1,2})?)\b/);
  if (weightMatch) {
    const val = parseFloat(weightMatch[1]);
    if (val >= 30 && val <= 300) {
      weight_kg = +val.toFixed(1);
    }
  }

  // 2. Steps (e.g., "8000 steps", "8.5k steps", "steps 10000")
  const stepsMatch =
    text.match(/(\d+(?:\.\d+)?)\s*(k)?\s*steps\b/) ||
    text.match(/\bsteps\s*(?:is|was|:)?\s*(\d+(?:\.\d+)?)\s*(k)?\b/);
  if (stepsMatch) {
    let val = parseFloat(stepsMatch[1].replace(/,/g, ''));
    if (stepsMatch[2] === 'k') val *= 1000;
    if (val >= 50 && val <= 100000) {
      steps = Math.round(val);
    }
  }

  // 3. Water (e.g., "2.5l water", "3 liters", "8 glasses of water", "water 2.5")
  const waterMatch =
    text.match(/(\d+(?:\.\d+)?)\s*(?:l|liter|liters|litre|litres|glasses|glass)\s*(?:of\s+water|water)?\b/) ||
    text.match(/\b(?:water|drank|hydrated)\s*(?:is|was|:)?\s*(\d+(?:\.\d+)?)\s*(?:l|liter|liters|glasses|glass)?\b/);
  if (waterMatch) {
    const val = parseFloat(waterMatch[1]);
    if (val > 0 && val <= 30) {
      water_glasses = +val.toFixed(2);
    }
  }

  // 4. Meal status ("clean", "on track", "healthy" vs "cheat", "junk", "off track")
  if (/\b(clean|healthy|on[-\s]?track|good\s+meals?|diet\s+good)\b/.test(text)) {
    meal_status = 'clean';
  } else if (/\b(cheat|junk|off[-\s]?track|bad\s+meals?|binge)\b/.test(text)) {
    meal_status = 'cheat';
  }

  // 5. Mood ("good", "great", "happy", "energized" vs "neutral", "okay", "fine" vs "bad", "tired", "sad", "stressed")
  if (/\b(mood\s+good|feeling\s+good|felt\s+good|feeling\s+great|felt\s+great|happy|energized|awesome)\b/.test(text) || /\bmood\s*:\s*good\b/.test(text)) {
    mood = 'good';
  } else if (/\b(mood\s+neutral|feeling\s+okay|felt\s+okay|neutral|average|meh)\b/.test(text) || /\bmood\s*:\s*neutral\b/.test(text)) {
    mood = 'neutral';
  } else if (/\b(mood\s+bad|feeling\s+bad|felt\s+bad|sad|exhausted|stressed|low\s+energy)\b/.test(text) || /\bmood\s*:\s*bad\b/.test(text)) {
    mood = 'bad';
  }

  const parts: string[] = [];
  if (weight_kg !== null) parts.push(`${weight_kg} kg`);
  if (steps !== null) parts.push(`${steps.toLocaleString()} steps`);
  if (water_glasses !== null) parts.push(`${water_glasses} water`);
  if (meal_status !== null) parts.push(`${meal_status} meals`);
  if (mood !== null) parts.push(`${mood} mood`);

  return {
    weight_kg,
    steps,
    water_glasses,
    meal_status,
    mood,
    source: 'deterministic',
    summary: parts.length > 0 ? `Parsed: ${parts.join(' · ')}` : '',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Please enter or speak what you want to log.' },
        { status: 400 }
      );
    }

    const det = parseDeterministically(text);
    const detFieldCount = [
      det.weight_kg,
      det.steps,
      det.water_glasses,
      det.meal_status,
      det.mood,
    ].filter(v => v !== null).length;

    // If deterministic parser caught at least 2 fields or the input is short & matched 1 field, return immediately if no AI key or if unambiguous
    if (!process.env.GEMINI_API_KEY && detFieldCount > 0) {
      return NextResponse.json({ success: true, data: det });
    }

    // Use Gemini 3.8 Flash with structured JSON output to accurately parse natural phrasing
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
          model: GEMINI_MODELS.FAST_TEXT,
          contents: `Extract daily health log metrics from this user note: "${text}".
Rules:
- weight_kg: number in kilograms (convert lbs to kg if user says lbs/pounds). Null if not mentioned.
- steps: integer step count (e.g. "8k" = 8000). Null if not mentioned.
- water_glasses: number of liters or glasses of water mentioned (e.g. "2.5L" -> 2.5, "8 glasses" -> 8). Null if not mentioned.
- meal_status: "clean" if meals were healthy/clean/on-track, "cheat" if cheat meal/junk/off-track, or null if not mentioned.
- mood: "good", "neutral", or "bad" based on how they felt, or null if not mentioned.`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                weight_kg: { type: Type.NUMBER, nullable: true },
                steps: { type: Type.INTEGER, nullable: true },
                water_glasses: { type: Type.NUMBER, nullable: true },
                meal_status: { type: Type.STRING, nullable: true },
                mood: { type: Type.STRING, nullable: true },
              },
            },
          },
        });

        const rawJson = response.text?.trim();
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          const merged: ParsedQuickLog = {
            weight_kg: typeof parsed.weight_kg === 'number' ? +parsed.weight_kg.toFixed(1) : det.weight_kg,
            steps: typeof parsed.steps === 'number' ? Math.round(parsed.steps) : det.steps,
            water_glasses: typeof parsed.water_glasses === 'number' ? +parsed.water_glasses.toFixed(2) : det.water_glasses,
            meal_status:
              parsed.meal_status === 'clean' || parsed.meal_status === 'cheat'
                ? parsed.meal_status
                : det.meal_status,
            mood:
              parsed.mood === 'good' || parsed.mood === 'neutral' || parsed.mood === 'bad'
                ? parsed.mood
                : det.mood,
            source: 'ai',
            summary: '',
          };

          const parts: string[] = [];
          if (merged.weight_kg !== null) parts.push(`${merged.weight_kg} kg`);
          if (merged.steps !== null) parts.push(`${merged.steps.toLocaleString()} steps`);
          if (merged.water_glasses !== null) parts.push(`${merged.water_glasses} water`);
          if (merged.meal_status !== null) parts.push(`${merged.meal_status} meals`);
          if (merged.mood !== null) parts.push(`${merged.mood} mood`);
          merged.summary = parts.length > 0 ? `Logged: ${parts.join(' · ')}` : '';

          if (parts.length > 0) {
            return NextResponse.json({ success: true, data: merged });
          }
        }
      } catch (aiErr) {
        console.warn('[QuickLog API] AI fallback error, using deterministic result:', aiErr);
      }
    }

    if (detFieldCount > 0) {
      return NextResponse.json({ success: true, data: det });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Could not find weight, steps, water, meal status, or mood in your note. Try: "94.5 kg, 8000 steps, 2.5L water, clean meal"',
      },
      { status: 422 }
    );
  } catch (err: any) {
    console.error('[QuickLog API Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process quick log' },
      { status: 500 }
    );
  }
}
