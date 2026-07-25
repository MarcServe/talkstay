interface KnowledgeBaseEntry {
  metadata?: {
    title?: string;
    meta?: Record<string, string>;
  };
  headings?: string[];
  links?: Array<{ text: string; href: string }>;
  images?: Array<{ alt: string; src: string }>;
  full_text?: string;
}

interface ProcessedKnowledgeBase {
  navigation: Array<{ href: string; text: string }>;
  content: string[];
  headings: string[];
  allPages: Array<{
    url: string;
    title: string;
    content: string;
    headings: string[];
    paragraphs: string[];
    contactInfo: Array<{ type: 'email' | 'phone'; value: string }>;
  }>;
  url: string;
  title: string;
  description: string;
  contactSummary: {
    emails: string[];
    phones: string[];
  };
}

export function validateKnowledgeBaseJson(jsonData: any): boolean {
  if (!jsonData) return false;

  // Single Firecrawl page result: { success, data: { markdown, metadata } }
  const fcData = jsonData?.data || jsonData;
  if (fcData && typeof fcData === 'object' && !Array.isArray(fcData)) {
    const hasContent = typeof fcData.markdown === 'string' || typeof fcData.html === 'string' || 
                       typeof fcData.rawHtml === 'string' || typeof fcData.content === 'string' || 
                       typeof fcData.full_text === 'string';
    if (hasContent) return true;
  }

  // Already-processed shape
  if (typeof jsonData === 'object' && Array.isArray(jsonData.allPages)) {
    return jsonData.allPages.length > 0 && typeof jsonData.allPages[0].url === 'string';
  }

  // Firecrawl-like shape
  if (typeof jsonData === 'object' && Array.isArray(jsonData.pages)) {
    return jsonData.pages.some((p: any) => typeof p?.url === 'string' && (
      typeof p?.content === 'string' || typeof p?.full_text === 'string' || typeof p?.text === 'string' || typeof p?.markdown === 'string'
    ));
  }

  // Array of pages
  if (Array.isArray(jsonData)) {
    return jsonData.some((p: any) => typeof p?.url === 'string' && (
      typeof p?.content === 'string' || typeof p?.full_text === 'string' || typeof p?.text === 'string' || typeof p?.markdown === 'string'
    ));
  }

  // Map keyed by URL (SiteSucker-style)
  if (typeof jsonData === 'object') {
    const keys = Object.keys(jsonData);
    if (keys.length === 0) return false;
    const firstEntry = (jsonData as any)[keys[0]];
    return !!firstEntry && (firstEntry.metadata || firstEntry.headings || firstEntry.full_text || firstEntry.content);
  }

  return false;
}

export function processKnowledgeBase(jsonData: any, websiteUrl: string): ProcessedKnowledgeBase {
  type PageIn = { url?: string; title?: string; content?: string; full_text?: string; text?: string; markdown?: string; headings?: string[]; links?: any[]; contactInfo?: Array<{type:'email'|'phone';value:string}> };

  // Normalize input into an array of pages
  let pages: PageIn[] = [];
  if (jsonData && Array.isArray(jsonData.allPages)) {
    pages = jsonData.allPages as PageIn[];
  } else if (jsonData && Array.isArray(jsonData.pages)) {
    pages = jsonData.pages as PageIn[];
  } else if (Array.isArray(jsonData)) {
    pages = jsonData as PageIn[];
  } else if (jsonData && typeof jsonData === 'object') {
    // Map keyed by URL
    pages = Object.entries(jsonData).map(([url, entry]: [string, any]) => ({ url, ...(entry as any) }));
  }

  const allPages: Array<{
    url: string;
    title: string;
    content: string;
    headings: string[];
    paragraphs: string[];
    contactInfo: Array<{ type: 'email' | 'phone'; value: string }>;
  }> = [];

  const allNavigation: Array<{ href: string; text: string }> = [];
  const allContent: string[] = [];
  const allHeadings: string[] = [];

  let siteTitle = '';
  let siteDescription = '';

  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const phoneRegex = /(?:(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{2,4}[\s.-])?\d{3,4}[\s.-]\d{3,4}|\+?\d{7,15})/g;

  const emailSet = new Set<string>();
  const phoneSet = new Set<string>();

  pages.forEach((raw, idx) => {
    const pageUrl = (raw.url || '').trim();
    const normalizedUrl = pageUrl.startsWith('http') ? pageUrl : (pageUrl ? `https://${pageUrl}` : websiteUrl);
    const title = raw.title || (pageUrl ? pageUrl.split('/').pop()?.replace(/[-_]/g, ' ') || 'Untitled Page' : 'Untitled Page');
    const content = raw.content || raw.full_text || raw.text || raw.markdown || '';
    const headings = Array.isArray(raw.headings) ? raw.headings : [];

    // Extract contact info
    const emails = (content.match(emailRegex) || []).map(e => e.toLowerCase().trim());
    const phones = (content.match(phoneRegex) || []).map(p => p.trim());
    const ci: Array<{ type: 'email' | 'phone'; value: string }> = [];
    const dedupEmail = new Set(emails);
    const dedupPhone = new Set(phones);

    // Include any provided contactInfo
    if (Array.isArray(raw.contactInfo)) {
      raw.contactInfo.forEach((c) => {
        if (c?.type === 'email' && c.value) dedupEmail.add(c.value.toLowerCase());
        if (c?.type === 'phone' && c.value) dedupPhone.add(c.value.trim());
      });
    }

    dedupEmail.forEach(e => emailSet.add(e));
    dedupPhone.forEach(p => phoneSet.add(p));

    dedupEmail.forEach(e => ci.push({ type: 'email', value: e }));
    dedupPhone.forEach(p => ci.push({ type: 'phone', value: p }));

    // Derive paragraphs
    const paragraphs = (typeof content === 'string' ? content : '')
      .split(/\n{2,}|\r\n{2,}|(?<=[.!?])\s+(?=[A-Z])/)
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .slice(0, 20);

    allPages.push({
      url: normalizedUrl,
      title,
      content,
      headings,
      paragraphs,
      contactInfo: ci,
    });

    if (content) allContent.push(content);
    allHeadings.push(...headings);

    // Navigation links if present
    if (Array.isArray((raw as any).links)) {
      (raw as any).links.forEach((link: any) => {
        if (link?.text && link?.href && !String(link.href).startsWith('#')) {
          allNavigation.push({ href: link.href, text: String(link.text).trim() });
        }
      });
    }

    // Site title/description from first page
    if (idx === 0) {
      siteTitle = title;
    }
  });

  // Remove duplicate navigation items
  const uniqueNavigation = allNavigation.filter((item, index, self) =>
    index === self.findIndex(t => t.href === item.href && t.text === item.text)
  );

  return {
    navigation: uniqueNavigation,
    content: allContent,
    headings: allHeadings,
    allPages,
    url: websiteUrl,
    title: siteTitle,
    description: siteDescription,
    contactSummary: {
      emails: Array.from(emailSet),
      phones: Array.from(phoneSet),
    },
  };
}

// Purpose-specific prompt templates
const purposeTemplates = {
  general_assistant: `You are a helpful voice assistant that provides comprehensive information and assistance.`,
  sales_lead_generation: `You are a sales-focused voice assistant. Your primary goals are to qualify leads, understand customer needs, collect contact information, and highlight the value propositions of products/services. Use persuasive but natural language, ask qualifying questions, and guide conversations toward conversion opportunities.`,
  customer_support: `You are a customer support specialist focused on resolving issues efficiently. Prioritize understanding the problem, showing empathy, providing clear solutions, and knowing when to escalate to human support. Always maintain a helpful and patient tone.`,
  marketing_promotion: `You are a marketing assistant focused on brand awareness and engagement. Highlight key benefits, share promotional content, create excitement about products/services, and encourage user engagement. Use enthusiastic and engaging language while staying authentic.`,
  appointment_booking: `You are an appointment scheduling specialist. Your main focus is efficiently booking appointments, checking availability, confirming details, and sending calendar invitations. Be clear about time slots, handle rescheduling requests, and ensure all booking details are captured accurately.`,
  product_information: `You are a product information specialist. Provide detailed, accurate information about products/services, answer technical questions, compare options, and help customers make informed decisions. Focus on being thorough yet concise.`,
  technical_support: `You are a technical support specialist. Guide users through troubleshooting steps, explain technical concepts clearly, provide step-by-step instructions, and know when issues require escalation. Be patient and thorough in your explanations.`,
  event_management: `You are an event management assistant. Help with event information, registrations, schedules, logistics, and attendee questions. Provide clear details about dates, locations, agendas, and how to participate.`
};

// Document type-specific prompt templates
const documentTypePrompts: Record<string, string> = {
  resume: `You are a professional resume assistant. Help visitors understand this person's qualifications, experience, skills, and career achievements. Answer questions about work history, education, capabilities, and professional background. Be informative and highlight relevant qualifications when answering questions. Present the person professionally and accurately.`,
  
  contract: `You are a contract information assistant. Help users understand the key terms, clauses, and provisions in this document. Be precise about specific terms and always recommend consulting a legal professional for legal advice. Never provide legal advice - only explain what is written in the document.`,
  
  faq: `You are a FAQ assistant. Answer questions directly and concisely based on the FAQ content. If a question matches an FAQ entry, provide that answer. For related questions, guide users to relevant FAQ topics. Be helpful and thorough while staying focused on documented answers.`,
  
  policy: `You are a policy information assistant. Help users understand policies, terms, and guidelines clearly. Be precise and accurate when explaining policy details. Always refer users to official channels for policy clarifications or exceptions.`,
  
  product_catalog: `You are a product information specialist. Help users find products, compare options, and understand specifications. Provide accurate product details and help customers make informed decisions. Be knowledgeable about features, pricing, and availability.`,
  
  company_profile: `You are a company representative assistant. Share information about the company, team, mission, and values. Help visitors understand what the company does, its history, culture, and how to connect with them. Represent the company professionally.`,
  
  training_manual: `You are a training and education assistant. Guide users through learning materials, procedures, and instructions. Break down complex topics into clear, step-by-step explanations. Be patient and supportive in helping users learn.`,
  
  portfolio: `You are a portfolio showcase assistant. Present work samples, case studies, and achievements professionally. Help visitors understand the quality, scope, and impact of work demonstrated. Highlight key projects and accomplishments effectively.`
};

export function generateSystemPromptFromKnowledgeBase(
  knowledgeBase: ProcessedKnowledgeBase,
  config: {
    businessName: string;
    tone: string;
    language: string;
    calendlyLink?: string;
    description?: string;
    purpose?: string;
    documentType?: string;
    customDocumentType?: string;
  }
): string {
  const navigationMap = knowledgeBase.navigation
    .slice(0, 15)
    .map(nav => `"${nav.text}" → ${nav.href}`)
    .join('\n');

  const pagesList = knowledgeBase.allPages
    .map(page => `${page.title}: ${page.url}`)
    .slice(0, 15)
    .join('\n');

  const emailsList = (knowledgeBase.contactSummary?.emails || []).join(', ') || 'None found';
  const phonesList = (knowledgeBase.contactSummary?.phones || []).join(', ') || 'None found';

  const toneInstructions = {
    friendly: "Use a warm, conversational tone. Be personable and approachable.",
    professional: "Maintain a formal, business-appropriate tone. Be clear and authoritative.",
    casual: "Use relaxed, informal language. Be conversational and easy-going.",
    enthusiastic: "Show excitement and energy in your responses. Be upbeat and positive."
  };

  const languageInstruction = config.language !== 'english' 
    ? `\n\nIMPORTANT: You MUST respond in ${config.language}. All your responses should be in ${config.language}, not English.`
    : '';

  // Get document type-specific instructions (takes priority for document uploads)
  let contextInstruction = '';
  if (config.documentType && config.documentType !== 'other') {
    contextInstruction = documentTypePrompts[config.documentType] || '';
  } else if (config.documentType === 'other' && config.customDocumentType) {
    contextInstruction = `You are an AI assistant specialized in helping users understand and interact with ${config.customDocumentType} documents. Provide accurate, helpful information based solely on the document content.`;
  }

  // Get purpose-specific instructions (fallback if no document type)
  const purposeInstruction = !contextInstruction && config.purpose && purposeTemplates[config.purpose as keyof typeof purposeTemplates]
    ? purposeTemplates[config.purpose as keyof typeof purposeTemplates]
    : (!contextInstruction ? purposeTemplates.general_assistant : '');

  // Combine instructions - document type takes priority
  const primaryInstruction = contextInstruction || purposeInstruction;

  // Document type context for the prompt
  const documentTypeContext = config.documentType 
    ? `\nDOCUMENT TYPE: ${config.documentType === 'other' ? config.customDocumentType : config.documentType}`
    : '';

  return `${primaryInstruction}

You are ${config.businessName}'s AI voice assistant${knowledgeBase.url ? ` (${knowledgeBase.url})` : ''}.

TONE: ${toneInstructions[config.tone as keyof typeof toneInstructions] || toneInstructions.friendly}
LANGUAGE: Always respond in ${config.language}${languageInstruction}
${documentTypeContext}

DOCUMENT/BUSINESS INFORMATION:
- Name: ${config.businessName}
- Description: ${config.description || knowledgeBase.description}
${knowledgeBase.url ? `- Website: ${knowledgeBase.url}` : ''}

CONTACT INFORMATION SUMMARY:
- Emails: ${emailsList}
- Phones: ${phonesList}

${knowledgeBase.navigation.length > 0 ? `NAVIGATION MAP:\n${navigationMap}\n` : ''}
${knowledgeBase.allPages.length > 0 ? `AVAILABLE PAGES:\n${pagesList}\n` : ''}
CRITICAL HONESTY RULE:
- If you don't have specific information from the document, say "I don't have that specific information in the document right now"
- NEVER make up or assume details that aren't in the document
- Be honest about knowledge limitations rather than giving generic responses
- Only answer based on the actual document content provided

CONVERSATION RULES:
1. Answer questions using only the document content provided
${knowledgeBase.navigation.length > 0 ? '2. For navigation requests like "Go to About" or "Take me to Services", use the navigate_to_page tool' : ''}
3. For appointment requests, use the book_appointment tool${config.calendlyLink ? ` with Calendly link: ${config.calendlyLink}` : ''}
4. Keep responses conversational and helpful
5. If asked about something not in the document, politely explain you can only help with information from ${config.businessName}
6. When reading content, summarize naturally and ask if they want more details
7. When asked for email or phone, use the CONTACT INFORMATION SUMMARY above. Do not tell users to "check the document" unless both emails and phone numbers are missing.
8. NEVER use the same greeting twice - vary your responses naturally
9. Remember context from previous messages in the conversation
10. Be contextually aware of what the user just said
11. Respond naturally without repeating standard phrases

PRIVACY-CONSCIOUS BOOKING RULES:
12. Before collecting sensitive information like phone numbers or email addresses, always ask users: "Would you prefer to share your [phone number/email] by speaking it aloud, or would you like to enter it manually for privacy?"
13. Respect user privacy preferences and never pressure users to speak sensitive information aloud
14. For users who choose manual entry, guide them through the booking form: "I'll open our booking form where you can securely enter your information manually"
15. Always acknowledge when users provide sensitive information and confirm it's been received securely

TOOLS AVAILABLE:
${knowledgeBase.navigation.length > 0 ? '- navigate_to_page: Navigate users to specific pages' : ''}
- book_appointment: Help users schedule appointments${config.calendlyLink ? ' via Calendly' : ''}

Always be helpful, accurate, and represent ${config.businessName} professionally.`;
}