import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { resolve } from 'path';

// Parse .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Testing insert into body_measurements...");
  
  const payload = {
    measurement_date: new Date().toISOString().split('T')[0],
    neck_cm: 38.5,
    chest_cm: 100.2
  };

  const { data, error } = await supabase
    .from('body_measurements')
    .upsert([payload], { onConflict: 'measurement_date' })
    .select()
    .single();

  if (error) {
    console.error("Error inserting:", error.message);
    process.exit(1);
  } else {
    console.log("Success! Inserted row:", data);
  }
}

testInsert();
