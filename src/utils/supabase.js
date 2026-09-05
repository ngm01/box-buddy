import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

// A paused or deleted Supabase project loses its DNS record, so requests fail before any
// response exists. Browsers report that as an opaque CORS error with a null status code,
// which points at the wrong problem — log something actionable instead.
const fetchWithNetworkDiagnostics = async (input, init) => {
  try {
    return await fetch(input, init)
  } catch (error) {
    if (error?.name === 'AbortError') throw error

    console.error(
      `[supabase] Could not reach ${supabaseUrl} — the request failed at the network level, ` +
        'so no response came back. Any CORS message in the console is a symptom, not the cause. ' +
        'Most likely the Supabase project is paused (free-tier projects pause after ~7 days of ' +
        'inactivity) or SUPABASE_URL is wrong. Check the project status in the Supabase dashboard.',
      error,
    )
    throw error
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetchWithNetworkDiagnostics },
})
