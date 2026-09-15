import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import type { Room } from "@/talkstay/lib/hotels";

/**
 * Room / area chooser that can be typed into. A plain <Select> is fine for a
 * guesthouse and unusable for a hotel with three hundred rooms — the list is
 * ordered by room number, so finding 214 means scrolling past two hundred
 * others.
 *
 * Public areas are grouped separately because they are a different question:
 * "which room is the guest in" versus "which bar are they standing at".
 */
export default function RoomPicker({
  rooms,
  value,
  onChange,
  placeholder = "Select room or public area",
  disabled,
}: {
  rooms: Room[];
  value: string;
  onChange: (roomId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => rooms.find((r) => r.id === value), [rooms, value]);
  const bedrooms = useMemo(() => rooms.filter((r) => !r.is_public), [rooms]);
  const publicAreas = useMemo(() => rooms.filter((r) => !!r.is_public), [rooms]);

  const row = (r: Room) => (
    <CommandItem
      key={r.id}
      // cmdk matches on this, not on the rendered children — without the room
      // number in it, typing "214" finds nothing.
      value={`${r.room_number} ${r.is_public ? "public area venue" : "room bedroom"}`}
      onSelect={() => { onChange(r.id); setOpen(false); }}
    >
      <Check className={`mr-2 h-4 w-4 ${r.id === value ? "opacity-100" : "opacity-0"}`} />
      <span className="truncate">{formatRoomLabel(r.room_number)}</span>
      {r.is_public && (
        <span className="ml-2 shrink-0 rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-200">
          Public
        </span>
      )}
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={selected ? "truncate" : "truncate text-muted-foreground"}>
            {selected ? formatRoomLabel(selected.room_number) : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Type a room number or area…"
              className="h-10 border-0 focus:ring-0"
            />
          </div>
          <CommandList className="max-h-64">
            <CommandEmpty>No room or area matches that.</CommandEmpty>
            {bedrooms.length > 0 && (
              <CommandGroup heading={`Rooms (${bedrooms.length})`}>{bedrooms.map(row)}</CommandGroup>
            )}
            {publicAreas.length > 0 && (
              <CommandGroup heading={`Public areas (${publicAreas.length})`}>{publicAreas.map(row)}</CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
