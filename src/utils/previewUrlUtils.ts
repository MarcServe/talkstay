/**
 * Utility function to generate consistent preview URLs with widget-only mode
 * This ensures all preview URLs across the application use the same format
 */

export const generatePreviewUrl = (assistantId: string, baseUrl?: string): string => {
  const base = baseUrl || window.location.origin;
  return `${base}/preview/${assistantId}?mode=widget-only`;
};

/**
 * Utility function to ensure a preview URL has the widget-only parameter
 * and uses /preview/ path instead of /embed/ to avoid React errors
 */
/**
 * Generate a short branded URL from a preview slug
 */
export const generateShortUrl = (slug: string, baseUrl?: string): string => {
  const base = baseUrl || window.location.origin;
  return `${base}/a/${slug}`;
};

/**
 * Generate a URL-safe slug from a business name
 */
export const generateSlugFromName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
};

export const ensureWidgetOnlyMode = (previewUrl: string): string => {
  if (!previewUrl) return previewUrl;
  
  // Replace /embed/ with /preview/ to avoid React errors
  let normalizedUrl = previewUrl.replace('/embed/', '/preview/');
  
  // If already has the parameter, return as-is
  if (normalizedUrl.includes('?mode=widget-only')) {
    return normalizedUrl;
  }
  
  // If has other parameters, append to them
  if (normalizedUrl.includes('?')) {
    return `${normalizedUrl}&mode=widget-only`;
  }
  
  // If no parameters, add the parameter
  return `${normalizedUrl}?mode=widget-only`;
};
