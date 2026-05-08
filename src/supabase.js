import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://khnhenbbwtqysufwropj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtobmhlbmJid3RxeXN1Zndyb3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNTgwMTQsImV4cCI6MjA5MzYzNDAxNH0.MWtn44y5y9J9sA3C9og62VgCXBM7hDK8--NLBnG6ATs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
