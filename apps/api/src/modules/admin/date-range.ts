import { InputError } from '../../lib/errors.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
const DEFAULT_RANGE_DAYS = 30;

function parseDate(value: unknown, label: string): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new InputError(`${label} phải có định dạng YYYY-MM-DD.`, 'INVALID_DATE_RANGE', 422);
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value)
    throw new InputError(`${label} không hợp lệ.`, 'INVALID_DATE_RANGE', 422);
  return value;
}

function addDays(value: string, days: number) {
  const midnight = Date.parse(`${value}T00:00:00.000Z`);
  return new Date(midnight + days * DAY_MS).toISOString().slice(0, 10);
}

function todayInVietnam(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
}

function sqlUtcMidnightForVietnamDate(value: string) {
  return new Date(Date.parse(`${value}T00:00:00.000Z`) - 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 23)
    .replace('T', ' ');
}

export function parseDateRange(fromInput: unknown, toInput: unknown) {
  const providedFrom = parseDate(fromInput, 'from');
  const providedTo = parseDate(toInput, 'to');
  const to = providedTo ?? todayInVietnam();
  const from = providedFrom ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1));
  if (from > to)
    throw new InputError(
      'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.',
      'INVALID_DATE_RANGE',
      422
    );
  const days =
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS + 1;
  if (days > MAX_RANGE_DAYS)
    throw new InputError(
      `Khoảng ngày tối đa là ${MAX_RANGE_DAYS} ngày.`,
      'INVALID_DATE_RANGE',
      422
    );
  return {
    from,
    to,
    days,
    startUtc: sqlUtcMidnightForVietnamDate(from),
    endUtc: sqlUtcMidnightForVietnamDate(addDays(to, 1))
  };
}
