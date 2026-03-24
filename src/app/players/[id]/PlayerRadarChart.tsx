'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';

type PlayerRadarDatum = {
  key: string;
  label: string;
  value: number;
};

type PlayerRadarChartProps = {
  data: PlayerRadarDatum[];
};

type HoveredAxis = {
  key: string;
  label: string;
  value: number;
  x: number;
  y: number;
};

const RADAR_CENTER_X = 0.63;
const RADAR_CENTER_Y = 0.48;
const RADAR_RADIUS_RATIO = 0.72;
const LABEL_GAP = 18;

function toRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '').trim();

  if (normalized.length !== 6) {
    return `rgba(137, 174, 251, ${alpha})`;
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getAccentColor() {
  if (typeof window === 'undefined') {
    return '#89aefb';
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--ui-accent-primary')
    .trim();

  return value || '#89aefb';
}

function getTextAnchor(angleDeg: number) {
  const normalized = ((angleDeg % 360) + 360) % 360;

  if (normalized > 67.5 && normalized < 112.5) {
    return 'center';
  }

  if (normalized > 247.5 && normalized < 292.5) {
    return 'center';
  }

  return normalized < 90 || normalized > 270 ? 'left' : 'right';
}

export default function PlayerRadarChart({ data }: PlayerRadarChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredAxis, setHoveredAxis] = useState<HoveredAxis | null>(null);

  const accentColor = useMemo(() => getAccentColor(), []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const node = containerRef.current;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const option = useMemo(
    () => ({
      animation: false,
      tooltip: {
        show: false,
      },
      radar: {
        center: [`${RADAR_CENTER_X * 100}%`, `${RADAR_CENTER_Y * 100}%`],
        radius: `${RADAR_RADIUS_RATIO * 100}%`,
        startAngle: 90,
        splitNumber: 4,
        shape: 'polygon',
        axisName: {
          color: 'rgba(233, 237, 241, 0.84)',
          fontSize: 10,
          fontWeight: 600,
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.12)',
            width: 1,
          },
        },
        splitLine: {
          lineStyle: {
            color: [
              'rgba(255, 255, 255, 0.05)',
              'rgba(255, 255, 255, 0.07)',
              'rgba(255, 255, 255, 0.09)',
              'rgba(255, 255, 255, 0.12)',
            ],
          },
        },
        splitArea: {
          areaStyle: {
            color: [
              'rgba(255, 255, 255, 0.008)',
              'rgba(255, 255, 255, 0.014)',
              'rgba(255, 255, 255, 0.02)',
              'rgba(255, 255, 255, 0.028)',
            ],
          },
        },
        indicator: data.map((item) => ({
          name: item.label,
          max: 99,
        })),
      },
      series: [
        {
          type: 'radar',
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: accentColor,
            width: 2,
          },
          itemStyle: {
            color: accentColor,
            borderColor: '#09111d',
            borderWidth: 1.2,
          },
          areaStyle: {
            color: toRgba(accentColor, 0.2),
          },
          emphasis: {
            lineStyle: {
              width: 2.4,
            },
            areaStyle: {
              color: toRgba(accentColor, 0.26),
            },
          },
          data: [
            {
              value: data.map((item) => item.value),
            },
          ],
        },
      ],
    }),
    [accentColor, data],
  );

  const hotspots = useMemo(() => {
    const width = size.width;
    const height = size.height;

    if (!width || !height || !data.length) {
      return [];
    }

    const centerX = width * RADAR_CENTER_X;
    const centerY = height * RADAR_CENTER_Y;
    const radius = Math.min(width, height) * RADAR_RADIUS_RATIO * 0.5;
    const labelRadius = radius + LABEL_GAP;
    const step = 360 / data.length;

    return data.map((item, index) => {
      const angleDeg = 90 + index * step;
      const angleRad = (angleDeg * Math.PI) / 180;

      const labelX = centerX + labelRadius * Math.cos(angleRad);
      const labelY = centerY - labelRadius * Math.sin(angleRad);

      const pointRadius = radius * (item.value / 99);
      const pointX = centerX + pointRadius * Math.cos(angleRad);
      const pointY = centerY - pointRadius * Math.sin(angleRad);

      return {
        ...item,
        labelX,
        labelY,
        pointX,
        pointY,
        textAnchor: getTextAnchor(angleDeg),
      };
    });
  }, [data, size.height, size.width]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'svg' }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        {hotspots.map((item) => {
          const labelWidth = item.label.length > 9 ? 88 : 70;
          const labelLeft =
            item.textAnchor === 'center'
              ? item.labelX - labelWidth / 2
              : item.textAnchor === 'left'
                ? item.labelX - 6
                : item.labelX - labelWidth + 6;

          return (
            <div key={item.key}>
              <button
                type="button"
                aria-label={`${item.label} ${item.value.toFixed(1)}`}
                onMouseEnter={() =>
                  setHoveredAxis({
                    key: item.key,
                    label: item.label,
                    value: item.value,
                    x: item.labelX,
                    y: item.labelY,
                  })
                }
                onMouseLeave={() =>
                  setHoveredAxis((current) => (current?.key === item.key ? null : current))
                }
                style={{
                  position: 'absolute',
                  left: labelLeft,
                  top: item.labelY - 12,
                  width: labelWidth,
                  height: 24,
                  background: 'transparent',
                  border: 0,
                  padding: 0,
                  margin: 0,
                  pointerEvents: 'auto',
                  cursor: 'help',
                }}
              />

              <button
                type="button"
                aria-label={`${item.label} ${item.value.toFixed(1)}`}
                onMouseEnter={() =>
                  setHoveredAxis({
                    key: item.key,
                    label: item.label,
                    value: item.value,
                    x: item.pointX,
                    y: item.pointY,
                  })
                }
                onMouseLeave={() =>
                  setHoveredAxis((current) => (current?.key === item.key ? null : current))
                }
                style={{
                  position: 'absolute',
                  left: item.pointX - 11,
                  top: item.pointY - 11,
                  width: 22,
                  height: 22,
                  borderRadius: '999px',
                  background: 'transparent',
                  border: 0,
                  padding: 0,
                  margin: 0,
                  pointerEvents: 'auto',
                  cursor: 'help',
                }}
              />
            </div>
          );
        })}

        {hoveredAxis ? (
          <div
            style={{
              position: 'absolute',
              left: hoveredAxis.x,
              top: hoveredAxis.y - 14,
              transform: 'translate(-50%, -100%)',
              padding: '6px 8px',
              border: `1px solid ${toRgba(accentColor, 0.34)}`,
              borderRadius: 8,
              background: 'rgba(10, 14, 18, 0.96)',
              color: '#f5f7fa',
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
            }}
          >
            {hoveredAxis.label}: {hoveredAxis.value.toFixed(1)}
          </div>
        ) : null}
      </div>
    </div>
  );
}