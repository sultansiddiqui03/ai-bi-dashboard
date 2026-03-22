/**
 * Compute descriptive statistics for each column in the dataset.
 */
export function computeStats(data, columns) {
  if (!data || data.length === 0) return {};

  const stats = {};

  columns.forEach(col => {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
    const numericValues = values.map(Number).filter(v => !isNaN(v));

    if (numericValues.length > values.length * 0.5 && numericValues.length > 0) {
      // Numeric column
      const sorted = [...numericValues].sort((a, b) => a - b);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const mean = sum / numericValues.length;
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

      stats[col] = {
        type: 'numeric',
        count: numericValues.length,
        missing: data.length - numericValues.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100,
        sum: Math.round(sum * 100) / 100,
      };
    } else {
      // Categorical column
      const uniqueValues = [...new Set(values)];
      const valueCounts = {};
      values.forEach(v => {
        valueCounts[v] = (valueCounts[v] || 0) + 1;
      });
      const topValues = Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      stats[col] = {
        type: 'categorical',
        count: values.length,
        missing: data.length - values.length,
        unique: uniqueValues.length,
        topValues: topValues.map(([value, count]) => ({ value, count })),
      };
    }
  });

  return stats;
}

/**
 * Format a data preview as a string for the AI.
 */
export function formatDataPreview(data, maxRows = 20) {
  if (!data || data.length === 0) return '';
  const preview = data.slice(0, maxRows);
  return JSON.stringify(preview, null, 2);
}

/**
 * Parse AI response to extract metrics and chart recommendations.
 */
export function parseAIResponse(text) {
  let metrics = [];
  let chartRecommendations = [];
  let cleanText = text;

  // Extract metrics
  const metricsMatch = text.match(/<metrics>([\s\S]*?)<\/metrics>/);
  if (metricsMatch) {
    try {
      metrics = JSON.parse(metricsMatch[1]);
    } catch (e) {
      console.warn('Failed to parse metrics:', e);
    }
    cleanText = cleanText.replace(/<metrics>[\s\S]*?<\/metrics>/, '');
  }

  // Extract chart recommendations
  const chartsMatch = text.match(/<charts>([\s\S]*?)<\/charts>/);
  if (chartsMatch) {
    try {
      chartRecommendations = JSON.parse(chartsMatch[1]);
    } catch (e) {
      console.warn('Failed to parse charts:', e);
    }
    cleanText = cleanText.replace(/<charts>[\s\S]*?<\/charts>/, '');
  }

  return { metrics, chartRecommendations, cleanText: cleanText.trim() };
}

/**
 * Prepare chart data from raw data based on AI recommendations.
 */
export function prepareChartData(data, chartConfig) {
  const { type, x, y } = chartConfig;

  if (type === 'pie') {
    // Aggregate by x column
    const counts = {};
    data.forEach(row => {
      const key = row[x] || 'Unknown';
      const val = y ? parseFloat(row[y]) || 0 : 1;
      counts[key] = (counts[key] || 0) + val;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }

  if (type === 'scatter') {
    return data
      .map(row => ({
        x: parseFloat(row[x]),
        y: parseFloat(row[y]),
      }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y))
      .slice(0, 200);
  }

  // Bar, line, area — group by x, sum y
  const grouped = {};
  data.forEach(row => {
    const key = row[x] || 'Unknown';
    const val = parseFloat(row[y]) || 0;
    if (!grouped[key]) grouped[key] = { name: key, value: 0, count: 0 };
    grouped[key].value += val;
    grouped[key].count += 1;
  });

  let result = Object.values(grouped);

  // If too many categories, take top 15
  if (result.length > 15) {
    result = result.sort((a, b) => b.value - a.value).slice(0, 15);
  }

  return result.map(d => ({
    ...d,
    value: Math.round(d.value * 100) / 100,
  }));
}

/**
 * Smart number formatter
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '—';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return num;
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(2);
}

/**
 * Chart color palette
 */
export const CHART_COLORS = [
  '#38bdf8', // sky
  '#34d399', // emerald
  '#fbbf24', // amber
  '#fb7185', // rose
  '#a78bfa', // violet
  '#f97316', // orange
  '#2dd4bf', // teal
  '#e879f9', // fuchsia
  '#60a5fa', // blue
  '#4ade80', // green
];
