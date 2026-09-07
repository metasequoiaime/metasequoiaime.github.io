import { useId, useMemo, useRef, useState } from "react";

export type StarPoint = { month: string; stars: number };

const VIEW_W = 720;
const VIEW_H = 250;
const PAD = { top: 18, right: 58, bottom: 30, left: 48 };

const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

/**
 * 选一组人读得顺的纵轴刻度。
 *
 * 先把上界取整再等分是不行的：1354 取整到 1500、再四等分，刻度会变成 375 / 1125 这种没人会读的数。要先定一个整的步长（1 / 2 / 2.5 / 5 的十倍数），再让上界落在步长的整数倍上。
 */
const niceScale = (maxValue: number, targetTicks = 4) => {
  if (maxValue <= 0) return { max: 1, ticks: [0, 1] };

  const rawStep = maxValue / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rawStep) ?? 10 * magnitude;
  const max = Math.ceil(maxValue / step) * step;

  const ticks: number[] = [];
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(Math.round(value));
  return { max, ticks };
};

const groupThousands = (value: number) => value.toLocaleString("en-US");

/** 2023-11 → 2023 年 11 月 */
const readableMonth = (month: string) => {
  const [year, index] = month.split("-");
  return `${year} 年 ${Number(index)} 月`;
};

export function StarHistoryChart({ series }: { series: StarPoint[] }) {
  const gradientId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const scale = niceScale(Math.max(...series.map((point) => point.stars), 1));
    const max = scale.max;
    const x = (index: number) =>
      PAD.left + (series.length === 1 ? PLOT_W / 2 : (index / (series.length - 1)) * PLOT_W);
    const y = (stars: number) => PAD.top + PLOT_H - (stars / max) * PLOT_H;

    const line = series.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)} ${y(point.stars)}`).join(" ");
    const area = `${line} L${x(series.length - 1)} ${PAD.top + PLOT_H} L${x(0)} ${PAD.top + PLOT_H} Z`;

    const ticks = scale.ticks.map((value) => ({ value, y: y(value) }));

    // 横轴只标首、中、末三个月份，标满会糊成一片
    const labelled = [0, Math.floor((series.length - 1) / 2), series.length - 1].filter(
      (index, position, all) => all.indexOf(index) === position
    );

    return { max, x, y, line, area, ticks, labelled };
  }, [series]);

  const last = series[series.length - 1];
  const active = hovered === null ? null : series[hovered];

  const trackPointer = (clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;

    const box = frame.getBoundingClientRect();
    const withinView = ((clientX - box.left) / box.width) * VIEW_W;
    const ratio = (withinView - PAD.left) / PLOT_W;
    const index = Math.round(ratio * (series.length - 1));
    setHovered(Math.min(series.length - 1, Math.max(0, index)));
  };

  return (
    <div className="star-chart">
      <div
        className="star-chart-frame"
        ref={frameRef}
        onPointerMove={(event) => {
          trackPointer(event.clientX);
        }}
        onPointerLeave={() => {
          setHovered(null);
        }}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label={`GitHub Star 累计趋势：从 ${readableMonth(series[0].month)} 的 ${series[0].stars} 增长到 ${readableMonth(last.month)} 的 ${last.stars}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-series)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--chart-series)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {geometry.ticks.map((tick) => (
            <g key={tick.value}>
              <line className="star-chart-grid" x1={PAD.left} y1={tick.y} x2={PAD.left + PLOT_W} y2={tick.y} />
              <text className="star-chart-tick" x={PAD.left - 10} y={tick.y + 4} textAnchor="end">
                {groupThousands(tick.value)}
              </text>
            </g>
          ))}

          {geometry.labelled.map((index) => (
            <text
              key={series[index].month}
              className="star-chart-tick"
              x={geometry.x(index)}
              y={VIEW_H - 10}
              textAnchor={index === 0 ? "start" : index === series.length - 1 ? "end" : "middle"}
            >
              {series[index].month}
            </text>
          ))}

          <path d={geometry.area} fill={`url(#${gradientId})`} />
          {/* non-scaling-stroke：SVG 会按容器等比缩放，窄屏上不加这个线宽会被缩到 1px 以下 */}
          <path className="star-chart-line" d={geometry.line} vectorEffect="non-scaling-stroke" />

          {active && (
            <line
              className="star-chart-crosshair"
              x1={geometry.x(hovered ?? 0)}
              y1={PAD.top}
              x2={geometry.x(hovered ?? 0)}
              y2={PAD.top + PLOT_H}
            />
          )}

          {/* 末点直接标数值；中间的点交给悬停提示，逐点标数字只会糊成一团 */}
          <circle className="star-chart-dot" cx={geometry.x(series.length - 1)} cy={geometry.y(last.stars)} r="4.5" />
          <text
            className="star-chart-endlabel"
            x={geometry.x(series.length - 1) + 12}
            y={geometry.y(last.stars) + 4}
          >
            {groupThousands(last.stars)}
          </text>

          {active && hovered !== null && (
            <circle className="star-chart-dot" cx={geometry.x(hovered)} cy={geometry.y(active.stars)} r="4.5" />
          )}
        </svg>

        {active && hovered !== null && (
          <div
            className="star-chart-tip"
            // 贴着两端时把提示框拉回来，免得溢出图外
            style={{ left: `${Math.min(88, Math.max(12, (geometry.x(hovered) / VIEW_W) * 100))}%` }}
            aria-hidden="true"
          >
            <strong>{groupThousands(active.stars)}</strong>
            <span>{readableMonth(active.month)}</span>
          </div>
        )}
      </div>

      <details className="star-chart-table">
        <summary>查看数据表</summary>
        <div className="star-chart-table-scroll">
          <table>
            <caption>各月末的 GitHub Star 累计数</caption>
            <thead>
              <tr>
                <th scope="col">月份</th>
                <th scope="col">累计 Star</th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.month}>
                  <th scope="row">{point.month}</th>
                  <td>{groupThousands(point.stars)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
