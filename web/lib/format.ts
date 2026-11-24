// Zona waktu tampilan. Server (Vercel) berjalan di UTC, jadi tanggal sesi
// diformat eksplisit ke zona waktu pemilik.
export const APP_TIME_ZONE = "Asia/Jakarta";

const pad = (n: number) => String(n).padStart(2, "0");

/** "5,2" → 5.2. Menerima koma atau titik; null bila bukan angka. */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function formatNumber(n: number, maxFractionDigits = 0): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: maxFractionDigits }).format(n);
}

/** 362 → "6:02" */
export function formatPace(secPerKm: number): string {
  return `${Math.floor(secPerKm / 60)}:${pad(secPerKm % 60)}`;
}

/** 1880 → "00:31:20" */
export function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${pad(h)}:${pad(m)}:${pad(totalSec % 60)}`;
}

export function formatKm(meters: number): string {
  return formatNumber(meters / 1000, 2);
}

export type Unit = "metric" | "imperial";
const KG_TO_LB = 2.20462;
const PACE_FACTOR = 1.609344;

/** "5,2 km" atau "3,23 mi" */
export function formatDistance(distanceM: number, unit: Unit = "metric"): string {
  if (unit === "imperial") return `${formatNumber(distanceM / 1609.344, 2)} mi`;
  return `${formatKm(distanceM)} km`;
}

/** "6:02 /km" atau "9:42 /mi" */
export function formatPaceUnit(secPerKm: number, unit: Unit = "metric"): string {
  const sec = unit === "imperial" ? Math.round(secPerKm * PACE_FACTOR) : secPerKm;
  return `${formatPace(sec)} /${unit === "imperial" ? "mi" : "km"}`;
}

/** "70 kg" atau "154,3 lb" */
export function formatWeightUnit(kg: number, unit: Unit = "metric"): string {
  if (unit === "imperial") return `${formatNumber(kg * KG_TO_LB, 1)} lb`;
  return `${formatNumber(kg, 1)} kg`;
}

/** kg → lb (atau tetap kg) sebagai angka mentah. */
export function kgToUnit(kg: number, unit: Unit): number {
  return unit === "imperial" ? parseFloat((kg * KG_TO_LB).toFixed(1)) : kg;
}

/** Nilai input beban → kg (jika imperial, konversi dari lb). */
export function unitWeightToKg(value: number, unit: Unit): number {
  return unit === "imperial" ? value / KG_TO_LB : value;
}

/** Nilai input jarak (km atau mi) → meter. */
export function distanceInputToM(value: number, unit: Unit): number {
  return unit === "imperial" ? Math.round(value * 1609.344) : Math.round(value * 1000);
}

/** Jarak dalam meter → string input (dengan koma sebagai pemisah desimal). */
export function mToDistanceInput(distanceM: number, unit: Unit): string {
  const v = unit === "imperial" ? distanceM / 1609.344 : distanceM / 1000;
  return String(parseFloat(v.toFixed(2))).replace(".", ",");
}

/** Kalori selalu estimasi: "≈340 kkal". */
export function formatKcal(kcal: number): string {
  return `≈${formatNumber(Math.round(kcal))} kkal`;
}

/** "Sen, 2 Nov" */
export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));
}

/** Nilai untuk <input type="datetime-local"> dalam waktu lokal perangkat. */
export function toDateTimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 3120 → "52 mnt"; 3900 → "1 j 05 mnt" */
export function formatDurationShort(totalSec: number): string {
  const totalMin = Math.round(totalSec / 60);
  if (totalMin < 60) return `${totalMin} mnt`;
  return `${Math.floor(totalMin / 60)} j ${pad(totalMin % 60)} mnt`;
}

/** 1880 → "31:20"; di atas satu jam → "1:02:05" */
export function formatClock(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(totalSec % 60)}` : `${m}:${pad(totalSec % 60)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tanggal Senin (YYYY-MM-DD) dari minggu tempat d berada, di zona waktu aplikasi. */
export function weekStartKey(d: Date): string {
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .split("-")
    .map(Number);
  const utc = new Date(Date.UTC(y, m - 1, day));
  utc.setUTCDate(utc.getUTCDate() - ((utc.getUTCDay() + 6) % 7));
  return utc.toISOString().slice(0, 10);
}

/** "Minggu ini", "Minggu lalu", atau rentang tanggal "26 Okt – 1 Nov". */
export function weekLabel(weekKey: string, currentWeekKey: string): string {
  const start = new Date(`${weekKey}T00:00:00Z`);
  const weeksAgo = Math.round((new Date(`${currentWeekKey}T00:00:00Z`).getTime() - start.getTime()) / (7 * DAY_MS));
  if (weeksAgo === 0) return "Minggu ini";
  if (weeksAgo === 1) return "Minggu lalu";
  const end = new Date(start.getTime() + 6 * DAY_MS);
  const sameYear = weekKey.slice(0, 4) === currentWeekKey.slice(0, 4);
  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}
