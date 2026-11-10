/** Relative time against current timestamp */
export function timeAgo(iso: string, now = Date.now()) {
  const diff = Math.round((now - new Date(iso).getTime()) / 60_000);
  const abs = Math.abs(diff);
  const fmt = abs < 60 ? `${abs}m` : abs < 1440 ? `${Math.round(abs / 60)}h` : `${Math.round(abs / 1440)}d`;
  return diff >= 0 ? `${fmt} ago` : `in ${fmt}`;
}

export function shortDate(iso: string) {
  return (
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }) + " UTC"
  );
}
