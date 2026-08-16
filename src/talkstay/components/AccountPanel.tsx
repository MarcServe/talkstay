import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Building2, LifeBuoy, Mail, BookOpen, LogOut, ExternalLink, Plus } from "lucide-react";
import type { Hotel } from "@/talkstay/lib/hotels";
import {
  directSupportMailto,
  ensurePartnersLoaded,
  partnerForReferral,
  supportLabelForHotel,
} from "@/talkstay/lib/partners";
import { SUPPORT_EMAIL, SUPPORT_PHONE, TEL_SUPPORT } from "@/config/contact";
import { supabase } from "@/integrations/supabase/client";
import GuestAccessTip from "@/talkstay/components/GuestAccessTip";

/** Authenticated profile — Direct Support (partner-aware) + FAQ entry. */
export default function AccountPanel({
  hotel,
  email,
  displayName,
  roleLabel,
  canAddProperty,
  onAddProperty,
}: {
  hotel: Hotel;
  email?: string | null;
  displayName: string;
  roleLabel: string;
  /** Owners can add another property from Account (easier than sidebar-only). */
  canAddProperty?: boolean;
  onAddProperty?: () => void;
}) {
  useEffect(() => {
    void ensurePartnersLoaded();
  }, []);

  const partner = partnerForReferral(hotel.referral_code);
  const supportHref = directSupportMailto({
    referralCode: hotel.referral_code,
    hotelName: hotel.name,
    email,
    roleLabel,
  });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <GuestAccessTip compact />
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{displayName}</h2>
        {email && <p className="mt-0.5 text-sm text-muted-foreground">{email}</p>}
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">Property</dt>
            <dd className="text-right font-medium">{hotel.name}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="text-right font-medium">{roleLabel}</dd>
          </div>
          {hotel.referral_code && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Referral</dt>
              <dd className="text-right font-medium">{hotel.referral_code}</dd>
            </div>
          )}
        </dl>
      </div>

      {canAddProperty && onAddProperty && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">Portfolio</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add another hotel, serviced apartment, or short-let under the same owner account. Also available as{" "}
                <span className="font-medium text-foreground">+ Add property</span> under the property name in the sidebar.
              </p>
              <Button type="button" className="mt-3 bg-violet-600 hover:bg-violet-700" onClick={onAddProperty}>
                <Plus className="mr-1.5 h-4 w-4" /> Add property
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-violet-200/80 bg-violet-50/50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-tight text-violet-950">
              Direct Support
            </h3>
            <p className="mt-1 text-sm text-violet-900/80">
              {partner
                ? `Your property is linked to ${partner.name}. This email goes to them with your property details attached.`
                : "Email TalkStay with your property and account details prefilled so we can help faster."}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button asChild className="bg-violet-600 hover:bg-violet-700">
                <a href={supportHref}>
                  <Mail className="mr-1.5 h-4 w-4" />
                  {supportLabelForHotel(hotel.referral_code)}
                </a>
              </Button>
              <Button asChild variant="outline" className="border-violet-200 bg-white/80">
                <a href={TEL_SUPPORT}>
                  Call {SUPPORT_PHONE}
                </a>
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-violet-900/60">
              Default inbox: {partner?.email ?? SUPPORT_EMAIL}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold">FAQ & guides</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Public rooms, walk-in orders, payments, notifications, and more.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/support" target="_blank" rel="noopener noreferrer">
                Open Support & FAQ <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => void supabase.auth.signOut()}
      >
        <LogOut className="mr-1.5 h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}
