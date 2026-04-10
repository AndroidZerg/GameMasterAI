"""
Supabase client for Publisher Portal.
Uses service role key for admin operations (bypasses RLS).
Uses anon key + user JWT for authenticated publisher operations.

Required Render env vars for Publisher Portal:
  SUPABASE_URL = https://uvfidazctqeazywlebkh.supabase.co
  SUPABASE_ANON_KEY = (the anon key — public/publishable)
  SUPABASE_SERVICE_KEY = (from Supabase dashboard > Project Settings > API)
  SUPABASE_JWT_SECRET = (from Supabase dashboard > Project Settings > API > JWT Secret)
"""
import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    "https://uvfidazctqeazywlebkh.supabase.co",
)
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZmlkYXpjdHFlYXp5d2xlYmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NTYwMzQsImV4cCI6MjA5MTMzMjAzNH0.zaeXNThTJReiomK-ncJjCnVN67ruNx6OrTCTMw89A-c",
)
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


def get_admin_client() -> Client:
    """Service role client — bypasses RLS. Use for admin/backend operations."""
    if not SUPABASE_SERVICE_KEY:
        raise RuntimeError("SUPABASE_SERVICE_KEY not set")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_anon_client() -> Client:
    """Anon client — respects RLS. Use for public operations."""
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
