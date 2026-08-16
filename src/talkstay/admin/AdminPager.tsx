import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

/** Compact prev/next pager for admin tables. */
export function AdminPager({ page, pageSize, total, onPageChange, disabled }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize && page <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-sm text-muted-foreground">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" />
          Prev
        </Button>
        <span className="tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
