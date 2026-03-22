// Vercel Serverless Function — proxies requests to OpenAI's GPT API
// Environment variable required: OPENAI_API_KEY

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

  // Build system prompt based on mode
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
  } else {
    systemPrompt = `You are an expert data analyst embedded in a BI dashboard. Analyze the uploaded dataset and provide:

1. **EXECUTIVE SUMMARY** — 2-3 sentence overview of what this data represents and the key story it tells.
2. **KEY METRICS** — Extract 4-6 important KPIs/metrics. For each, provide: metric name, value, and a short interpretation. Return these as a RAW JSON array inside a <metrics> tag. IMPORTANT: Do NOT wrap the JSON in code fences or backticks — just put the raw JSON directly inside the tag. Example: <metrics>[{"name": "Total Revenue", "value": "$1.2M", "change": "+12%", "interpretation": "Strong growth"}]</metrics>
3. **INSIGHTS** — 3-5 actionable business insights ranked by impact. Be specific with numbers.
4. **CHART RECOMMENDATIONS** — Suggest 2-3 specific charts to visualize this data. For each, specify: chart type (bar, line, pie, scatter, area), x-axis column, y-axis column, and why this visualization matters. Return as RAW JSON inside a <charts> tag. IMPORTANT: Do NOT wrap in code fences or backticks. Example: <charts>[{"type": "bar", "x": "column_name", "y": "column_name", "title": "Chart Title", "reason": "Why this matters"}]</charts>
5. **ANOMALIES & RISKS** — Flag any data quality issues, outliers, or concerning trends.

CRITICAL: The <metrics> and <charts> tags must contain ONLY raw JSON — no markdown code blocks, no \`\`\`json, no backticks. The JSON is parsed programmatically.

Be concise, specific, and business-focused. Use the actual column names and values from the data.`;
  }

  const userMessage = mode === 'query'
    ? `Dataset columns: ${columns.join(', ')}\n\nData statistics:\n${JSON.stringify(stats, null, 2)}\n\nSample data (first 20 rows):\n${dataPreview}\n\nUser question: ${query}`
    : mode === 'compare'
    ? `${dataPreview}\n\nDataset statistics:\n${JSON.stringify(stats, null, 2)}\n\nPlease compare these two datasets comprehensively.`
    : `Dataset columns: ${columns.join(', ')}\n\nData statistics:\n${JSON.stringify(stats, null, 2)}\n\nSample data (first 20 rows):\n${dataPreview}\n\nPlease analyze this dataset comprehensively.`;

  try {
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
