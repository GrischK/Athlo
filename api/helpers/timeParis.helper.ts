const TZ = "Europe/Paris";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function parisNowParts(): { y: number; m: number; d: number; weekday1to7: number } {
  const dtf = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const parts = dtf.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const y = Number(get("year"));
  const m = Number(get("month"));
  const d = Number(get("day"));

  const wd = (get("weekday") || "").toLowerCase();
  const weekday1to7 =
    wd.startsWith("lun") ? 1 :
      wd.startsWith("mar") ? 2 :
        wd.startsWith("mer") ? 3 :
          wd.startsWith("jeu") ? 4 :
            wd.startsWith("ven") ? 5 :
              wd.startsWith("sam") ? 6 :
                7;

  return { y, m, d, weekday1to7 };
}

export function addDaysYMD(ymd: { y: number; m: number; d: number }, deltaDays: number): {
  y: number;
  m: number;
  d: number
} {
  const dt = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function ymdToIsoDate(ymd: { y: number; m: number; d: number }): string {
  return `${ymd.y}-${pad2(ymd.m)}-${pad2(ymd.d)}`;
}

function parisOffsetMinutesAt(utcMillis: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" });
  const tzPart = dtf.formatToParts(new Date(utcMillis)).find((p) => p.type === "timeZoneName")?.value || "GMT+0";
  const m = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  const hh = Number(m[2] || "0");
  const mm = Number(m[3] || "0");
  return sign * (hh * 60 + mm);
}

// Convertit un “mur de temps” Europe/Paris en ISO UTC (string)
export function parisWallTimeToIso(ymd: { y: number; m: number; d: number }, timeLocal: string): string {
  const [hhStr, mmStr] = timeLocal.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);

  // 1er guess: interpréter comme UTC
  let utcMillis = Date.UTC(ymd.y, ymd.m - 1, ymd.d, hh, mm, 0);

  // corrige avec offset Paris à ce moment
  const off1 = parisOffsetMinutesAt(utcMillis);
  utcMillis = Date.UTC(ymd.y, ymd.m - 1, ymd.d, hh, mm, 0) - off1 * 60_000;

  // recalcul offset une fois (DST edge cases)
  const off2 = parisOffsetMinutesAt(utcMillis);
  utcMillis = Date.UTC(ymd.y, ymd.m - 1, ymd.d, hh, mm, 0) - off2 * 60_000;

  return new Date(utcMillis).toISOString();
}

export function parisStartOfWeekMonday(): { y: number; m: number; d: number } {
  const now = parisNowParts();
  const deltaToMonday = 1 - now.weekday1to7; // lundi=1
  return addDaysYMD({ y: now.y, m: now.m, d: now.d }, deltaToMonday);
}
