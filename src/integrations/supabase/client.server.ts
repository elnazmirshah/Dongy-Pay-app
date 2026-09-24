// Server-side Supabase client using the legacy anon JWT.
// This client is intentionally NOT privileged: reads are protected by RLS,
// and writes go through a verified Edge Function.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function createSupabaseServerClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_ANON_KEY ? ['SUPABASE_ANON_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _supabaseServer: ReturnType<typeof createSupabaseServerClient> | undefined;

export const supabaseServer = new Proxy({} as ReturnType<typeof createSupabaseServerClient>, {
  get(_, prop, receiver) {
    if (!_supabaseServer) _supabaseServer = createSupabaseServerClient();
    return Reflect.get(_supabaseServer, prop, receiver);
  },
});
