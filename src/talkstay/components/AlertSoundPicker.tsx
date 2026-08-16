import { useState } from "react";
import { Bell, Volume2 } from "lucide-react";
import { toast } from "sonner";
import {
  ALERT_SOUNDS,
  enableAlertSounds,
  getAlertSoundId,
  notificationPermission,
  previewAlertSound,
  setAlertSoundId,
  type AlertSoundId,
} from "@/talkstay/lib/alerts";
import { enablePush, pushSupported } from "@/talkstay/lib/push";

/** Sidebar footer: enable notifications + pick which in-app alert sound to play. */
export default function AlertSoundPicker({ hotelId }: { hotelId: string }) {
  const [soundId, setSoundId] = useState<AlertSoundId>(() => getAlertSoundId());
  const showEnable = pushSupported() || notificationPermission() !== "unsupported";

  const pick = async (id: AlertSoundId) => {
    setAlertSoundId(id);
    setSoundId(id);
    try {
      await previewAlertSound(id);
      toast.message(`Alert sound: ${ALERT_SOUNDS.find((s) => s.id === id)?.label ?? id}`);
    } catch {
      toast.message("Sound saved — tap Enable alert sounds if you can’t hear a preview.");
    }
  };

  const enable = async () => {
    try {
      const { iosNeedsHomeScreenInstall, IOS_ADD_HOME_SCREEN_HINT } = await import("@/talkstay/lib/install");
      if (iosNeedsHomeScreenInstall()) {
        toast.message(IOS_ADD_HOME_SCREEN_HINT);
        return;
      }
      const { permission } = await enableAlertSounds();
      if (permission !== "granted") {
        toast.error(
          permission === "denied"
            ? "Notifications are blocked — enable them in browser settings."
            : permission === "unsupported"
              ? IOS_ADD_HOME_SCREEN_HINT
              : "Couldn't enable alert sounds.",
        );
        return;
      }
      if (pushSupported()) await enablePush(hotelId);
      toast.success("Alert sounds & notifications are on for this device.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't enable alerts");
    }
  };

  return (
    <div className="space-y-1.5">
      {showEnable && (
        <button
          type="button"
          onClick={() => void enable()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
        >
          <Bell className="h-4 w-4 shrink-0" /> Enable alert sounds
        </button>
      )}

      <div className="px-3 pb-1">
        <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/35">
          <Volume2 className="h-3 w-3" /> Alert sound
        </label>
        <div className="flex gap-1.5">
          <select
            value={soundId}
            onChange={(e) => void pick(e.target.value as AlertSoundId)}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-violet-400"
            aria-label="Choose alert sound"
          >
            {ALERT_SOUNDS.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#1c1628] text-white">
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void previewAlertSound(soundId)}
            className="shrink-0 rounded-lg border border-white/15 px-2 py-1.5 text-[11px] font-medium text-violet-200 hover:bg-white/5"
            title="Preview sound"
          >
            Play
          </button>
        </div>
      </div>
    </div>
  );
}
