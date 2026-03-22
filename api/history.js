// Vercel Serverless Function — saves and retrieves analysis history via Supabase
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured.' });
  }

  // GET — list recent analyses or fetch one by id
  if (req.method === 'GET') {
    const { id } = req.query || {};

    let query = supabase.from('analyses');
    if (id) {
      query = query.select('*').eq('id', id).limit(1);
    } else {
      query = query
        .select('id, file_name, row_count, col_count, columns, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
    }
    const { data, error } = await query;

    if (error) {
      console.error('Supabase GET error:', error);
      return res.status(500).json({ error: 'Failed to load history.' });
    }
    return res.status(200).json({ analyses: data });
  }

  // POST — save an analysis
  if (req.method === 'POST') {
    const { file_name, row_count, col_count, columns, stats, analysis, kpis, charts } = req.body;

    const { data, error } = await supabase
      .from('analyses')
      .insert([{
        file_name,
        row_count,
        col_count,
        columns,
        stats,
        analysis,
        kpis,
        charts,
      }])
      .select('id, created_at');

    if (error) {
      console.error('Supabase POST error:', error);
      return res.status(500).json({ error: 'Failed to save analysis.' });
    }
    return res.status(201).json({ saved: data[0] });
  }

  // DELETE — delete an analysis by id
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id.' });

    const { error } = await supabase
      .from('analyses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase DELETE error:', error);
      return res.status(500).json({ error: 'Failed to delete.' });
    }
    return res.status(200).json({ deleted: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
