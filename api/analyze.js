// Vercel Serverless Function — proxies requests to OpenAI's GPT API
// Environment variable required: OPENAI_API_KEY
// Uses two-call architecture for 'analyze' mode: text + structured JSON in parallel

import { rateLimit } from './middleware/rateLimit.js';

export default async function handler(req, res) {
  // CORS headers
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

  try {
    // For 'analyze' mode, use two-call architecture
    if (mode === 'analyze') {
      const textPrompt = `You are an expert data analyst. Analyze the dataset and provide:
1. **EXECUTIVE SUMMARY** — 2-3 sentence overview of what this data represents and the key story it tells.
2. **INSIGHTS** — 3-5 actionable business insights ranked by impact, with specific numbers from the data.
3. **ANOMALIES & RISKS** — Flag any data quality issues, outliers, or concerning trends.

Be concise, specific, and business-focused. Use actual column names and values from the data. Do NOT include metrics/KPIs or chart recommendations in this response — those are handled separately.`;

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

      const userMessage = `${userDataContext}\n\nPlease analyze this dataset comprehensively.`;

      // Run both calls in parallel
      const [textResponse, jsonResponse] = await Promise.all([
        fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 3000,
            messages: [
              { role: 'system', content: textPrompt },
              { role: 'user', content: userMessage },
            ],
          }),
        }),
        fetch('https://api.openai.com/v1/chat/completions', {
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
        }),
      ]);

      if (!textResponse.ok) {
        const errorData = await textResponse.text();
        console.error('OpenAI text API error:', errorData);
        return res.status(textResponse.status).json({ error: `AI API error: ${textResponse.status}` });
      }

      if (!jsonResponse.ok) {
        const errorData = await jsonResponse.text();
        console.error('OpenAI JSON API error:', errorData);
        // Still return text analysis even if JSON call fails
        const textData = await textResponse.json();
        const analysisText = textData.choices?.[0]?.message?.content || '';
        return res.status(200).json({ analysis: analysisText, metrics: [], charts: [] });
      }

      const textData = await textResponse.json();
      const jsonData = await jsonResponse.json();

      const analysisText = textData.choices?.[0]?.message?.content || '';
      const jsonContent = jsonData.choices?.[0]?.message?.content || '{}';

      let metrics = [];
      let charts = [];
      try {
        const parsed = JSON.parse(jsonContent);
        metrics = Array.isArray(parsed.metrics) ? parsed.metrics : [];
        charts = Array.isArray(parsed.charts) ? parsed.charts : [];
      } catch (e) {
        console.error('Failed to parse structured JSON:', e);
      }

      return res.status(200).json({ analysis: analysisText, metrics, charts });
    }

    // For 'query' and 'compare' modes, single call (no structured data needed)
    let systemPrompt;
    if (mode === 'query') {
      systemPrompt = `You are an expert data analyst embedded in a BI dashboard. The user has uploaded a dataset and is asking questions about it. Answer precisely and concisely. When relevant, suggest which chart type would best visualize the answer. Always ground your response in the data provided. Format numbers clearly. Be direct — no filler.`;
    } else if (mode === 'compare') {
      systemPrompt = `You are an expert data analyst embedded in a BI dashboard. The user has uploaded TWO datasets for comparison. Analyze both datasets and provide:

1. **COMPARISON SUMMARY** — How the two datasets differ in structure, scale, and content.
2. **KEY DIFFERENCES** — Highlight the most important differences in metrics and distributions.
3. **COMMON PATTERNS** — What patterns or trends are shared across both datasets.
4. **RECOMMENDATIONS** — Based on the comparison, what actions should be taken.

Be concise, specific, and business-focused.`;
    }

    const userMessage = mode === 'query'
      ? `${userDataContext}\n\nUser question: ${query}`
      : mode === 'compare'
      ? `${dataPreview}\n\nDataset statistics:\n${JSON.stringify(stats, null, 2)}\n\nPlease compare these two datasets comprehensively.`
      : `${userDataContext}\n\nPlease analyze this dataset comprehensively.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return res.status(response.status).json({ error: `AI API error: ${response.status}` });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({ analysis: text });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Failed to analyze data. Please try again.' });
  }
}
