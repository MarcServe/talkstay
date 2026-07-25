import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

interface EmailListInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailListInput: React.FC<EmailListInputProps> = ({
  value,
  onChange,
  placeholder = 'name@example.com',
  id,
}) => {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addOne = (raw: string) => {
    const trimmed = raw.trim().replace(/[,;]+$/, '');
    if (!trimmed) return;
    if (!EMAIL_RE.test(trimmed)) {
      setError(`"${trimmed}" is not a valid email`);
      return;
    }
    if (value.includes(trimmed)) {
      setError('Already added');
      return;
    }
    onChange([...value, trimmed]);
    setError(null);
  };

  const handleAdd = () => {
    // Allow comma-separated paste
    const parts = draft.split(/[,;\s]+/).filter(Boolean);
    if (parts.length === 0) return;
    let updated = [...value];
    let firstError: string | null = null;
    for (const p of parts) {
      const t = p.trim();
      if (!t) continue;
      if (!EMAIL_RE.test(t)) {
        if (!firstError) firstError = `"${t}" is not a valid email`;
        continue;
      }
      if (!updated.includes(t)) updated.push(t);
    }
    onChange(updated);
    setError(firstError);
    setDraft('');
  };

  const remove = (email: string) => {
    onChange(value.filter((e) => e !== email));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={id}
          type="email"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              handleAdd();
            } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => {
            if (draft.trim()) handleAdd();
          }}
          placeholder={placeholder}
        />
        <Button type="button" onClick={handleAdd} size="icon" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((email) => (
            <Badge key={email} variant="secondary" className="flex items-center gap-1">
              {email}
              <button
                type="button"
                onClick={() => remove(email)}
                className="ml-1 hover:text-destructive"
                aria-label={`Remove ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
