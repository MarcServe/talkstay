import { useEffect } from "react";

/** Tell search engines and scrapers not to index this surface. */
export default function NoIndexMeta() {
  useEffect(() => {
    const ensure = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      return el;
    };
    const robots = ensure("robots", "noindex, nofollow, noarchive, nosnippet, noimageindex");
    const google = ensure("googlebot", "noindex, nofollow, noarchive, nosnippet");
    return () => {
      robots.setAttribute("content", "index, follow");
      google.remove();
    };
  }, []);
  return null;
}
