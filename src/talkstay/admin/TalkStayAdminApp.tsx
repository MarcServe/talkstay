import { Route, Routes } from "react-router-dom";
import TalkStayAdminLayout from "@/talkstay/admin/TalkStayAdminLayout";
import AdminOverview from "@/talkstay/admin/AdminOverview";
import AdminHotels from "@/talkstay/admin/AdminHotels";
import AdminHotelDetail from "@/talkstay/admin/AdminHotelDetail";
import AdminLiveLinks from "@/talkstay/admin/AdminLiveLinks";
import AdminUsers from "@/talkstay/admin/AdminUsers";
import AdminUsage from "@/talkstay/admin/AdminUsage";
import AdminSettings from "@/talkstay/admin/AdminSettings";
import NoIndexMeta from "@/talkstay/components/NoIndexMeta";

/** TalkStay platform admin — /admin/* */
export default function TalkStayAdminApp() {
  return (
    <>
      <NoIndexMeta />
      <Routes>
        <Route element={<TalkStayAdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="hotels" element={<AdminHotels />} />
          <Route path="hotels/:hotelId" element={<AdminHotelDetail />} />
          <Route path="usage" element={<AdminUsage />} />
          <Route path="live-links" element={<AdminLiveLinks />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </>
  );
}
