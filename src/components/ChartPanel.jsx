import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { CHART_COLORS } from '../utils/dataProcessor';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#f1f5f9',
    padding: '8px 12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  labelStyle: { color: '#94a3b8', fontSize: '11px', marginBottom: '4px' },
};

const AXIS_STYLE = {
  fontSize: 11,
  fill: '#64748b',
  fontFamily: '"JetBrains Mono", monospace',
};

const GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: 'rgba(148, 163, 184, 0.06)',
};

export default function ChartPanel({ chart, index, data: rawData, columns, stats, onDrillDown }) {
  const { type, title, data, x, y, reason } = chart;
  const color = CHART_COLORS[index % CHART_COLORS.length];

  if (!data || data.length === 0) return null;

  const handleBarClick = (entry) => {
    if (onDrillDown && entry && entry.name) {
      onDrillDown(x, entry.name);
    }
  };

  const handlePieClick = (entry) => {
    if (onDrillDown && entry && entry.name) {
      onDrillDown(x, entry.name);
    }
  };

  return (
    <div className="glass-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
        {reason && (
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{reason}</p>
        )}
        {onDrillDown && (type === 'bar' || type === 'pie') && (
          <p className="text-[10px] text-[var(--accent)] mt-1">Click a segment to drill down</p>
        )}
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(type, data, color, x, y, handleBarClick, handlePieClick)}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function renderChart(type, data, color, xKey, yKey, onBarClick, onPieClick) {
  switch (type) {
    case 'bar':
      return (
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={60} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} onClick={(entry) => onBarClick(entry)} style={{ cursor: 'pointer' }}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      );

    case 'line':
      return (
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={60} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ fill: color, r: 3 }} activeDot={{ r: 5, fill: color }} />
        </LineChart>
      );

    case 'area':
      return (
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id={`areaGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={60} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#areaGrad-${color})`} />
        </AreaChart>
      );

    case 'pie':
      return (
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={100}
            dataKey="value"
            paddingAngle={2}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={{ stroke: '#64748b', strokeWidth: 0.5 }}
            onClick={(entry) => onPieClick(entry)}
            style={{ cursor: 'pointer' }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
        </PieChart>
      );

    case 'scatter':
      return (
        <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="x" name={xKey} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis dataKey="y" name={yKey} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={60} />
          <Tooltip {...TOOLTIP_STYLE} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(148,163,184,0.2)' }} />
          <Scatter data={data} fill={color} fillOpacity={0.6} r={4} />
        </ScatterChart>
      );

    default:
      return (
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={60} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} onClick={(entry) => onBarClick(entry)} style={{ cursor: 'pointer' }} />
        </BarChart>
      );
  }
}
