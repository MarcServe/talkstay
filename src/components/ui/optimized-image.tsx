import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  className?: string;
}

/**
 * OptimizedImage — Uses IntersectionObserver for true lazy loading,
 * shows a shimmer placeholder while loading, and fades in on load.
 * Also adds decoding="async" and fetchpriority="low" for non-blocking decode.
 */
export const OptimizedImage = ({ src, alt, className = "", ...props }: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
      { rootMargin: "300px 0px" } // start loading 300px before viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Shimmer placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`${className} transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          decoding="async"
          // @ts-ignore - fetchpriority is valid HTML but not yet in React types
          fetchpriority="low"
          onLoad={() => setIsLoaded(true)}
          {...props}
        />
      )}
    </div>
  );
};
