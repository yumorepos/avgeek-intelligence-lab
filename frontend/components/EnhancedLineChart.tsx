"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Point = {
  label: string;
  value: number | null;
};

type Props = {
  title: string;
  points: Point[];
  color?: string;
  valueFormatter?: (value: number) => string;
  showTrend?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
};

export function EnhancedLineChart({ 
  title, 
  points, 
  color = '#3b82f6',
  valueFormatter = (v) => `$${v.toFixed(0)}`,
  showTrend = true,
  xAxisLabel,
  yAxisLabel,
}: Props) {
  // Filter valid points
  const validPoints = points.filter(p => p.value !== null);
  
  if (validPoints.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">
          No sufficient data points for chart rendering.
        </p>
      </div>
    );
  }

  // Calculate trend
  const firstValue = validPoints[0].value!;
  const lastValue = validPoints[validPoints.length - 1].value!;
  const change = lastValue - firstValue;
  const changePercent = (change / firstValue) * 100;

  // Format data for Recharts
  const chartData = points.map(p => ({
    label: p.label,
    value: p.value,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {showTrend && (
          <div className="flex items-center gap-2">
            {change > 0 ? (
              <TrendingUp className="w-5 h-5 text-success-600" />
            ) : change < 0 ? (
              <TrendingDown className="w-5 h-5 text-danger-600" />
            ) : (
              <Minus className="w-5 h-5 text-gray-400" />
            )}
            <span className={`text-sm font-medium ${
              change > 0 ? 'text-success-600' : 
              change < 0 ? 'text-danger-600' : 
              'text-gray-600'
            }`}>
              {change > 0 ? '+' : ''}{changePercent.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={valueFormatter}
            stroke="#6b7280"
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    offset: 4,
                    style: { fill: "#6b7280", fontSize: 11 },
                  }
                : undefined
            }
          />
          <Tooltip 
            formatter={(value: any) => valueFormatter(value)}
            contentStyle={{ 
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      {xAxisLabel ? <p className="mt-2 text-xs text-gray-500 text-center">{xAxisLabel}</p> : null}

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>{points[0]?.label}</span>
        <span className="font-medium">
          Latest: {valueFormatter(lastValue)}
        </span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}
