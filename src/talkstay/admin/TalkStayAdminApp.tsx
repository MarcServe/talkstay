import { Route, Routes } from "react-router-dom";
import TalkStayAdminLayout from "@/talkstay/admin/TalkStayAdminLayout";
import AdminOverview from "@/talkstay/admin/AdminOverview";
import AdminHotels from "@/talkstay/admin/AdminHotels";
import AdminHotelDetail from "@/talkstay/admin/AdminHotelDetail";
import AdminLiveLinks from "@/talkstay/admin/AdminLiveLinks";
import AdminUsers from "@/talkstay/admin/AdminUsers";

/** TalkStay platform admin — /admin/* */
export default function TalkStayAdminApp() {
  return (
    <Routes>
      <Route element={<TalkStayAdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="hotels" element={<AdminHotels />} />
        <Route path="hotels/:hotelId" element={<AdminHotelDetail />} />
        <Route path="live-links" element={<AdminLiveLinks />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>
    </Routes>
  );
}
