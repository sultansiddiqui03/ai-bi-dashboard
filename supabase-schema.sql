-- Run this in your Supabase SQL Editor to create the analyses table
-- Dashboard → SQL Editor → New Query → Paste & Run

CREATE TABLE IF NOT EXISTS analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  row_count INTEGER,
  col_count INTEGER,
  columns JSONB,
  stats JSONB,
  analysis TEXT,
  kpis JSONB,
  charts JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast recent queries
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at DESC);

-- Disable RLS for simplicity (public portfolio project)
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON analyses FOR ALL USING (true) WITH CHECK (true);
