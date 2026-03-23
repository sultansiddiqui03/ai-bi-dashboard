import React, { useState, useMemo } from 'react';
import { Code, Copy, Check, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

function generateSQL(columns, stats, analysis) {
  const tableName = 'dataset';
  const numericCols = columns.filter(c => stats[c]?.type === 'numeric');
  const categoricalCols = columns.filter(c => stats[c]?.type === 'categorical');

  let sql = `-- SQL queries generated from Ask Data analysis\n-- Table: ${tableName}\n\n`;

  // Basic stats query
  sql += `-- Basic Statistics\nSELECT\n`;
  sql += `  COUNT(*) AS total_rows,\n`;
  numericCols.forEach((col, i) => {
    const comma = i < numericCols.length - 1 || categoricalCols.length > 0 ? ',' : '';
    sql += `  ROUND(AVG("${col}"), 2) AS avg_${col.replace(/\s/g, '_')},\n`;
    sql += `  ROUND(MIN("${col}"), 2) AS min_${col.replace(/\s/g, '_')},\n`;
    sql += `  ROUND(MAX("${col}"), 2) AS max_${col.replace(/\s/g, '_')}${comma}\n`;
  });
  categoricalCols.slice(0, 2).forEach((col, i) => {
    const comma = i < Math.min(2, categoricalCols.length) - 1 ? ',' : '';
    sql += `  COUNT(DISTINCT "${col}") AS unique_${col.replace(/\s/g, '_')}${comma}\n`;
  });
  sql += `FROM ${tableName};\n\n`;

  // Group by analysis
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    const cat = categoricalCols[0];
    const num = numericCols[0];
    sql += `-- Group Analysis: ${num} by ${cat}\nSELECT\n`;
    sql += `  "${cat}",\n`;
    sql += `  COUNT(*) AS count,\n`;
    sql += `  ROUND(AVG("${num}"), 2) AS avg_${num.replace(/\s/g, '_')},\n`;
    sql += `  ROUND(SUM("${num}"), 2) AS total_${num.replace(/\s/g, '_')}\n`;
    sql += `FROM ${tableName}\nGROUP BY "${cat}"\nORDER BY total_${num.replace(/\s/g, '_')} DESC\nLIMIT 10;\n\n`;
  }

  // Outlier detection
  if (numericCols.length > 0) {
    const col = numericCols[0];
    const stat = stats[col];
    if (stat) {
      const iqr = (stat.max - stat.min) * 0.5; // approximation
      sql += `-- Outlier Detection (${col})\nSELECT *\nFROM ${tableName}\n`;
      sql += `WHERE "${col}" < ${Math.round((stat.mean - 2 * iqr) * 100) / 100}\n`;
      sql += `   OR "${col}" > ${Math.round((stat.mean + 2 * iqr) * 100) / 100};\n\n`;
    }
  }

  // Missing values
  sql += `-- Missing Value Check\nSELECT\n`;
  columns.forEach((col, i) => {
    const comma = i < columns.length - 1 ? ',' : '';
    sql += `  SUM(CASE WHEN "${col}" IS NULL THEN 1 ELSE 0 END) AS null_${col.replace(/\s/g, '_')}${comma}\n`;
  });
  sql += `FROM ${tableName};\n`;

  return sql;
}

function generatePython(columns, stats, analysis) {
  const numericCols = columns.filter(c => stats[c]?.type === 'numeric');
  const categoricalCols = columns.filter(c => stats[c]?.type === 'categorical');

  let py = `# Python (pandas) code generated from Ask Data analysis\nimport pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\n\n`;
  py += `# Load your data\ndf = pd.read_csv('your_data.csv')\n\n`;

  // Basic stats
  py += `# Basic Statistics\nprint(df.describe())\nprint(f"\\nShape: {df.shape}")\nprint(f"Missing values:\\n{df.isnull().sum()}")\n\n`;

  // Numeric analysis
  if (numericCols.length > 0) {
    py += `# Numeric Column Analysis\nnumeric_cols = ${JSON.stringify(numericCols)}\n`;
    py += `for col in numeric_cols:\n`;
    py += `    print(f"\\n{col}: mean={df[col].mean():.2f}, median={df[col].median():.2f}, std={df[col].std():.2f}")\n\n`;
  }

  // Group analysis
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    const cat = categoricalCols[0];
    const num = numericCols[0];
    py += `# Group Analysis\ngroup_stats = df.groupby('${cat}')['${num}'].agg(['mean', 'sum', 'count'])\n`;
    py += `group_stats = group_stats.sort_values('sum', ascending=False).head(10)\nprint(group_stats)\n\n`;
  }

  // Outlier detection
  if (numericCols.length > 0) {
    const col = numericCols[0];
    py += `# Outlier Detection (IQR method)\nQ1 = df['${col}'].quantile(0.25)\nQ3 = df['${col}'].quantile(0.75)\nIQR = Q3 - Q1\n`;
    py += `outliers = df[(df['${col}'] < Q1 - 1.5 * IQR) | (df['${col}'] > Q3 + 1.5 * IQR)]\n`;
    py += `print(f"\\nOutliers in ${col}: {len(outliers)} rows ({len(outliers)/len(df)*100:.1f}%)")\n\n`;
  }

  // Visualization
  py += `# Visualizations\nfig, axes = plt.subplots(2, 2, figsize=(14, 10))\n\n`;

  if (numericCols.length > 0) {
    py += `# Distribution\ndf['${numericCols[0]}'].hist(ax=axes[0, 0], bins=30, color='#38bdf8', alpha=0.7)\naxes[0, 0].set_title('${numericCols[0]} Distribution')\n\n`;
  }

  if (categoricalCols.length > 0 && numericCols.length > 0) {
    py += `# Bar chart\ntop_groups = df.groupby('${categoricalCols[0]}')['${numericCols[0]}'].mean().nlargest(10)\n`;
    py += `top_groups.plot(kind='barh', ax=axes[0, 1], color='#34d399')\naxes[0, 1].set_title('${numericCols[0]} by ${categoricalCols[0]}')\n\n`;
  }

  if (numericCols.length >= 2) {
    py += `# Scatter plot\ndf.plot.scatter(x='${numericCols[0]}', y='${numericCols[1]}', ax=axes[1, 0], alpha=0.5, color='#a78bfa')\naxes[1, 0].set_title('${numericCols[1]} vs ${numericCols[0]}')\n\n`;
  }

  if (numericCols.length > 0) {
    py += `# Box plot\ndf.boxplot(column='${numericCols[0]}', ax=axes[1, 1])\naxes[1, 1].set_title('${numericCols[0]} Box Plot')\n\n`;
  }

  py += `plt.tight_layout()\nplt.savefig('analysis_output.png', dpi=150)\nplt.show()\n`;

  // Correlation
  if (numericCols.length >= 2) {
    py += `\n# Correlation Matrix\ncorr = df[${JSON.stringify(numericCols)}].corr()\n`;
    py += `plt.figure(figsize=(10, 8))\nsns.heatmap(corr, annot=True, cmap='coolwarm', center=0)\nplt.title('Correlation Matrix')\nplt.tight_layout()\nplt.savefig('correlation.png', dpi=150)\nplt.show()\n`;
  }

  return py;
}

export default function CodeGenerator({ columns, stats, analysis }) {
  const [showCode, setShowCode] = useState(false);
  const [language, setLanguage] = useState('sql');
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    if (language === 'sql') return generateSQL(columns, stats, analysis);
    return generatePython(columns, stats, analysis);
  }, [columns, stats, analysis, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="glass-card p-5">
      <button onClick={() => setShowCode(!showCode)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Generate Code</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">SQL & Python</span>
        </div>
        {showCode ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
      </button>

      {showCode && (
        <div className="mt-4 space-y-3 animate-fade-in">
          {/* Language toggle */}
          <div className="flex items-center gap-2">
            <button onClick={() => setLanguage('sql')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                language === 'sql' ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
              }`}>
              SQL
            </button>
            <button onClick={() => setLanguage('python')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                language === 'python' ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
              }`}>
              Python
            </button>
          </div>

          {/* Code block */}
          <div className="relative">
            <pre className="p-4 rounded-xl bg-[#0d1117] border border-[var(--border-subtle)] text-[11px] font-mono text-[#e6edf3] overflow-x-auto max-h-[400px] leading-relaxed whitespace-pre">
              {code}
            </pre>
            <button onClick={handleCopy}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-[var(--text-muted)] hover:text-white hover:bg-white/20 text-[10px] transition-all">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <p className="text-[10px] text-[var(--text-muted)]">
            Code is auto-generated based on your dataset structure and AI analysis. Adjust table/file names as needed.
          </p>
        </div>
      )}
    </div>
  );
}
