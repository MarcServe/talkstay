import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Bold, Italic, Palette } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface MiniRichTextProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}

const PRESET_COLORS = [
  '#fcd34d', '#f87171', '#34d399', '#60a5fa', '#a78bfa',
  '#fb923c', '#f472b6', '#ffffff', '#000000', '#94a3b8',
];

const stripHtml = (html: string) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export const MiniRichText: React.FC<MiniRichTextProps> = ({
  id,
  value,
  onChange,
  placeholder,
  maxLength,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!stripHtml(value));
  const lastValueRef = useRef(value);

  // Only sync external value on mount or if value changed externally
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    // Skip if this was our own change
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;
    editor.innerHTML = value;
    setIsEmpty(!stripHtml(value));
  }, [value]);

  // Set initial content on mount
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && value) {
      editor.innerHTML = value;
      setIsEmpty(!stripHtml(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    let html = editor.innerHTML;
    const textOnly = stripHtml(html);

    if (maxLength && textOnly.length > maxLength) {
      editor.innerHTML = lastValueRef.current;
      return;
    }

    const empty = textOnly.trim().length === 0;
    setIsEmpty(empty);
    if (empty) html = '';

    lastValueRef.current = html;
    onChange(html);
  }, [maxLength, onChange]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) return sel.getRangeAt(0).cloneRange();
    return null;
  };

  const restoreSelection = (range: Range | null) => {
    if (!range) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const applyCommand = (command: string, val?: string) => {
    const range = saveSelection();
    const editor = editorRef.current;
    if (!editor) return;

    // Ensure editor is focused without losing selection
    if (document.activeElement !== editor) {
      editor.focus();
      restoreSelection(range);
    }

    document.execCommand(command, false, val);
    emitChange();
  };

  const handleBold = () => applyCommand('bold');
  const handleItalic = () => applyCommand('italic');
  const handleColor = (color: string) => {
    applyCommand('foreColor', color);
    setColorOpen(false);
  };

  const textLength = stripHtml(value).length;

  return (
    <div className="space-y-1.5">
      {/* Toolbar */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleBold}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleItalic}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Popover open={colorOpen} onOpenChange={setColorOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onMouseDown={(e) => e.preventDefault()}
              title="Text color"
            >
              <Palette className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top" align="start">
            <p className="text-[10px] text-muted-foreground mb-1.5">Pick a color</p>
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleColor(color)}
                  title={color}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <span className="text-[10px] text-muted-foreground ml-auto">
          Highlight text, then style it
        </span>
      </div>

      {/* WYSIWYG Editor */}
      <div className="relative">
        <div
          id={id}
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          className="flex min-h-[36px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        />
        {isEmpty && placeholder && (
          <div className="absolute top-2 left-3 text-sm text-muted-foreground pointer-events-none select-none">
            {placeholder}
          </div>
        )}
      </div>

      {maxLength && (
        <p className="text-[10px] text-muted-foreground text-right">
          {textLength}/{maxLength}
        </p>
      )}
    </div>
  );
};
