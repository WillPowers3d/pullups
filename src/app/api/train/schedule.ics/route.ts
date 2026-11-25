/**
 * GET /api/train/schedule.ics
 *
 * Returns an iCalendar stream with one VEVENT per planned / in-progress
 * session in the user's active training block.
 *
 * - DTSTART;VALUE=DATE = YYYYMMDD (UTC, all-day)
 * - UID = `<session_id>@pullups.amdai.net`
 * - Summary: `Pull · Week <n>` / `Cross` / `Max test` / `PR attempt`
 * - Lines folded per RFC 5545 §3.1 (75-octet limit)
 */

import { getDb } from "@/lib/db";
import { formatUtcDate } from "@/lib/dates";
import { TRAIN_CONFIG } from "@/lib/train/config";

/** RFC 5545 §3.1: fold lines at 75 octets. */
function foldLine(line: string): string {
  const maxOctets = 75;
  const encoded = line.replaceAll(/(?:\r\n|\n)/g, "\\n");
  const result: string[] = [];
  let offset = 0;

  while (offset < encoded.length) {
    const segment = encoded.slice(offset, offset + maxOctets);
    const byteLen = Buffer.byteLength(segment, "utf-8");
    if (byteLen <= maxOctets) {
      result.push(segment);
      offset += segment.length;
      continue;
    }
    // Trim back to stay within 75 octets
    let cut = segment.length;
    while (cut > 0 && Buffer.byteLength(segment.slice(0, cut), "utf-8") > maxOctets) {
      cut--;
    }
    result.push(segment.slice(0, cut));
    offset += cut;
  }

  if (result.length === 1) return result[0]!;
  return result.join(" \r\n");
}

export async function GET() {
  const db = getDb();
  const userId = TRAIN_CONFIG.DEFAULT_USER_ID;

  const block = db
    .prepare(
      "SELECT * FROM train_blocks WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
    )
    .get(userId) as { id: string; pr_date: string } | undefined;

  if (!block) {
    return new Response("No active block", { status: 404 });
  }

  const sessions = db
    .prepare(
      `SELECT id, date, type, week_index FROM train_sessions
       WHERE block_id = ? AND status IN ('planned', 'in_progress')
       ORDER BY date`,
    )
    .all(block.id) as { id: string; date: string; type: string; week_index: number }[];

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pullups//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const session of sessions) {
    const summary = sessionSummary({
      type: session.type,
      weekIndex: session.week_index,
    });
    const uid = `${session.id}@pullups.amdai.net`;
    const dateStr = icsDate(session.date);

    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:${uid}`));
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(foldLine(`SUMMARY:${summary}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const body = lines.join("\r\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar",
      "Content-Disposition": 'inline; filename="schedule.ics"',
    },
  });
}

/** Format a YYYY-MM-DD UTC date as YYYYMMDD UTC. */
function icsDate(ymd: string): string {
  const date = formatUtcDate(new Date(ymd + "T00:00:00Z"));
  return date.replace(/-/g, "").slice(0, 8);
}

/** Build a human-readable summary for a session. */
function sessionSummary(session: { type: string; weekIndex: number }): string {
  const week = session.weekIndex;

  switch (session.type) {
    case "pull":
      return `Pull · Week ${week}`;
    case "cross":
      return "Cross";
    case "max_test":
      return `Max test · Week ${week}`;
    case "pr_attempt":
      return "PR attempt";
    default:
      return `Session · Week ${week}`;
  }
}
