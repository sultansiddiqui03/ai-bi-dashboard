import React, { useState } from 'react';
import { Globe, Link2, Loader2, FileSpreadsheet, Database, ArrowRight, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';

export default function DataConnectors({ onDataLoaded }) {
  const [activeConnector, setActiveConnector] = useState(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const connectors = [
    { id: 'csv-url', label: 'CSV URL', icon: FileSpreadsheet, desc: 'Load CSV from any public URL' },
    { id: 'json-api', label: 'JSON API', icon: Database, desc: 'Fetch data from a REST API endpoint' },
    { id: 'google-sheets', label: 'Google Sheets', icon: Globe, desc: 'Import from a published Google Sheet' },
  ];

  const fetchCSV = async (csvUrl) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch`);
      const text = await response.text();

      return new Promise((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            if (!results.data || results.data.length === 0) {
              reject(new Error('No data found in CSV'));
              return;
            }
            resolve({ data: results.data, columns: results.meta.fields || [] });
          },
          error: reject,
        });
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchJSON = async (jsonUrl) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(jsonUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch`);
      const json = await response.json();

      // Handle array of objects
      let dataArray = Array.isArray(json) ? json : json.data || json.results || json.items || json.records;
      if (!Array.isArray(dataArray)) {
        // Try to find the first array in the response
        for (const key of Object.keys(json)) {
          if (Array.isArray(json[key]) && json[key].length > 0 && typeof json[key][0] === 'object') {
            dataArray = json[key];
            break;
          }
        }
      }

      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        throw new Error('Could not find tabular data in the JSON response. Expected an array of objects.');
      }

      const columns = Object.keys(dataArray[0]);
      return { data: dataArray, columns };
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleSheets = async (sheetUrl) => {
    setLoading(true);
    setError('');
    try {
      // Convert Google Sheets URL to CSV export URL
      let csvUrl = sheetUrl;
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        const sheetId = match[1];
        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      } else if (!sheetUrl.includes('export?format=csv')) {
        throw new Error('Invalid Google Sheets URL. Use the share link (e.g., https://docs.google.com/spreadsheets/d/SHEET_ID/...)');
      }

      return await fetchCSV(csvUrl);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!url.trim() || !activeConnector) return;
    setError('');

    try {
      let result;
      switch (activeConnector) {
        case 'csv-url':
          result = await fetchCSV(url.trim());
          break;
        case 'json-api':
          result = await fetchJSON(url.trim());
          break;
        case 'google-sheets':
          result = await fetchGoogleSheets(url.trim());
          break;
        default:
          throw new Error('Unknown connector type');
      }

      if (result && result.data && result.columns) {
        const fileName = activeConnector === 'google-sheets'
          ? 'Google Sheet'
          : url.split('/').pop()?.split('?')[0] || 'Remote Data';
        onDataLoaded(result.data, result.columns, fileName);
        setUrl('');
        setActiveConnector(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-4 h-4 text-[var(--accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Data Connectors</h3>
      </div>

      {/* Connector options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {connectors.map(c => {
          const Icon = c.icon;
          const isActive = activeConnector === c.id;
          return (
            <button key={c.id} onClick={() => { setActiveConnector(isActive ? null : c.id); setError(''); }}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'border-[var(--border-active)] bg-[var(--accent-glow)]'
                  : 'border-[var(--border-subtle)] hover:border-[var(--border-active)] hover:bg-white/[0.02]'
              }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-[var(--accent)]' : 'bg-white/5'}`}>
                <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--bg-primary)]' : 'text-[var(--text-muted)]'}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)]">{c.label}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{c.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* URL input */}
      {activeConnector && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              placeholder={
                activeConnector === 'csv-url' ? 'https://example.com/data.csv' :
                activeConnector === 'json-api' ? 'https://api.example.com/data' :
                'https://docs.google.com/spreadsheets/d/...'
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
            />
            <button onClick={handleConnect} disabled={!url.trim() || loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-medium hover:brightness-110 disabled:opacity-30 transition-all">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Loading...' : 'Connect'}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-400">{error}</p>
            </div>
          )}

          {activeConnector === 'google-sheets' && (
            <p className="text-[10px] text-[var(--text-muted)]">
              Tip: The Google Sheet must be published or shared as "Anyone with the link can view."
            </p>
          )}
          {activeConnector === 'json-api' && (
            <p className="text-[10px] text-[var(--text-muted)]">
              The API must return an array of objects or an object with a data/results/items array. CORS must be enabled.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
