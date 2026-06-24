export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required")
  }
  return url
}

export function hasSupabasePublishableKey(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  )
}

export function getSupabasePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required"
    )
  }

  return key
}
