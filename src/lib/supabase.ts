import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const createMockClient = (): any => ({
  from: () => ({
    select: () => ({ data: null, error: new Error('Supabase not configured') }),
    insert: () => ({ data: null, error: new Error('Supabase not configured') }),
    update: () => ({ data: null, error: new Error('Supabase not configured') }),
    delete: () => ({ data: null, error: new Error('Supabase not configured') }),
    eq: () => ({ data: null, error: new Error('Supabase not configured') }),
    maybeSingle: () => ({ data: null, error: new Error('Supabase not configured') }),
    single: () => ({ data: null, error: new Error('Supabase not configured') }),
    order: () => ({ data: null, error: new Error('Supabase not configured') }),
  }),
  auth: {
    signUp: () => ({ data: null, error: new Error('Supabase not configured') }),
    signIn: () => ({ data: null, error: new Error('Supabase not configured') }),
    signOut: () => ({ data: null, error: new Error('Supabase not configured') }),
  },
});

let supabaseInstance: SupabaseClient | any;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase credentials not found. Using mock client. Database features will not work.');
  supabaseInstance = createMockClient();
}

export const supabase = supabaseInstance;
