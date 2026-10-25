import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Seed data from seed_test_data.sql for offline/mock fallback
const INITIAL_LOGS = [
  { id: 1, log_date: '2026-06-24', weight_kg: 103.2, steps: 7800, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: 103.6, weight_after_toilet: 103.2 },
  { id: 2, log_date: '2026-06-25', weight_kg: 103.0, steps: 9200, water_glasses: 7, meal_status: 'clean', mood: 'good', weight_before_toilet: null, weight_after_toilet: null },
  { id: 3, log_date: '2026-06-26', weight_kg: 103.4, steps: 6500, water_glasses: 4, meal_status: 'cheat', mood: 'neutral', weight_before_toilet: 103.8, weight_after_toilet: 103.4 },
  { id: 4, log_date: '2026-06-27', weight_kg: 103.1, steps: 10100, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: 103.5, weight_after_toilet: 103.1 },
  { id: 5, log_date: '2026-06-28', weight_kg: 102.9, steps: 8800, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: 103.3, weight_after_toilet: 102.9 },
  { id: 6, log_date: '2026-06-29', weight_kg: 103.3, steps: null, water_glasses: 3, meal_status: 'cheat', mood: 'bad', weight_before_toilet: null, weight_after_toilet: null },
  { id: 7, log_date: '2026-06-30', weight_kg: 103.0, steps: 7600, water_glasses: 7, meal_status: 'clean', mood: 'neutral', weight_before_toilet: 103.4, weight_after_toilet: 103.0 },
  { id: 8, log_date: '2026-07-01', weight_kg: 102.8, steps: 9400, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: 103.2, weight_after_toilet: 102.8 },
  { id: 9, log_date: '2026-07-02', weight_kg: 102.6, steps: 8100, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: null, weight_after_toilet: null },
  { id: 10, log_date: '2026-07-03', weight_kg: 102.9, steps: 5200, water_glasses: 4, meal_status: 'cheat', mood: 'neutral', weight_before_toilet: 103.3, weight_after_toilet: 102.9 },
  { id: 11, log_date: '2026-07-04', weight_kg: 102.5, steps: 11200, water_glasses: 10, meal_status: 'clean', mood: 'good', weight_before_toilet: 102.9, weight_after_toilet: 102.5 },
  { id: 12, log_date: '2026-07-05', weight_kg: 102.3, steps: 9600, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: 102.7, weight_after_toilet: 102.3 },
  { id: 13, log_date: '2026-07-06', weight_kg: 102.7, steps: null, water_glasses: 3, meal_status: 'cheat', mood: 'bad', weight_before_toilet: null, weight_after_toilet: null },
  { id: 14, log_date: '2026-07-07', weight_kg: 102.4, steps: 8300, water_glasses: 7, meal_status: 'clean', mood: 'neutral', weight_before_toilet: 102.8, weight_after_toilet: 102.4 },
  { id: 15, log_date: '2026-07-08', weight_kg: 102.2, steps: 9700, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: 102.6, weight_after_toilet: 102.2 },
  { id: 16, log_date: '2026-07-09', weight_kg: 102.0, steps: 7900, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: null, weight_after_toilet: null },
  { id: 17, log_date: '2026-07-10', weight_kg: 102.4, steps: 6100, water_glasses: 4, meal_status: 'cheat', mood: 'bad', weight_before_toilet: 102.8, weight_after_toilet: 102.4 },
  { id: 18, log_date: '2026-07-11', weight_kg: 102.1, steps: 10500, water_glasses: 8, meal_status: 'clean', mood: 'neutral', weight_before_toilet: 102.5, weight_after_toilet: 102.1 },
  { id: 19, log_date: '2026-07-12', weight_kg: 101.9, steps: 9100, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: 102.3, weight_after_toilet: 101.9 },
  { id: 20, log_date: '2026-07-13', weight_kg: 102.2, steps: 7200, water_glasses: 7, meal_status: 'clean', mood: 'neutral', weight_before_toilet: null, weight_after_toilet: null },
  { id: 21, log_date: '2026-07-14', weight_kg: 101.8, steps: 8700, water_glasses: 6, meal_status: 'clean', mood: 'good', weight_before_toilet: 102.2, weight_after_toilet: 101.8 },
  { id: 22, log_date: '2026-07-15', weight_kg: 101.6, steps: 9900, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: 102.0, weight_after_toilet: 101.6 },
  { id: 23, log_date: '2026-07-16', weight_kg: 101.9, steps: 4800, water_glasses: 3, meal_status: 'cheat', mood: 'bad', weight_before_toilet: 102.3, weight_after_toilet: 101.9 },
  { id: 24, log_date: '2026-07-17', weight_kg: 101.5, steps: 10200, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: null, weight_after_toilet: null },
  { id: 25, log_date: '2026-07-18', weight_kg: 101.3, steps: 9300, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: 101.7, weight_after_toilet: 101.3 },
  { id: 26, log_date: '2026-07-19', weight_kg: 101.6, steps: 6700, water_glasses: 4, meal_status: 'cheat', mood: 'neutral', weight_before_toilet: 102.0, weight_after_toilet: 101.6 },
  { id: 27, log_date: '2026-07-20', weight_kg: 101.2, steps: 8900, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: 101.6, weight_after_toilet: 101.2 },
  { id: 28, log_date: '2026-07-21', weight_kg: 101.0, steps: 11400, water_glasses: 10, meal_status: 'clean', mood: 'good', weight_before_toilet: 101.4, weight_after_toilet: 101.0 },
  { id: 29, log_date: '2026-07-22', weight_kg: 101.3, steps: null, water_glasses: 3, meal_status: 'cheat', mood: 'bad', weight_before_toilet: null, weight_after_toilet: null },
  { id: 30, log_date: '2026-07-23', weight_kg: 100.9, steps: 8600, water_glasses: 8, meal_status: 'clean', mood: 'neutral', weight_before_toilet: 101.3, weight_after_toilet: 100.9 },
  { id: 31, log_date: '2026-07-24', weight_kg: 100.7, steps: 9800, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: null, weight_after_toilet: null },
  { id: 32, log_date: '2026-07-25', weight_kg: 101.0, steps: 5900, water_glasses: 4, meal_status: 'cheat', mood: 'neutral', weight_before_toilet: 101.4, weight_after_toilet: 101.0 },
  { id: 33, log_date: '2026-07-26', weight_kg: 100.6, steps: 10100, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: 101.0, weight_after_toilet: 100.6 },
  { id: 34, log_date: '2026-07-27', weight_kg: 100.4, steps: 8400, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: 100.8, weight_after_toilet: 100.4 },
  { id: 35, log_date: '2026-07-28', weight_kg: 100.7, steps: 7300, water_glasses: 7, meal_status: 'clean', mood: 'neutral', weight_before_toilet: null, weight_after_toilet: null },
  { id: 36, log_date: '2026-07-29', weight_kg: 100.3, steps: 9600, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: 100.7, weight_after_toilet: 100.3 },
  { id: 37, log_date: '2026-07-30', weight_kg: 100.1, steps: 10300, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: 100.5, weight_after_toilet: 100.1 },
  { id: 38, log_date: '2026-07-31', weight_kg: 100.5, steps: 4900, water_glasses: 3, meal_status: 'cheat', mood: 'bad', weight_before_toilet: 100.9, weight_after_toilet: 100.5 },
  { id: 39, log_date: '2026-08-01', weight_kg: 100.2, steps: 9200, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: null, weight_after_toilet: null },
  { id: 40, log_date: '2026-08-02', weight_kg: 99.9, steps: 10800, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: 100.3, weight_after_toilet: 99.9 },
  { id: 41, log_date: '2026-08-03', weight_kg: 100.2, steps: 6300, water_glasses: 4, meal_status: 'cheat', mood: 'neutral', weight_before_toilet: 100.6, weight_after_toilet: 100.2 },
  { id: 42, log_date: '2026-08-04', weight_kg: 99.8, steps: 9700, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: 100.2, weight_after_toilet: 99.8 },
  { id: 43, log_date: '2026-08-05', weight_kg: 99.5, steps: 11100, water_glasses: 10, meal_status: 'clean', mood: 'good', weight_before_toilet: 99.9, weight_after_toilet: 99.5 },
  { id: 44, log_date: '2026-08-06', weight_kg: 99.8, steps: null, water_glasses: 3, meal_status: 'cheat', mood: 'bad', weight_before_toilet: null, weight_after_toilet: null },
  { id: 45, log_date: '2026-08-07', weight_kg: 99.4, steps: 8800, water_glasses: 8, meal_status: 'clean', mood: 'neutral', weight_before_toilet: 99.8, weight_after_toilet: 99.4 },
  { id: 46, log_date: '2026-08-08', weight_kg: 99.2, steps: 9500, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: null, weight_after_toilet: null },
  { id: 47, log_date: '2026-08-09', weight_kg: 99.5, steps: 7100, water_glasses: 4, meal_status: 'cheat', mood: 'bad', weight_before_toilet: 99.9, weight_after_toilet: 99.5 },
  { id: 48, log_date: '2026-08-10', weight_kg: 99.1, steps: 10200, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: 99.5, weight_after_toilet: 99.1 },
  { id: 49, log_date: '2026-08-11', weight_kg: 98.9, steps: 9900, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: null, weight_after_toilet: null },
  { id: 50, log_date: '2026-08-12', weight_kg: 99.2, steps: 5800, water_glasses: 4, meal_status: 'cheat', mood: 'neutral', weight_before_toilet: 99.6, weight_after_toilet: 99.2 },
  { id: 51, log_date: '2026-08-13', weight_kg: 98.8, steps: 10400, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: 99.2, weight_after_toilet: 98.8 },
  { id: 52, log_date: '2026-08-14', weight_kg: 98.6, steps: 11200, water_glasses: 10, meal_status: 'clean', mood: 'good', weight_before_toilet: null, weight_after_toilet: null },
  { id: 53, log_date: '2026-08-15', weight_kg: 98.9, steps: 4700, water_glasses: 3, meal_status: 'cheat', mood: 'bad', weight_before_toilet: 99.3, weight_after_toilet: 98.9 },
  { id: 54, log_date: '2026-08-16', weight_kg: 98.5, steps: 9300, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: null, weight_after_toilet: null },
  { id: 55, log_date: '2026-08-17', weight_kg: 98.3, steps: 10600, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: 98.7, weight_after_toilet: 98.3 },
  { id: 56, log_date: '2026-08-18', weight_kg: 98.6, steps: 6400, water_glasses: 4, meal_status: 'cheat', mood: 'neutral', weight_before_toilet: 99.0, weight_after_toilet: 98.6 },
  { id: 57, log_date: '2026-08-19', weight_kg: 98.2, steps: 9800, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: null, weight_after_toilet: null },
  { id: 58, log_date: '2026-08-20', weight_kg: 98.0, steps: 11500, water_glasses: 10, meal_status: 'clean', mood: 'good', weight_before_toilet: 98.4, weight_after_toilet: 98.0 },
  { id: 59, log_date: '2026-08-21', weight_kg: 98.3, steps: 7600, water_glasses: 6, meal_status: 'clean', mood: 'neutral', weight_before_toilet: 98.7, weight_after_toilet: 98.3 },
  { id: 60, log_date: '2026-08-22', weight_kg: 97.8, steps: 9200, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: null, weight_after_toilet: null },
  { id: 61, log_date: '2026-10-18', weight_kg: 96.8, steps: 9500, water_glasses: 8, meal_status: 'clean', mood: 'good', weight_before_toilet: 97.2, weight_after_toilet: 96.8 },
  { id: 62, log_date: '2026-10-19', weight_kg: 96.6, steps: 10200, water_glasses: 9, meal_status: 'clean', mood: 'good', weight_before_toilet: 97.0, weight_after_toilet: 96.6 },
  { id: 63, log_date: '2026-10-20', weight_kg: 96.4, steps: 8400, water_glasses: 7, meal_status: 'clean', mood: 'good', weight_before_toilet: 96.8, weight_after_toilet: 96.4 }
];

const INITIAL_MEASUREMENTS = [
  { id: 1, measurement_date: '2026-06-24', neck_cm: 39.0, chest_cm: 108.0, waist_cm: 101.0, abdomen_cm: 107.0, hip_cm: 115.0, thigh_cm: 64.0, upper_arm_cm: 36.0 },
  { id: 2, measurement_date: '2026-07-01', neck_cm: 38.8, chest_cm: 107.2, waist_cm: 100.0, abdomen_cm: 106.0, hip_cm: 114.2, thigh_cm: 63.4, upper_arm_cm: 35.7 },
  { id: 3, measurement_date: '2026-07-08', neck_cm: 38.6, chest_cm: 106.5, waist_cm: 98.8, abdomen_cm: 104.8, hip_cm: 113.5, thigh_cm: 62.8, upper_arm_cm: 35.3 },
  { id: 4, measurement_date: '2026-07-22', neck_cm: 38.4, chest_cm: 105.8, waist_cm: 97.5, abdomen_cm: 103.5, hip_cm: 112.6, thigh_cm: 62.1, upper_arm_cm: 35.0 },
  { id: 5, measurement_date: '2026-08-05', neck_cm: 38.2, chest_cm: 105.0, waist_cm: 96.0, abdomen_cm: 102.0, hip_cm: 111.5, thigh_cm: 61.5, upper_arm_cm: 34.6 },
  { id: 6, measurement_date: '2026-08-22', neck_cm: 38.0, chest_cm: 104.2, waist_cm: 94.5, abdomen_cm: 100.5, hip_cm: 110.4, thigh_cm: 60.8, upper_arm_cm: 34.2 },
  { id: 7, measurement_date: '2026-10-15', neck_cm: 37.5, chest_cm: 103.0, waist_cm: 93.0, abdomen_cm: 98.5, hip_cm: 109.0, thigh_cm: 60.0, upper_arm_cm: 33.8 }
];

const INITIAL_USER_SETTINGS = [
  { id: 1, goal_weight_kg: 70.0 }
];

function createMockSupabase() {
  const store: Record<string, any[]> = {
    daily_logs: [...INITIAL_LOGS],
    body_measurements: [...INITIAL_MEASUREMENTS],
    user_settings: [...INITIAL_USER_SETTINGS]
  };

  const getStorage = (table: string): any[] => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(`app_store_${table}`);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {
        // ignore storage errors
      }
    }
    return store[table] || [];
  };

  const setStorage = (table: string, data: any[]) => {
    store[table] = data;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(`app_store_${table}`, JSON.stringify(data));
      } catch {
        // ignore storage errors
      }
    }
  };

  class MockQueryBuilder {
    private table: string;
    private operation: 'select' | 'insert' | 'update' | 'upsert';
    private payload: any = null;
    private filters: Array<(row: any) => boolean> = [];
    private sortKey: string | null = null;
    private sortAscending: boolean = true;
    private limitCount: number | null = null;
    private isSingle: boolean = false;
    private isMaybeSingle: boolean = false;

    constructor(table: string, operation: 'select' | 'insert' | 'update' | 'upsert' = 'select', payload: any = null) {
      this.table = table;
      this.operation = operation;
      this.payload = payload;
    }

    select(_columns = '*') {
      return this;
    }

    eq(column: string, value: any) {
      this.filters.push(row => row[column] == value);
      return this;
    }

    neq(column: string, value: any) {
      this.filters.push(row => row[column] != value);
      return this;
    }

    gte(column: string, value: any) {
      this.filters.push(row => row[column] >= value);
      return this;
    }

    lte(column: string, value: any) {
      this.filters.push(row => row[column] <= value);
      return this;
    }

    gt(column: string, value: any) {
      this.filters.push(row => row[column] > value);
      return this;
    }

    lt(column: string, value: any) {
      this.filters.push(row => row[column] < value);
      return this;
    }

    not(column: string, operator: string, value: any) {
      if (operator === 'is' && value === null) {
        this.filters.push(row => row[column] !== null && row[column] !== undefined);
      } else {
        this.filters.push(row => row[column] !== value);
      }
      return this;
    }

    order(column: string, options?: { ascending?: boolean }) {
      this.sortKey = column;
      this.sortAscending = options?.ascending !== false;
      return this;
    }

    limit(count: number) {
      this.limitCount = count;
      return this;
    }

    single() {
      this.isSingle = true;
      return this;
    }

    maybeSingle() {
      this.isMaybeSingle = true;
      return this;
    }

    private execute() {
      let rows = [...getStorage(this.table)];

      if (this.operation === 'insert') {
        const newItems = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted = newItems.map((item, idx) => ({
          id: item.id || Date.now() + idx,
          ...item
        }));
        rows.push(...inserted);
        setStorage(this.table, rows);
        return { data: this.isSingle ? inserted[0] : inserted, error: null };
      }

      if (this.operation === 'update') {
        const updatedItems: any[] = [];
        rows = rows.map(row => {
          const match = this.filters.every(f => f(row));
          if (match) {
            const updated = { ...row, ...this.payload };
            updatedItems.push(updated);
            return updated;
          }
          return row;
        });
        setStorage(this.table, rows);
        return { data: this.isSingle ? updatedItems[0] || null : updatedItems, error: null };
      }

      if (this.operation === 'upsert') {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        items.forEach(item => {
          const matchIndex = rows.findIndex(r => (item.id && r.id === item.id) || (item.log_date && r.log_date === item.log_date) || (item.measurement_date && r.measurement_date === item.measurement_date));
          if (matchIndex >= 0) {
            rows[matchIndex] = { ...rows[matchIndex], ...item };
          } else {
            rows.push({ id: item.id || Date.now(), ...item });
          }
        });
        setStorage(this.table, rows);
        return { data: this.isSingle ? items[0] : items, error: null };
      }

      // SELECT
      for (const filter of this.filters) {
        rows = rows.filter(filter);
      }

      if (this.sortKey) {
        const key = this.sortKey;
        const asc = this.sortAscending;
        rows.sort((a, b) => {
          const valA = a[key];
          const valB = b[key];
          if (valA < valB) return asc ? -1 : 1;
          if (valA > valB) return asc ? 1 : -1;
          return 0;
        });
      }

      if (this.limitCount !== null) {
        rows = rows.slice(0, this.limitCount);
      }

      if (this.isSingle) {
        return { data: rows[0] || null, error: rows.length > 0 ? null : new Error('Row not found') };
      }

      if (this.isMaybeSingle) {
        return { data: rows[0] || null, error: null };
      }

      return { data: rows, error: null };
    }

    then(resolve: (val: any) => any, reject?: (err: any) => any) {
      try {
        const res = this.execute();
        return Promise.resolve(resolve(res));
      } catch (err) {
        if (reject) return Promise.resolve(reject(err));
        return Promise.reject(err);
      }
    }
  }

  return {
    from: (table: string) => ({
      select: (cols = '*') => new MockQueryBuilder(table, 'select').select(cols),
      insert: (payload: any) => new MockQueryBuilder(table, 'insert', payload),
      update: (payload: any) => new MockQueryBuilder(table, 'update', payload),
      upsert: (payload: any, _options?: any) => new MockQueryBuilder(table, 'upsert', payload)
    })
  };
}

function serializeHeaders(headersInit?: HeadersInit): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headersInit) return result;
  if (typeof Headers !== 'undefined' && headersInit instanceof Headers) {
    headersInit.forEach((value, key) => {
      result[key] = value;
    });
  } else if (Array.isArray(headersInit)) {
    for (const [key, value] of headersInit) {
      result[key] = value;
    }
  } else if (typeof headersInit === 'object') {
    for (const [key, value] of Object.entries(headersInit)) {
      if (value !== undefined) result[key] = String(value);
    }
  }
  return result;
}

const customSupabaseFetch: typeof fetch = async (input, init) => {
  // On the server, call upstream directly
  if (typeof window === 'undefined') {
    return fetch(input, init);
  }

  // In the browser, route through same-origin /api/supabase server proxy
  // so client-side ISP blocks / CORS / iframe restrictions never break database queries
  const rawUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

  const parsedUrl = new URL(rawUrl);
  const path = `${parsedUrl.pathname}${parsedUrl.search}`;
  const method = init?.method || 'GET';
  const headers = serializeHeaders(init?.headers);

  let bodyStr: string | null = null;
  if (init?.body !== null && init?.body !== undefined) {
    bodyStr = typeof init.body === 'string' ? init.body : String(init.body);
  }

  const proxyRes = await window.fetch('/api/supabase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path,
      method,
      headers,
      body: bodyStr,
    }),
  });

  if (!proxyRes.ok) {
    const errText = await proxyRes.text();
    return new Response(errText, {
      status: proxyRes.status,
      statusText: proxyRes.statusText,
      headers: { 'content-type': 'application/json' },
    });
  }

  const payload = await proxyRes.json();
  return new Response(payload.bodyText ?? '', {
    status: payload.status || 200,
    statusText: payload.statusText || 'OK',
    headers: payload.headers || { 'content-type': 'application/json' },
  });
};

let clientInstance: any;

const effectiveUrl =
  supabaseUrl && supabaseUrl.startsWith('http')
    ? supabaseUrl
    : typeof window !== 'undefined'
    ? 'https://proxy.supabase.local'
    : '';
const effectiveKey =
  supabaseKey || (typeof window !== 'undefined' ? 'proxy-anon-key' : '');

if (effectiveUrl && effectiveKey) {
  try {
    clientInstance = createClient(effectiveUrl, effectiveKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: customSupabaseFetch,
      },
    });
  } catch (err) {
    console.warn('[Supabase] Client init error, falling back to mock:', err);
    clientInstance = createMockSupabase();
  }
} else {
  clientInstance = createMockSupabase();
}

export const supabase = clientInstance;
