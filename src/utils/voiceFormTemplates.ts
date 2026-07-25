import { VoiceForm, VoiceFormTemplate } from '@/types/voiceForm';

/**
 * Pre-built voice form templates
 * Best practice: Keep forms under 10 fields for optimal voice completion rates
 */

export const contactFormTemplate: VoiceFormTemplate = {
  id: 'contact-form',
  name: 'Contact Form',
  description: 'Simple contact information collection',
  category: 'contact',
  icon: 'MessageSquare',
  fields: [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      voicePrompts: {
        initial: "What's your name?",
        confirmation: "Got it, {value}. Is that correct?",
        retry: "Sorry, I didn't catch that. Could you repeat your name?",
        help: "Please say your full name clearly."
      },
      privacyLevel: 'public',
      placeholder: 'John Doe'
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      voicePrompts: {
        initial: "What's your email address?",
        confirmation: "I heard {value}. Is that right?",
        retry: "I didn't get that. Could you spell out your email?",
        help: "Please say your email slowly, like: john at example dot com"
      },
      privacyLevel: 'sensitive',
      placeholder: 'john@example.com',
      validation: {
        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
      }
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'phone',
      required: false,
      voicePrompts: {
        initial: "What's your phone number? (Optional)",
        confirmation: "I got {value}. Is that correct?",
        retry: "Could you repeat your phone number?",
        help: "Please say your phone number with area code."
      },
      privacyLevel: 'sensitive',
      placeholder: '+1234567890'
    },
    {
      name: 'company',
      label: 'Company Name',
      type: 'text',
      required: false,
      voicePrompts: {
        initial: "What company are you with? (Optional)",
        confirmation: "{value}, correct?",
        retry: "What's your company name?",
        help: "Say your company name or say 'none' if not applicable."
      },
      privacyLevel: 'public'
    },
    {
      name: 'subject',
      label: 'Subject',
      type: 'text',
      required: true,
      voicePrompts: {
        initial: "What is your inquiry about?",
        confirmation: "Subject: {value}",
        retry: "What would you like to discuss?",
        help: "Tell us the main topic of your message."
      },
      privacyLevel: 'public'
    },
    {
      name: 'inquiry_type',
      label: 'Inquiry Type',
      type: 'select',
      required: true,
      voicePrompts: {
        initial: "Is this a question, feedback, partnership inquiry, or something else?",
        confirmation: "{value} inquiry.",
        retry: "What type of inquiry is this?",
        help: "Choose: question, feedback, partnership, sales, or other."
      },
      privacyLevel: 'public',
      validation: {
        options: ['General Question', 'Feedback', 'Partnership', 'Sales Inquiry', 'Technical Support', 'Other']
      }
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: true,
      voicePrompts: {
        initial: "What would you like to tell us?",
        confirmation: "Your message: {value}. Is that everything?",
        retry: "Sorry, could you repeat your message?",
        help: "Please share your message or question."
      },
      privacyLevel: 'public',
      placeholder: 'Your message here...',
      validation: {
        min: 10,
        max: 500
      }
    }
  ],
  defaultSettings: {
    conversationStyle: 'friendly',
    confirmEachField: false,
    allowCorrections: true,
    maxRetries: 3,
    language: 'en-US',
    enableVoiceInput: true,
    enableManualFallback: true,
    showProgress: true
  },
  defaultActions: {
    onComplete: 'email',
    successMessage: 'Thank you! We\'ll get back to you soon.',
    emailRecipients: []
  }
};

export const eventRegistrationTemplate: VoiceFormTemplate = {
  id: 'event-registration',
  name: 'Event Registration',
  description: 'Collect attendee information for events',
  category: 'registration',
  icon: 'Calendar',
  fields: [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      voicePrompts: {
        initial: "What's your full name?",
        confirmation: "Got it, {value}.",
        retry: "Could you repeat your name?",
        help: "Please say your first and last name."
      },
      privacyLevel: 'public'
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      voicePrompts: {
        initial: "What's your email address?",
        confirmation: "I have {value}.",
        retry: "Could you spell out your email?",
        help: "Say your email slowly, like john at example dot com."
      },
      privacyLevel: 'sensitive'
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'phone',
      required: false,
      voicePrompts: {
        initial: "What's your phone number? (Optional)",
        confirmation: "{value}, got it.",
        retry: "Could you repeat your phone?",
        help: "Say your phone number with area code."
      },
      privacyLevel: 'sensitive'
    },
    {
      name: 'company',
      label: 'Company/Organization',
      type: 'text',
      required: false,
      voicePrompts: {
        initial: "What company or organization are you with? (Optional)",
        confirmation: "{value}, noted.",
        retry: "What organization are you from?",
        help: "Say your company name or say 'none'."
      },
      privacyLevel: 'public'
    },
    {
      name: 'event_name',
      label: 'Event Name',
      type: 'text',
      required: true,
      voicePrompts: {
        initial: "Which event are you registering for?",
        confirmation: "Registering for {value}.",
        retry: "What's the event name?",
        help: "Tell us which event you want to attend."
      },
      privacyLevel: 'public'
    },
    {
      name: 'event_date',
      label: 'Event Date',
      type: 'date',
      required: true,
      voicePrompts: {
        initial: "What's the date of the event?",
        confirmation: "{value}, correct?",
        retry: "Which date?",
        help: "Say the date like: January 15th 2024."
      },
      privacyLevel: 'public'
    },
    {
      name: 'attendance_type',
      label: 'Attendance Type',
      type: 'select',
      required: true,
      voicePrompts: {
        initial: "Will you attend in person or virtually?",
        confirmation: "{value} attendance.",
        retry: "In person or virtual?",
        help: "Choose in-person or virtual attendance."
      },
      privacyLevel: 'public',
      validation: {
        options: ['In-Person', 'Virtual', 'Undecided']
      }
    },
    {
      name: 'attendee_count',
      label: 'Number of Attendees',
      type: 'number',
      required: true,
      voicePrompts: {
        initial: "How many people will be attending?",
        confirmation: "{value} attendees, correct?",
        retry: "How many people total?",
        help: "Just say the number of attendees."
      },
      privacyLevel: 'public',
      validation: {
        min: 1,
        max: 10
      }
    }
  ],
  defaultSettings: {
    conversationStyle: 'friendly',
    confirmEachField: false,
    allowCorrections: true,
    maxRetries: 3,
    language: 'en-US',
    enableVoiceInput: true,
    enableManualFallback: true,
    showProgress: true
  },
  defaultActions: {
    onComplete: 'email',
    successMessage: 'Registration complete! See you at the event.',
    emailRecipients: []
  }
};

export const feedbackSurveyTemplate: VoiceFormTemplate = {
  id: 'feedback-survey',
  name: 'Feedback Survey',
  description: 'Collect user feedback and ratings',
  category: 'survey',
  icon: 'Star',
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      voicePrompts: {
        initial: "What's your name?",
        confirmation: "Thanks, {value}.",
        retry: "Could you repeat your name?",
        help: "Please say your name."
      },
      privacyLevel: 'public'
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      voicePrompts: {
        initial: "What's your email address?",
        confirmation: "Got {value}.",
        retry: "Could you spell your email?",
        help: "Say your email slowly."
      },
      privacyLevel: 'sensitive'
    },
    {
      name: 'product_or_service',
      label: 'Product or Service',
      type: 'text',
      required: true,
      voicePrompts: {
        initial: "What product or service is this feedback about?",
        confirmation: "Feedback about {value}.",
        retry: "Which product or service?",
        help: "Tell us what you used."
      },
      privacyLevel: 'public'
    },
    {
      name: 'rating',
      label: 'Overall Rating',
      type: 'number',
      required: true,
      voicePrompts: {
        initial: "On a scale of 1 to 5, how would you rate your experience?",
        confirmation: "You gave us {value} stars.",
        retry: "What rating would you give? Say a number from 1 to 5.",
        help: "Say a number from 1 (poor) to 5 (excellent)."
      },
      privacyLevel: 'public',
      validation: {
        min: 1,
        max: 5
      }
    },
    {
      name: 'positive_aspects',
      label: 'What Did You Like?',
      type: 'textarea',
      required: false,
      voicePrompts: {
        initial: "What did you like most? (Optional)",
        confirmation: "You liked: {value}",
        retry: "What stood out positively?",
        help: "Tell us what you enjoyed."
      },
      privacyLevel: 'public'
    },
    {
      name: 'improvements',
      label: 'What Could Be Improved?',
      type: 'textarea',
      required: false,
      voicePrompts: {
        initial: "What could we improve? (Optional)",
        confirmation: "Suggestions: {value}",
        retry: "Any suggestions for improvement?",
        help: "Tell us what we could do better."
      },
      privacyLevel: 'public'
    },
    {
      name: 'feedback',
      label: 'Additional Feedback',
      type: 'textarea',
      required: true,
      voicePrompts: {
        initial: "Any other feedback or comments?",
        confirmation: "Your feedback: {value}",
        retry: "Could you share your thoughts?",
        help: "Share any additional feedback."
      },
      privacyLevel: 'public',
      validation: {
        min: 10
      }
    },
    {
      name: 'would_recommend',
      label: 'Would Recommend',
      type: 'select',
      required: true,
      voicePrompts: {
        initial: "Would you recommend us to others? Say yes or no.",
        confirmation: "You said {value}.",
        retry: "Would you recommend us? Yes or no?",
        help: "Just say yes or no."
      },
      privacyLevel: 'public',
      validation: {
        options: ['Yes', 'No', 'Maybe']
      }
    }
  ],
  defaultSettings: {
    conversationStyle: 'casual',
    confirmEachField: false,
    allowCorrections: true,
    maxRetries: 3,
    language: 'en-US',
    enableVoiceInput: true,
    enableManualFallback: true,
    showProgress: true
  },
  defaultActions: {
    onComplete: 'database',
    successMessage: 'Thank you for your feedback!',
    emailRecipients: []
  }
};

/**
 * Create a VoiceForm from a template
 */
export function createFormFromTemplate(
  template: VoiceFormTemplate,
  assistantId: string,
  customizations?: Partial<VoiceForm>
): VoiceForm {
  const formId = crypto.randomUUID();
  
  return {
    id: formId,
    assistantId,
    name: customizations?.name || template.name,
    description: customizations?.description || template.description,
    fields: template.fields.map((field, index) => ({
      ...field,
      id: `${formId}-field-${index}`
    })),
    settings: customizations?.settings || template.defaultSettings,
    actions: customizations?.actions || template.defaultActions,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export const bookingFormTemplate: VoiceFormTemplate = {
  id: 'booking-form',
  name: 'Appointment Booking',
  description: 'Schedule appointments with voice',
  category: 'booking',
  icon: 'CalendarCheck',
  fields: [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      voicePrompts: {
        initial: "What's your name for the booking?",
        confirmation: "Booking for {value}.",
        retry: "Could you repeat your name?",
        help: "Please say your full name."
      },
      privacyLevel: 'public'
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      voicePrompts: {
        initial: "What's your email address?",
        confirmation: "I have {value}.",
        retry: "Could you spell your email?",
        help: "Say your email like: john at example dot com."
      },
      privacyLevel: 'sensitive'
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'phone',
      required: true,
      voicePrompts: {
        initial: "What's your phone number?",
        confirmation: "Got {value}.",
        retry: "What's your contact number?",
        help: "Say your phone number with area code."
      },
      privacyLevel: 'sensitive'
    },
    {
      name: 'service_type',
      label: 'Service Type',
      type: 'select',
      required: true,
      voicePrompts: {
        initial: "What service are you booking?",
        confirmation: "Booking {value}.",
        retry: "Which service would you like?",
        help: "Choose from: consultation, installation, or repair."
      },
      privacyLevel: 'public',
      validation: {
        options: ['Consultation', 'Installation', 'Repair', 'Maintenance', 'Follow-up', 'Other']
      }
    },
    {
      name: 'preferred_date',
      label: 'Preferred Date',
      type: 'date',
      required: true,
      voicePrompts: {
        initial: "What date would you like to book? You can say something like next Tuesday or March 10th.",
        confirmation: "{value}, correct?",
        retry: "Which date works for you? You can say tomorrow, next Monday, or a specific date.",
        help: "Say the date like: next Tuesday, March 10th, or tomorrow."
      },
      privacyLevel: 'public'
    },
    {
      name: 'preferred_time',
      label: 'Preferred Time',
      type: 'time',
      required: true,
      voicePrompts: {
        initial: "What time works best for you? You can say 2 PM, half past 3, or 2 o'clock.",
        confirmation: "{value}.",
        retry: "What time? You can say something like 3 o'clock or half past 2.",
        help: "Say the time like: 2 PM, 3 o'clock, or half past 3."
      },
      privacyLevel: 'public'
    },
    {
      name: 'reason',
      label: 'Reason for Appointment',
      type: 'textarea',
      required: true,
      voicePrompts: {
        initial: "What's the main reason for this appointment?",
        confirmation: "Reason: {value}",
        retry: "Why are you booking?",
        help: "Tell us briefly what you need help with."
      },
      privacyLevel: 'public',
      validation: {
        min: 10
      }
    },
    {
      name: 'special_requirements',
      label: 'Special Requirements',
      type: 'textarea',
      required: false,
      voicePrompts: {
        initial: "Any special requirements or preparation needed? (Optional)",
        confirmation: "Requirements: {value}",
        retry: "Special needs?",
        help: "Tell us if you need anything specific."
      },
      privacyLevel: 'public'
    }
  ],
  defaultSettings: {
    conversationStyle: 'friendly',
    confirmEachField: true,
    allowCorrections: true,
    maxRetries: 3,
    language: 'en-US',
    enableVoiceInput: true,
    enableManualFallback: true,
    showProgress: true
  },
  defaultActions: {
    onComplete: 'booking',
    successMessage: 'Your appointment has been requested! We\'ll confirm shortly.',
    emailRecipients: []
  }
};

export const supportTicketTemplate: VoiceFormTemplate = {
  id: 'support-ticket',
  name: 'Support Ticket',
  description: 'Report issues and get help',
  category: 'contact',
  icon: 'HelpCircle',
  fields: [
    {
      name: 'name',
      label: 'Your Name',
      type: 'text',
      required: true,
      voicePrompts: {
        initial: "What's your name?",
        confirmation: "Thanks, {value}.",
        retry: "Could you repeat your name?",
        help: "Please say your name."
      },
      privacyLevel: 'public'
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      voicePrompts: {
        initial: "What email should we use to follow up?",
        confirmation: "We'll contact you at {value}.",
        retry: "What's your email address?",
        help: "Spell out your email slowly."
      },
      privacyLevel: 'sensitive'
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'phone',
      required: false,
      voicePrompts: {
        initial: "Phone number? (Optional)",
        confirmation: "{value}.",
        retry: "What's your phone?",
        help: "Say your phone number or 'skip'."
      },
      privacyLevel: 'sensitive'
    },
    {
      name: 'product_name',
      label: 'Product/Service Name',
      type: 'text',
      required: true,
      voicePrompts: {
        initial: "Which product or service is this about?",
        confirmation: "{value}.",
        retry: "What product?",
        help: "Tell us which product or service."
      },
      privacyLevel: 'public'
    },
    {
      name: 'issue_category',
      label: 'Issue Category',
      type: 'select',
      required: true,
      voicePrompts: {
        initial: "What category best describes your issue?",
        confirmation: "{value} issue.",
        retry: "Which category?",
        help: "Choose: technical, billing, account, feature, or other."
      },
      privacyLevel: 'public',
      validation: {
        options: ['Technical Problem', 'Billing Question', 'Account Issue', 'Feature Request', 'Bug Report', 'Other']
      }
    },
    {
      name: 'priority',
      label: 'Priority Level',
      type: 'select',
      required: true,
      voicePrompts: {
        initial: "How urgent is this? Say low, medium, high, or critical.",
        confirmation: "{value} priority.",
        retry: "Is this low, medium, high, or critical?",
        help: "Choose: low for minor, medium for normal, high for urgent, critical for blocking issues."
      },
      privacyLevel: 'public',
      validation: {
        options: ['Low', 'Medium', 'High', 'Critical']
      }
    },
    {
      name: 'issue_description',
      label: 'Issue Description',
      type: 'textarea',
      required: true,
      voicePrompts: {
        initial: "Please describe the issue in detail.",
        confirmation: "Got it: {value}",
        retry: "Could you explain the problem?",
        help: "Tell us what's wrong and what you were trying to do."
      },
      privacyLevel: 'public',
      validation: {
        min: 20
      }
    },
    {
      name: 'impact',
      label: 'Business Impact',
      type: 'select',
      required: false,
      voicePrompts: {
        initial: "How is this impacting your work? (Optional)",
        confirmation: "{value} impact.",
        retry: "What's the impact?",
        help: "Choose: no impact, minor, moderate, or severe."
      },
      privacyLevel: 'public',
      validation: {
        options: ['No Impact', 'Minor Impact', 'Moderate Impact', 'Severe Impact - Work Blocked']
      }
    }
  ],
  defaultSettings: {
    conversationStyle: 'formal',
    confirmEachField: false,
    allowCorrections: true,
    maxRetries: 3,
    language: 'en-US',
    enableVoiceInput: true,
    enableManualFallback: true,
    showProgress: true
  },
  defaultActions: {
    onComplete: 'email',
    successMessage: 'Your support ticket has been created. We\'ll respond soon.',
    emailRecipients: []
  }
};

export const leadCaptureTemplate: VoiceFormTemplate = {
  id: 'lead-capture',
  name: 'Lead Capture',
  description: 'Quick lead generation form',
  category: 'contact',
  icon: 'UserPlus',
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      voicePrompts: {
        initial: "What's your name?",
        confirmation: "Nice to meet you, {value}!",
        retry: "Could you say your name again?",
        help: "Just your first and last name."
      },
      privacyLevel: 'public'
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      voicePrompts: {
        initial: "What's the best email to reach you?",
        confirmation: "Perfect, {value}.",
        retry: "What's your email?",
        help: "Spell it out: john at company dot com."
      },
      privacyLevel: 'sensitive'
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'phone',
      required: false,
      voicePrompts: {
        initial: "Phone number? (Optional)",
        confirmation: "{value}.",
        retry: "What's your phone?",
        help: "Say your phone with area code or say 'skip'."
      },
      privacyLevel: 'sensitive'
    },
    {
      name: 'company',
      label: 'Company',
      type: 'text',
      required: false,
      voicePrompts: {
        initial: "What company do you work for? (Optional)",
        confirmation: "{value}, got it.",
        retry: "Which company?",
        help: "Say your company name or 'skip' if not applicable."
      },
      privacyLevel: 'public'
    },
    {
      name: 'job_title',
      label: 'Job Title',
      type: 'text',
      required: false,
      voicePrompts: {
        initial: "What's your role or job title? (Optional)",
        confirmation: "{value}.",
        retry: "What's your position?",
        help: "Tell us your job title or say 'skip'."
      },
      privacyLevel: 'public'
    },
    {
      name: 'lead_source',
      label: 'How Did You Hear About Us?',
      type: 'select',
      required: false,
      voicePrompts: {
        initial: "How did you hear about us? (Optional)",
        confirmation: "Found us through {value}.",
        retry: "Where did you hear about us?",
        help: "Choose: google, social media, referral, advertisement, or other."
      },
      privacyLevel: 'public',
      validation: {
        options: ['Google Search', 'Social Media', 'Referral', 'Advertisement', 'Event', 'Other']
      }
    },
    {
      name: 'interest',
      label: 'What interests you?',
      type: 'textarea',
      required: true,
      voicePrompts: {
        initial: "What are you interested in learning more about?",
        confirmation: "Interested in: {value}",
        retry: "What would you like to know more about?",
        help: "Tell us what brought you here today."
      },
      privacyLevel: 'public'
    },
    {
      name: 'timeline',
      label: 'Purchase Timeline',
      type: 'select',
      required: false,
      voicePrompts: {
        initial: "When are you looking to make a decision? (Optional)",
        confirmation: "{value} timeline.",
        retry: "What's your timeline?",
        help: "Choose: immediately, within 1 month, 1-3 months, 3-6 months, or just researching."
      },
      privacyLevel: 'public',
      validation: {
        options: ['Immediately', 'Within 1 Month', '1-3 Months', '3-6 Months', 'Just Researching']
      }
    }
  ],
  defaultSettings: {
    conversationStyle: 'friendly',
    confirmEachField: false,
    allowCorrections: true,
    maxRetries: 3,
    language: 'en-US',
    enableVoiceInput: true,
    enableManualFallback: true,
    showProgress: false
  },
  defaultActions: {
    onComplete: 'email',
    successMessage: 'Thanks! Someone from our team will be in touch soon.',
    emailRecipients: []
  }
};

export const projectRequirementTemplate: VoiceFormTemplate = {
  id: 'project-requirement',
  name: 'Project Requirement Gathering',
  description: 'Comprehensive project discovery form',
  category: 'application',
  icon: 'FileText',
  fields: [
    {
      name: 'name',
      label: 'Your Name',
      type: 'text',
      required: true,
      voicePrompts: {
        initial: "Let's start with your name. What should I call you?",
        confirmation: "Great to meet you, {value}!",
        retry: "Could you repeat your name please?",
        help: "Please say your full name."
      },
      privacyLevel: 'public'
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      voicePrompts: {
        initial: "What's the best email address to reach you?",
        confirmation: "I'll send all project updates to {value}.",
        retry: "Could you spell out your email address?",
        help: "Say your email slowly, like: john at company dot com."
      },
      privacyLevel: 'sensitive',
      validation: {
        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
      }
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'phone',
      required: true,
      voicePrompts: {
        initial: "What's your phone number in case we need to call you?",
        confirmation: "Got it, {value}.",
        retry: "Could you repeat your phone number?",
        help: "Please say your phone number with area code."
      },
      privacyLevel: 'sensitive'
    },
    {
      name: 'company',
      label: 'Company Name',
      type: 'text',
      required: true,
      voicePrompts: {
        initial: "What company or organization are you with?",
        confirmation: "{value}, perfect.",
        retry: "What's your company name?",
        help: "Say your company or organization name."
      },
      privacyLevel: 'public'
    },
    {
      name: 'project_type',
      label: 'Project Type',
      type: 'select',
      required: true,
      voicePrompts: {
        initial: "What type of project are you planning? Website, mobile app, software, or something else?",
        confirmation: "You're looking for a {value} project.",
        retry: "What kind of project is this?",
        help: "Choose from: website, mobile app, web application, software, or other."
      },
      privacyLevel: 'public',
      validation: {
        options: ['Website', 'Mobile App', 'Web Application', 'Custom Software', 'E-commerce', 'Other']
      }
    },
    {
      name: 'project_description',
      label: 'Project Description',
      type: 'textarea',
      required: true,
      voicePrompts: {
        initial: "Tell me about your project. What are you trying to build?",
        confirmation: "Your project: {value}. Is that a good summary?",
        retry: "Could you describe your project?",
        help: "Give me an overview of what you want to create and why."
      },
      privacyLevel: 'public',
      validation: {
        min: 50,
        max: 1000
      }
    },
    {
      name: 'budget_range',
      label: 'Budget Range',
      type: 'select',
      required: true,
      voicePrompts: {
        initial: "What's your budget range for this project?",
        confirmation: "{value} budget range.",
        retry: "What budget are you working with?",
        help: "Choose: under 10k, 10k to 25k, 25k to 50k, 50k to 100k, or over 100k."
      },
      privacyLevel: 'sensitive',
      validation: {
        options: ['Under $10,000', '$10,000 - $25,000', '$25,000 - $50,000', '$50,000 - $100,000', 'Over $100,000', 'Not Sure Yet']
      }
    },
    {
      name: 'timeline',
      label: 'Desired Timeline',
      type: 'select',
      required: true,
      voicePrompts: {
        initial: "When do you need this project completed?",
        confirmation: "Timeline: {value}",
        retry: "What's your deadline?",
        help: "Choose: ASAP, 1-3 months, 3-6 months, 6-12 months, or flexible."
      },
      privacyLevel: 'public',
      validation: {
        options: ['ASAP (Under 1 month)', '1-3 months', '3-6 months', '6-12 months', 'Over 1 year', 'Flexible']
      }
    },
    {
      name: 'additional_notes',
      label: 'Additional Information',
      type: 'textarea',
      required: false,
      voicePrompts: {
        initial: "Any other details or questions you'd like to share?",
        confirmation: "Additional notes: {value}",
        retry: "Anything else we should know?",
        help: "Share any other important information or ask questions."
      },
      privacyLevel: 'public'
    }
  ],
  defaultSettings: {
    conversationStyle: 'friendly',
    confirmEachField: false,
    allowCorrections: true,
    maxRetries: 3,
    language: 'en-US',
    enableVoiceInput: true,
    enableManualFallback: true,
    showProgress: true
  },
  defaultActions: {
    onComplete: 'email',
    successMessage: 'Thank you for sharing your project requirements! Our team will review everything and get back to you within 24 hours with next steps.',
    emailRecipients: []
  }
};

/**
 * Export all templates (excluding test templates)
 */
export const voiceFormTemplates = {
  contact: contactFormTemplate,
  eventRegistration: eventRegistrationTemplate,
  feedbackSurvey: feedbackSurveyTemplate,
  booking: bookingFormTemplate,
  support: supportTicketTemplate,
  leadCapture: leadCaptureTemplate,
  projectRequirement: projectRequirementTemplate
};

/**
 * Get all templates as an array
 */
export function getAllTemplates(): VoiceFormTemplate[] {
  return Object.values(voiceFormTemplates);
}
