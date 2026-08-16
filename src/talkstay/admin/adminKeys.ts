/** React Query keys for TalkStay platform admin views. */
export const adminKeys = {
  all: ["talkstay-admin"] as const,
  overview: () => [...adminKeys.all, "overview"] as const,
  hotels: (page: number, pageSize: number, q: string) =>
    [...adminKeys.all, "hotels", page, pageSize, q] as const,
  hotelDetail: (hotelId: string) => [...adminKeys.all, "hotel", hotelId] as const,
  users: (page: number, pageSize: number, q: string, product: string) =>
    [...adminKeys.all, "users", page, pageSize, q, product] as const,
  liveLinks: (page: number, pageSize: number) =>
    [...adminKeys.all, "live-links", page, pageSize] as const,
  usage: (days: number, hotelId: string, page: number, pageSize: number) =>
    [...adminKeys.all, "usage", days, hotelId || "all", page, pageSize] as const,
};

export const ADMIN_STALE = {
  overview: 60_000,
  lists: 30_000,
  usage: 45_000,
  detail: 20_000,
} as const;

export const ADMIN_PAGE_SIZE = 50;
