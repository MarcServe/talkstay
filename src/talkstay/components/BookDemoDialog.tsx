import { X, CalendarCheck } from "lucide-react";
import DemoRequestForm from "@/talkstay/components/DemoRequestForm";

/** "Book a live demo" — modal chrome around the shared enquiry form. */
export default function BookDemoDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <CalendarCheck className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight">Book a live demo</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <DemoRequestForm onClose={onClose} />
      </div>
    </div>
  );
}
