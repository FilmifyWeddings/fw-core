'use client';

import React, { useState, useId } from 'react';

export interface GraphDataPoint {
  month: string;
  // For shoots or deliverables:
  assigned?: number;
  completed?: number;
  // For finance:
  totalAmount?: number;
  receivedAmount?: number;
  balanceAmount?: number;
}

interface TeamPortalLineGraphProps {
  type: 'shoots' | 'deliverables' | 'finance';
  data: GraphDataPoint[];
  title?: string;
  subtitle?: string;
}

export default function TeamPortalLineGraph({
  type,
  data,
  title,
  subtitle,
}: TeamPortalLineGraphProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const idPrefix = useId().replace(/:/g, '');

  if (!data || data.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs text-center">
        <p className="text-xs text-zinc-400 font-medium font-josefin">No activity recorded for this period</p>
      </div>
    );
  }

  // Width & Height for SVG ViewBox
  const width = 800;
  const height = 240;
  const paddingX = 50;
  const paddingY = 35;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;

  // Compute maximum value for scaling
  let maxValue = 1;
  if (type === 'finance') {
    data.forEach((d) => {
      const val = Math.max(d.totalAmount || 0, (d.receivedAmount || 0) + (d.balanceAmount || 0));
      if (val > maxValue) maxValue = val;
    });
  } else {
    data.forEach((d) => {
      const val = Math.max(d.assigned || 0, d.completed || 0);
      if (val > maxValue) maxValue = val;
    });
  }
  // Add 15% headroom
  maxValue = Math.ceil(maxValue * 1.15) || 5;

  const stepX = data.length > 1 ? graphWidth / (data.length - 1) : graphWidth;

  // Calculate points
  const getPoints = (key: 'assigned' | 'completed' | 'totalAmount' | 'receivedAmount' | 'balanceAmount') => {
    return data.map((d, i) => {
      const val = d[key] || 0;
      const x = paddingX + i * stepX;
      const y = height - paddingY - (val / maxValue) * graphHeight;
      return { x, y, val };
    });
  };

  // Generate smooth cubic Bézier SVG path
  function getCurvedPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  }

  // Generate closed area under curve
  function getAreaPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    const linePath = getCurvedPath(points);
    const bottomY = height - paddingY;
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  // Pre-calculate series paths
  const seriesA = type === 'finance' ? getPoints('totalAmount') : getPoints('assigned');
  const seriesB = type === 'finance' ? getPoints('receivedAmount') : getPoints('completed');
  const seriesC = type === 'finance' ? getPoints('balanceAmount') : [];

  const pathA = getCurvedPath(seriesA);
  const areaA = getAreaPath(seriesA);
  const pathB = getCurvedPath(seriesB);
  const areaB = getAreaPath(seriesB);
  const pathC = type === 'finance' ? getCurvedPath(seriesC) : '';
  const areaC = type === 'finance' ? getAreaPath(seriesC) : '';

  // Horizontal Grid Lines (4 levels)
  const gridLevels = [0, 0.33, 0.66, 1];

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs relative overflow-hidden">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight font-josefin">
            {title || (type === 'finance' ? 'Monthly Financial Trends' : type === 'deliverables' ? 'Monthly Post-Production Trends' : 'Monthly Assigned Shoots Timeline')}
          </h3>
          <p className="text-xs text-zinc-500 font-medium font-josefin mt-0.5">
            {subtitle || (type === 'finance' ? 'Interactive monthly breakdown of total amount, received amount, and pending balance' : 'Month-wise breakdown of assigned vs completed workload')}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-bold font-josefin flex-wrap">
          {type === 'finance' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                <span className="text-zinc-600">Total Amount</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs" />
                <span className="text-zinc-600">Received</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
                <span className="text-zinc-600">Pending</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full shadow-xs ${type === 'deliverables' ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                <span className="text-zinc-600">Assigned</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                <span className="text-zinc-600">Completed</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SVG Container with 3D Gradients & Filters */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* 3D Drop Shadow Filter */}
            <filter id={`${idPrefix}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="4" floodOpacity="0.25" floodColor="#000000" />
            </filter>

            {/* Gradient Amber / Primary */}
            <linearGradient id={`${idPrefix}-grad-amber`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
            </linearGradient>

            {/* Gradient Emerald / Completed */}
            <linearGradient id={`${idPrefix}-grad-emerald`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>

            {/* Gradient Indigo / Deliverables */}
            <linearGradient id={`${idPrefix}-grad-indigo`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
            </linearGradient>

            {/* Gradient Blue / Received */}
            <linearGradient id={`${idPrefix}-grad-blue`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {gridLevels.map((lvl) => {
            const y = height - paddingY - lvl * graphHeight;
            const gridVal = Math.round(lvl * maxValue);
            return (
              <g key={lvl}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#EBE7DF"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-zinc-400 font-roboto text-[10px] font-medium"
                >
                  {type === 'finance'
                    ? gridVal >= 1000
                      ? `₹${(gridVal / 1000).toFixed(0)}k`
                      : `₹${gridVal}`
                    : gridVal}
                </text>
              </g>
            );
          })}

          {/* Area Fills for 3D Depth */}
          {type === 'finance' ? (
            <>
              <path d={areaA} fill={`url(#${idPrefix}-grad-emerald)`} />
              <path d={areaB} fill={`url(#${idPrefix}-grad-blue)`} />
              <path d={areaC} fill={`url(#${idPrefix}-grad-amber)`} />
            </>
          ) : (
            <>
              <path
                d={areaA}
                fill={type === 'deliverables' ? `url(#${idPrefix}-grad-indigo)` : `url(#${idPrefix}-grad-amber)`}
              />
              <path d={areaB} fill={`url(#${idPrefix}-grad-emerald)`} />
            </>
          )}

          {/* Smooth Bézier Stroke Lines with 3D drop-shadow */}
          {type === 'finance' ? (
            <>
              <path
                d={pathA}
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
                filter={`url(#${idPrefix}-glow)`}
              />
              <path
                d={pathB}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter={`url(#${idPrefix}-glow)`}
              />
              <path
                d={pathC}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter={`url(#${idPrefix}-glow)`}
              />
            </>
          ) : (
            <>
              <path
                d={pathA}
                fill="none"
                stroke={type === 'deliverables' ? '#6366F1' : '#F59E0B'}
                strokeWidth="3"
                strokeLinecap="round"
                filter={`url(#${idPrefix}-glow)`}
              />
              <path
                d={pathB}
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter={`url(#${idPrefix}-glow)`}
              />
            </>
          )}

          {/* Data Points & Interactive Touch Circles */}
          {data.map((d, i) => {
            const ptA = seriesA[i];
            const ptB = seriesB[i];
            const ptC = seriesC[i];
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onClick={() => setHoveredIndex(i)}
                className="cursor-pointer"
              >
                {/* Vertical hover line indicator */}
                {isHovered && (
                  <line
                    x1={ptA.x}
                    y1={paddingY}
                    x2={ptA.x}
                    y2={height - paddingY}
                    stroke="#D4D4D8"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Series A Dot */}
                <circle
                  cx={ptA.x}
                  cy={ptA.y}
                  r={isHovered ? 6 : 4}
                  fill={type === 'finance' ? '#10B981' : type === 'deliverables' ? '#6366F1' : '#F59E0B'}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Series B Dot */}
                <circle
                  cx={ptB.x}
                  cy={ptB.y}
                  r={isHovered ? 5.5 : 3.5}
                  fill={type === 'finance' ? '#3B82F6' : '#10B981'}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Series C Dot for Finance */}
                {type === 'finance' && ptC && (
                  <circle
                    cx={ptC.x}
                    cy={ptC.y}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#F59E0B"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="transition-all duration-150"
                  />
                )}

                {/* Month Label below */}
                <text
                  x={ptA.x}
                  y={height - 10}
                  textAnchor="middle"
                  className={`font-josefin text-[11px] font-bold ${
                    isHovered ? 'fill-zinc-900 font-black' : 'fill-zinc-500'
                  }`}
                >
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating 3D Hover Tooltip Card */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute z-20 pointer-events-none p-3 rounded-xl bg-stone-900/95 text-white shadow-xl border border-stone-800 text-xs backdrop-blur-md space-y-1 transform -translate-x-1/2 transition-all duration-150"
            style={{
              left: `${((seriesA[hoveredIndex].x) / width) * 100}%`,
              top: '10px',
            }}
          >
            <p className="font-josefin font-black text-amber-400 text-xs border-b border-stone-800 pb-1">
              {data[hoveredIndex].month}
            </p>
            {type === 'finance' ? (
              <div className="space-y-0.5 pt-0.5 font-roboto">
                <div className="flex items-center justify-between gap-4 text-emerald-400">
                  <span className="font-medium text-[11px]">Total:</span>
                  <span className="font-black">₹{(data[hoveredIndex].totalAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-blue-400">
                  <span className="font-medium text-[11px]">Received:</span>
                  <span className="font-black">₹{(data[hoveredIndex].receivedAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-amber-400">
                  <span className="font-medium text-[11px]">Pending:</span>
                  <span className="font-black">₹{(data[hoveredIndex].balanceAmount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5 pt-0.5 font-roboto">
                <div className="flex items-center justify-between gap-4 text-amber-300">
                  <span className="font-medium text-[11px]">Assigned:</span>
                  <span className="font-black">{data[hoveredIndex].assigned || 0}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-emerald-400">
                  <span className="font-medium text-[11px]">Completed:</span>
                  <span className="font-black">{data[hoveredIndex].completed || 0}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
