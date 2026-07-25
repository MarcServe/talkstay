import { useState } from "react";
import { X, Mic, Zap } from "lucide-react";
export const ComingSoonBanner = () => {
  const [isVisible, setIsVisible] = useState(true);
  if (!isVisible) return null;
  return <div className="relative bg-gradient-to-r from-purple-100 via-purple-200 to-purple-100 dark:from-purple-600/20 dark:via-purple-500/30 dark:to-purple-400/20 border-b border-purple-300 dark:border-purple-500/20 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-200/50 dark:from-purple-600/10 to-transparent"></div>
      
      <div className="relative container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* Animated microphone icon */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Mic className="w-5 h-5 text-purple-600 dark:text-purple-300 animate-pulse" />
                <div className="absolute inset-0 rounded-full animate-ping bg-purple-400/30"></div>
              </div>
              <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-bounce" />
            </div>

            {/* Main content */}
            <div className="flex items-center gap-3 flex-wrap overflow-hidden flex-1">
              <div className="flex items-center">
                <div className="animate-scroll whitespace-nowrap">
                  <span className="font-bold text-xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                    Turn Your Websites & Documents Into Voice Experiences
                  </span>
                  <span className="text-base font-normal text-purple-500 dark:text-purple-300 ml-1">- Instantly</span>
                  <span className="font-bold text-xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent ml-16">                                                         Turn Your Websites & Documents Into Voice Experiences</span>
                  <span className="text-base font-normal text-purple-500 dark:text-purple-300 ml-1">- Instantly</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA and close button */}
          <div className="flex items-center gap-3">
            <button onClick={() => setIsVisible(false)} className="p-1 rounded-full hover:bg-purple-500/20 transition-colors" aria-label="Close banner">
              <X className="w-4 h-4 text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Animated gradient underline */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse"></div>
    </div>;
};