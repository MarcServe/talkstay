/**
 * Client-side PDF parsing using pdf.js
 * Extracts text from PDFs locally before uploading to server
 * Avoids server timeouts and reduces API costs for large documents
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker - use CDN for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export interface PDFParseResult {
  pages: Array<{
    url: string;
    title: string;
    content: string;
    headings: string[];
    pageNumber: number;
  }>;
  metadata: {
    fileName: string;
    fileType: string;
    parsedAt: string;
    pageCount: number;
    extractionMethod: string;
  };
  totalCharacters: number;
}

export interface PDFParseProgress {
  currentPage: number;
  totalPages: number;
  percentage: number;
  status: string;
}

/**
 * Extract headings from text content
 */
function extractHeadings(text: string): string[] {
  const lines = text.split('\n');
  const headings: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed.length < 100) {
      const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
      const isTitleCase = /^[A-Z][^.!?]*$/.test(trimmed) && !trimmed.includes(',');
      if (isAllCaps || (isTitleCase && trimmed.split(' ').length <= 8)) {
        headings.push(trimmed);
      }
    }
  }
  
  return headings.slice(0, 20);
}

/**
 * Parse a single PDF page and extract text
 */
async function extractPageText(page: any): Promise<string> {
  try {
    const textContent = await page.getTextContent();
    const textItems = textContent.items as any[];
    
    let lastY = -1;
    let text = '';
    
    for (const item of textItems) {
      if (item.str) {
        // Add newline if Y position changed significantly (new line)
        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
          text += '\n';
        }
        text += item.str;
        lastY = item.transform[5];
      }
    }
    
    return text;
  } catch (error) {
    console.error('Error extracting page text:', error);
    return '';
  }
}

/**
 * Parse PDF file on the client side using pdf.js
 * @param file - The PDF file to parse
 * @param fileName - The file name
 * @param onProgress - Optional callback for progress updates
 */
export async function parseClientPDF(
  file: File,
  fileName: string,
  onProgress?: (progress: PDFParseProgress) => void
): Promise<PDFParseResult> {
  console.log(`[Client PDF Parser] Starting parsing: ${fileName}, size: ${file.size} bytes`);
  
  try {
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    console.log(`[Client PDF Parser] PDF loaded: ${numPages} pages`);
    
    const pages: PDFParseResult['pages'] = [];
    let totalCharacters = 0;
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (onProgress) {
        onProgress({
          currentPage: pageNum,
          totalPages: numPages,
          percentage: Math.round((pageNum / numPages) * 100),
          status: `Extracting page ${pageNum} of ${numPages}...`
        });
      }
      
      try {
        const page = await pdf.getPage(pageNum);
        const pageText = await extractPageText(page);
        
        if (pageText.trim()) {
          const headings = extractHeadings(pageText);
          
          pages.push({
            url: `uploaded://${fileName}#page=${pageNum}`,
            title: headings[0] || `${fileName} - Page ${pageNum}`,
            content: pageText.trim(),
            headings,
            pageNumber: pageNum
          });
          
          totalCharacters += pageText.length;
        }
      } catch (pageError) {
        console.warn(`[Client PDF Parser] Error on page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    console.log(`[Client PDF Parser] Extraction complete: ${pages.length} pages, ${totalCharacters} characters`);
    
    // If no text was extracted, throw an error
    if (pages.length === 0 || totalCharacters < 50) {
      throw new Error(
        'Could not extract meaningful text from this PDF. The document may be: ' +
        '1) Entirely image-based/scanned (requires OCR), ' +
        '2) Password-protected, or ' +
        '3) Corrupted. Please try converting to DOCX or TXT format.'
      );
    }
    
    // Get document metadata if available
    let docTitle = fileName.replace(/\.[^.]+$/, '');
    try {
      const metadata = await pdf.getMetadata();
      const info = metadata?.info as Record<string, unknown> | undefined;
      if (info?.Title && typeof info.Title === 'string') {
        docTitle = info.Title;
      }
    } catch {
      // Metadata not available
    }
    
    // Combine all pages into one main content block for better context
    const combinedContent = pages.map(p => p.content).join('\n\n---PAGE BREAK---\n\n');
    const allHeadings = [...new Set(pages.flatMap(p => p.headings))].slice(0, 20);
    
    // Return both individual pages and a combined view
    return {
      pages: [{
        url: `uploaded://${fileName}`,
        title: docTitle,
        content: combinedContent,
        headings: allHeadings,
        pageNumber: 0
      }],
      metadata: {
        fileName,
        fileType: 'pdf',
        parsedAt: new Date().toISOString(),
        pageCount: numPages,
        extractionMethod: 'pdfjs-client'
      },
      totalCharacters
    };
    
  } catch (error: any) {
    console.error('[Client PDF Parser] Error:', error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Check if a PDF should be parsed client-side
 * Returns true for PDFs larger than 5MB or estimated to have many pages
 */
export function shouldUseClientParsing(file: File): boolean {
  const fileSizeMB = file.size / (1024 * 1024);
  
  // Use client-side parsing for files larger than 5MB
  // This avoids server timeout issues and reduces API costs
  if (fileSizeMB > 5) {
    console.log(`[Client PDF Parser] File is ${fileSizeMB.toFixed(2)}MB, using client-side parsing`);
    return true;
  }
  
  return false;
}
