import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uvfidazctqeazywlebkh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZmlkYXpjdHFlYXp5d2xlYmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NTYwMzQsImV4cCI6MjA5MTMzMjAzNH0.zaeXNThTJReiomK-ncJjCnVN67ruNx6OrTCTMw89A-c'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
