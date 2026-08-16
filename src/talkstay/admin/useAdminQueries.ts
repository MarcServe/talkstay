import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { adminApi, loadUsageSummary } from "@/talkstay/admin/adminApi";
import { ADMIN_PAGE_SIZE, ADMIN_STALE, adminKeys } from "@/talkstay/admin/adminKeys";

export type AdminPageMeta = {
  page: number;
  pageSize: number;
  total: number;
};

export type AdminHotelRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  billing_mode?: string;
  owner: { email: string | null; first_name: string | null; last_name: string | null } | null;
};

export type AdminUserLink = {
  product: "talkstay" | "talkweb";
  label: string;
  href: string;
  role?: string;
};

export type AdminUserRow = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  website_url?: string | null;
  created_at: string;
  is_platform_admin: boolean;
  products?: string[];
  links?: AdminUserLink[];
  talkstay?: { owned_hotels: number; staff_roles: number };
  talkweb?: { assistants: number };
};

export type AdminLiveLinkRow = {
  id: string;
  hotel_id: string;
  hotel_name: string;
  hotel_slug: string | null;
  label: string | null;
  is_active: boolean;
  expires_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  url: string;
};

export type AdminOverview = {
  hotels: number;
  activeHotels: number;
  staff: number;
  openRequests: number;
  liveLinks: number;
  rooms: number;
};

export function useAdminOverview() {
  return useQuery({
    queryKey: adminKeys.overview(),
    queryFn: () => adminApi<AdminOverview>("overview"),
    staleTime: ADMIN_STALE.overview,
    gcTime: 30 * 60_000,
  });
}

export function useAdminHotels(page: number, q: string, pageSize = ADMIN_PAGE_SIZE) {
  return useQuery({
    queryKey: adminKeys.hotels(page, pageSize, q),
    queryFn: () =>
      adminApi<{ hotels: AdminHotelRow[] } & AdminPageMeta>("list_hotels", {
        page,
        pageSize,
        q,
      }),
    staleTime: ADMIN_STALE.lists,
    gcTime: 30 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminUsers(
  page: number,
  q: string,
  product: string,
  pageSize = ADMIN_PAGE_SIZE,
) {
  return useQuery({
    queryKey: adminKeys.users(page, pageSize, q, product),
    queryFn: () =>
      adminApi<{ users: AdminUserRow[] } & AdminPageMeta>("list_users", {
        page,
        pageSize,
        q,
        product,
      }),
    staleTime: ADMIN_STALE.lists,
    gcTime: 30 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminLiveLinks(page: number, pageSize = ADMIN_PAGE_SIZE) {
  return useQuery({
    queryKey: adminKeys.liveLinks(page, pageSize),
    queryFn: () =>
      adminApi<{ links: AdminLiveLinkRow[] } & AdminPageMeta>("list_live_links", {
        page,
        pageSize,
      }),
    staleTime: ADMIN_STALE.lists,
    gcTime: 30 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminUsage(
  days: number,
  hotelId: string,
  page: number,
  pageSize = ADMIN_PAGE_SIZE,
) {
  return useQuery({
    queryKey: adminKeys.usage(days, hotelId, page, pageSize),
    queryFn: () =>
      loadUsageSummary({
        days,
        ...(hotelId ? { hotelId } : {}),
        page,
        pageSize,
      }),
    staleTime: ADMIN_STALE.usage,
    gcTime: 30 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function invalidateAdminLists(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: adminKeys.all });
}

export function useInvalidateAdmin() {
  const qc = useQueryClient();
  return () => invalidateAdminLists(qc);
}
