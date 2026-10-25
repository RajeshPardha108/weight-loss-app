import { supabase } from './supabase';

export const CURRENT_ACTIVE_GOAL = 95.0;
export const DEFAULT_FINAL_GOAL = 70.0;

export async function fetchUserGoals() {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('goal_weight_kg')
      .eq('id', 1)
      .maybeSingle();

    const finalGoal =
      !error && data?.goal_weight_kg ? Number(data.goal_weight_kg) : DEFAULT_FINAL_GOAL;
    
    return {
      activeGoal: CURRENT_ACTIVE_GOAL,
      finalGoal: finalGoal
    };
  } catch (err) {
    console.error("Exception fetching goals:", err);
    return {
      activeGoal: CURRENT_ACTIVE_GOAL,
      finalGoal: DEFAULT_FINAL_GOAL
    };
  }
}

export async function fetchLatestWeight() {
  try {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('weight_kg')
      .not('weight_kg', 'is', null)
      .order('log_date', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error("Error fetching latest weight:", error);
    }
    
    return data?.weight_kg ? Number(data.weight_kg) : null;
  } catch (err) {
    console.error("Exception fetching latest weight:", err);
    return null;
  }
}
