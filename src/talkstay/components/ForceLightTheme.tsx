import { useEffect } from "react";

/**
 * Guest-facing pages are the property's branded surface, not the owner's
 * dashboard. Their backgrounds are built from the property's own colour and
 * set inline, so they stay light whatever the theme — which means inheriting
 * the owner's dark preference paints light text onto a light ground.
 *
 * An owner toggling their dashboard to dark should not change what their
 * guests see, so guest routes opt out of the theme entirely.
 */
export default function ForceLightTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const strip = () => {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    };
    strip();
    // next-themes rewrites the class on a storage event from another tab —
    // put it back to light rather than letting the page flip mid-stay.
    const observer = new MutationObserver(() => {
      if (root.classList.contains("dark")) strip();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      root.style.colorScheme = "";
      if (hadDark) root.classList.add("dark");
    };
  }, []);
  return null;
}
