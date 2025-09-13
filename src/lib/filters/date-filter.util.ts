import { startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';

export function getDateFilter(filter?: string, from?: string, to?: string): Record<string, any> {
  const now = new Date();
  let gte: Date | undefined;
  let lte: Date | undefined;

  switch (filter) {
    case 'today':
      gte = startOfDay(now);
      break;
    case 'week':
      gte = startOfWeek(now);
      break;
    case 'month':
      gte = startOfMonth(now);
      break;
    case 'year':
      gte = startOfYear(now);
      break;
    case 'custom':
      if (from) gte = new Date(from);
      if (to) lte = new Date(to);
      break;
  }

  return gte || lte ? { createdAt: { ...(gte && { gte }), ...(lte && { lte }) } } : {};
}
