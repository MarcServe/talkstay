import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Check, X, Trash2, ChevronUp, ChevronDown } from "lucide-react";

interface KnowledgeEntry {
  id: string;
  header: string;
  content: string;
}

interface KnowledgeBaseEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const DATE_PATTERN = /^---\s*(Added|Updated):\s*\d{1,2}\s+\w+\s+\d{4}\s*---$/;
const SPLIT_PATTERN = /\n(---\s*(?:Added|Updated|Legacy Entry).*?---)\n/;

function formatDate(): string {
  const d = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function parseEntries(text: string): KnowledgeEntry[] {
  if (!text.trim()) return [];

  const parts = text.split(SPLIT_PATTERN);
  const entries: KnowledgeEntry[] = [];

  // First part before any delimiter is legacy content
  if (parts[0].trim()) {
    entries.push({
      id: crypto.randomUUID(),
      header: "--- Legacy Entry ---",
      content: parts[0].trim(),
    });
  }

  // Remaining parts come in pairs: [header, content, header, content, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const header = parts[i]?.trim();
    const content = parts[i + 1]?.trim() || "";
    if (header) {
      entries.push({ id: crypto.randomUUID(), header, content });
    }
  }

  return entries;
}

function serializeEntries(entries: KnowledgeEntry[]): string {
  return entries
    .map((e) => {
      if (e.header === "--- Legacy Entry ---") return e.content;
      return `\n${e.header}\n${e.content}`;
    })
    .join("\n")
    .trim();
}

export const KnowledgeBaseEditor = ({ value, onChange }: KnowledgeBaseEditorProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [newEntryText, setNewEntryText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef<Map<string, HTMLElement>>(new Map());

  const entries = useMemo(() => parseEntries(value), [value]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter((e) => e.content.toLowerCase().includes(q));
  }, [entries, searchQuery]);

  // Count total matches across all entries
  const totalMatches = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase();
    let count = 0;
    for (const entry of entries) {
      const content = entry.content.toLowerCase();
      let idx = 0;
      while ((idx = content.indexOf(q, idx)) !== -1) {
        count++;
        idx += q.length;
      }
    }
    return count;
  }, [entries, searchQuery]);

  // Reset match index when search changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  // Scroll to current match
  useEffect(() => {
    if (totalMatches > 0) {
      const el = matchRefs.current.get(`match-${currentMatchIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentMatchIndex, totalMatches]);

  const setMatchRef = useCallback((key: string, el: HTMLElement | null) => {
    if (el) matchRefs.current.set(key, el);
    else matchRefs.current.delete(key);
  }, []);

  const goToNextMatch = () => {
    if (totalMatches > 0) setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
  };

  const goToPrevMatch = () => {
    if (totalMatches > 0) setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
  };

  const updateEntries = (updated: KnowledgeEntry[]) => {
    onChange(serializeEntries(updated));
  };

  const handleAddEntry = () => {
    if (!newEntryText.trim()) return;
    const header = `--- Added: ${formatDate()} ---`;
    const newEntry: KnowledgeEntry = {
      id: crypto.randomUUID(),
      header,
      content: newEntryText.trim(),
    };
    updateEntries([newEntry, ...entries]);
    setNewEntryText("");
  };

  const handleStartEdit = (entry: KnowledgeEntry) => {
    setEditingId(entry.id);
    setEditBuffer(entry.content);
  };

  const handleSaveEdit = (id: string) => {
    const updated = entries.map((e) => {
      if (e.id !== id) return e;
      return {
        ...e,
        header: `--- Updated: ${formatDate()} ---`,
        content: editBuffer.trim(),
      };
    });
    updateEntries(updated);
    setEditingId(null);
    setEditBuffer("");
  };

  const handleDeleteEntry = (id: string) => {
    updateEntries(entries.filter((e) => e.id !== id));
  };

  // Track global match index for highlighting the "current" one
  const globalMatchCounter = useRef(0);

  const highlightMatch = (text: string) => {
    if (!searchQuery.trim()) return text;
    const q = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${q})`, "gi"));
    return parts.map((part, i) => {
      if (part.toLowerCase() === searchQuery.toLowerCase()) {
        const matchIdx = globalMatchCounter.current;
        globalMatchCounter.current++;
        const isCurrent = matchIdx === currentMatchIndex;
        return (
          <mark
            key={i}
            ref={(el) => setMatchRef(`match-${matchIdx}`, el)}
            className={`rounded px-0.5 ${isCurrent ? "bg-orange-400 dark:bg-orange-500 ring-2 ring-orange-500" : "bg-yellow-200 dark:bg-yellow-700"}`}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  // Reset global match counter before each render of entries
  globalMatchCounter.current = 0;

  return (
    <div className="space-y-4">
      {/* Search Bar - Code Editor Style */}
      <div className="flex items-center gap-2 bg-muted/40 border rounded-lg p-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Search knowledge base..."
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (e.shiftKey) goToPrevMatch();
              else goToNextMatch();
            }
          }}
        />
        {searchQuery && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
              {totalMatches > 0 ? `${currentMatchIndex + 1} of ${totalMatches}` : "No results"}
            </span>
            <button
              type="button"
              onClick={goToPrevMatch}
              disabled={totalMatches === 0}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
              title="Previous match (Shift+Enter)"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToNextMatch}
              disabled={totalMatches === 0}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
              title="Next match (Enter)"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="p-1 rounded text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Add New Entry */}
      <div className="border border-dashed border-muted-foreground/30 rounded-lg p-3 space-y-2 bg-muted/20">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add New Knowledge
        </p>
        <Textarea
          value={newEntryText}
          onChange={(e) => setNewEntryText(e.target.value)}
          placeholder="Paste or type new website content, instructions, or knowledge here..."
          rows={4}
          className="resize-y text-sm"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAddEntry}
          disabled={!newEntryText.trim()}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Add Entry
        </Button>
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 && entries.length > 0 && searchQuery && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No entries match "{searchQuery}"
        </p>
      )}

      {filteredEntries.length === 0 && entries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No knowledge entries yet. Add your first entry above.
        </p>
      )}

      <div ref={listRef} className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="border rounded-lg bg-background overflow-hidden"
          >
            {/* Date Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b text-xs text-muted-foreground">
              <span>{entry.header.replace(/^---\s*/, "").replace(/\s*---$/, "")}</span>
              <div className="flex items-center gap-1">
                {editingId !== entry.id && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(entry)}
                      className="p-1 rounded hover:bg-muted"
                      title="Edit entry"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      title="Delete entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-3">
              {editingId === entry.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editBuffer}
                    onChange={(e) => setEditBuffer(e.target.value)}
                    rows={6}
                    className="resize-y text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSaveEdit(entry.id)}
                      className="gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                      className="gap-1"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">
                  {highlightMatch(entry.content)}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>

      {entries.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} total
        </p>
      )}
    </div>
  );
};
