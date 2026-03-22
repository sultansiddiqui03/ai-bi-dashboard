// Vercel Serverless Function — streams SSE responses from OpenAI
// For 'analyze' mode: sends structured JSON first, then streams text
// Environment variable required: OPENAI_API_KEY

import { rateLimit } from './middleware/rateLimit.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  if (!rateLimit(req, res)) return;

  const { dataPreview, columns, stats, query, mode } = req.body;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured. Add OPENAI_API_KEY to your Vercel environment variables.' });
  }

  const userDataContext = `Dataset columns: ${columns.join(', ')}\n\nData statistics:\n${JSON.stringify(stats, null, 2)}\n\nSample data (first 20 rows):\n${dataPreview}`;

  // Build prompts based on mode
  let textSystemPrompt;
  let userMessage;

  if (mode === 'query') {
    textSystemPrompt = `You are an expert data analyst embedded in a BI dashboard. The user has uploaded a dataset and is asking questions about it. Answer precisely and concisely. When relevant, suggest which chart type would best visualize the answer. Always ground your response in the data provided. Format numbers clearly. Be direct — no filler.`;
    userMessage = `${userDataContext}\n\nUser question: ${query}`;
  } else if (mode === 'compare') {
    textSystemPrompt = `You are an expert data analyst embedded in a BI dashboard. The user has uploaded TWO datasets for comparison. Analyze both datasets and provide:

1. **COMPARISON SUMMARY** — How the two datasets differ in structure, scale, and content.
2. **KEY DIFFERENCES** — Highlight the most important differences in metrics and distributions.
3. **COMMON PATTERNS** — What patterns or trends are shared across both datasets.
4. **RECOMMENDATIONS** — Based on the comparison, what actions should be taken.

Be concise, specific, and business-focused.`;
    userMessage = `${dataPreview}\n\nDataset statistics:\n${JSON.stringify(stats, null, 2)}\n\nPlease compare these two datasets comprehensively.`;
  } else {
    // analyze mode — text-only prompt (no metrics/charts)
    textSystemPrompt = `You are an expert data analyst. Analyze the dataset and provide:
1. **EXECUTIVE SUMMARY** — 2-3 sentence overview of what this data represents and the key story it tells.
2. **INSIGHTS** — 3-5 actionable business insights ranked by impact, with specific numbers from the data.
3. **ANOMALIES & RISKS** — Flag any data quality issues, outliers, or concerning trends.

Be concise, specific, and business-focused. Use actual column names and values from the data. Do NOT include metrics/KPIs or chart recommendations — those are handled separately.`;
    userMessage = `${userDataContext}\n\nPlease analyze this dataset comprehensively.`;
  }

  try {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // For 'analyze' mode, fetch structured JSON first (non-streaming), then stream text
    if (mode === 'analyze') {
      const jsonPrompt = `Extract key metrics and chart recommendations from this dataset. Return a JSON object with exactly this structure:
{
  "metrics": [{"name": "...", "value": "...", "change": "+X%", "interpretation": "..."}],
  "charts": [{"type": "bar|line|pie|scatter|area", "x": "column_name", "y": "column_name", "title": "...", "reason": "..."}]
}

Rules:
- metrics: 4-6 important KPIs with actual computed values from the data. Each must have name, value, change (use "+0%" if no comparison available), and interpretation.
- charts: 2-3 chart recommendations using EXACT column names from the dataset.
- For chart types: bar (categorical x numeric), line (time series), pie (distribution), scatter (numeric x numeric), area (trends).
- Return ONLY valid JSON, nothing else.`;

      try {
        const jsonResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 2000,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: jsonPrompt },
              { role: 'user', content: userMessage },
            ],
          }),
        });

        if (jsonResponse.ok) {
          const jsonData = await jsonResponse.json();
          const jsonContent = jsonData.choices?.[0]?.message?.content || '{}';
          try {
            const parsed = JSON.parse(jsonContent);
            const metrics = Array.isArray(parsed.metrics) ? parsed.metrics : [];
            const charts = Array.isArray(parsed.charts) ? parsed.charts : [];
            // Send structured data as the first SSE event
            res.write(`data: ${JSON.stringify({ type: 'structured', metrics, charts })}\n\n`);
          } catch (e) {
            console.error('Failed to parse structured JSON in stream:', e);
            res.write(`data: ${JSON.stringify({ type: 'structured', metrics: [], charts: [] })}\n\n`);
          }
        } else {
          // Send empty structured data if JSON call fails
          res.write(`data: ${JSON.stringify({ type: 'structured', metrics: [], charts: [] })}\n\n`);
        }
      } catch (jsonErr) {
        console.error('JSON call failed in stream:', jsonErr);
        res.write(`data: ${JSON.stringify({ type: 'structured', metrics: [], charts: [] })}\n\n`);
      }
    }

    // Now stream the text analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 4096,
        stream: true,
        messages: [
          { role: 'system', content: textSystemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      res.write(`data: ${JSON.stringify({ error: `AI API error: ${response.status}` })}\n\n`);
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }
        try {
          const parsed = JSON.parse(payload);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        } catch (e) {
          // Skip malformed chunks
        }
      }
    }

    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to stream response.' })}\n\n`);
    res.end();
  }
}
