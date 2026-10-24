// 引擎输出的时刻一律为 ISO8601 且带 +08:00。展示时保留该时区的字面时刻，
// 不使用 new Date() 做本地时区换算，避免用户机器时区不同导致显示漂移。

/** 1998-09-17T06:00:00+08:00 → 1998-09-17 06:00:00 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/);
  if (!m) return iso;
  return `${m[1]} ${m[2]}${m[3] ? ":" + m[3] : ""}`;
}

/** 1998-09-17T06:00:00+08:00 → 1998-09-17 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : iso;
}
