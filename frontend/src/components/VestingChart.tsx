import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { format, addSeconds } from 'date-fns';
import type { VestingSchedule } from '../types';

interface Props {
  schedule: VestingSchedule;
}

/**
 * Renders a vesting timeline chart showing:
 * - Total tokens over time (area)
 * - Cliff marker (vertical reference line)
 * - Current time marker
 */
export function VestingChart({ schedule }: Props) {
  const data = buildChartData(schedule);
  const cliffTime = schedule.startTime + schedule.cliffDuration;
  const endTime = schedule.startTime + schedule.totalDuration;
  const now = Math.floor(Date.now() / 1000);

  const formatDate = (ts: number) => format(new Date(ts * 1000), 'MMM yyyy');
  const formatTokens = (val: number) => `${val.toLocaleString()} tokens`;

  return (
    <div className="vesting-chart">
      <h3>Vesting Timeline</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="vestedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" />
          <XAxis
            dataKey="time"
            tickFormatter={formatDate}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v) => v.toLocaleString()}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => [formatTokens(value), 'Vested']}
            labelFormatter={(label: number) => formatDate(label)}
            contentStyle={{ background: '#1a1a2e', border: '1px solid #3d3d5c' }}
          />
          {/* Cliff marker */}
          <ReferenceLine
            x={cliffTime}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: 'Cliff', fill: '#f59e0b', fontSize: 11 }}
          />
          {/* Current time marker */}
          {now >= schedule.startTime && now <= endTime && (
            <ReferenceLine
              x={now}
              stroke="#10b981"
              strokeDasharray="4 4"
              label={{ value: 'Now', fill: '#10b981', fontSize: 11 }}
            />
          )}
          <Area
            type="monotone"
            dataKey="vested"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#vestedGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildChartData(schedule: VestingSchedule) {
  const points: { time: number; vested: number }[] = [];
  const { startTime, cliffDuration, totalDuration, totalAmount } = schedule;
  const total = Number(totalAmount);
  const steps = 24; // number of data points

  for (let i = 0; i <= steps; i++) {
    const elapsed = (totalDuration / steps) * i;
    const time = startTime + elapsed;
    let vested = 0;

    if (elapsed >= cliffDuration) {
      if (elapsed >= totalDuration) {
        vested = total;
      } else {
        vested = Math.floor((total * elapsed) / totalDuration);
      }
    }

    points.push({ time: Math.floor(time), vested });
  }

  return points;
}
