import React from 'react';
import { Monitor } from 'lucide-react';

interface KeepTabOpenNoticeProps {
  visible: boolean;
}

export const KeepTabOpenNotice: React.FC<KeepTabOpenNoticeProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <Monitor className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-amber-700 dark:text-amber-300">
        <strong>Please keep this browser tab open</strong> until the progress completes. 
        Closing or navigating away may interrupt the process.
      </p>
    </div>
  );
};
