interface InquiryExportData {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  project_type: string | null;
  project_description: string;
  business_goals: string | null;
  current_solution: string | null;
  budget_range: string | null;
  timeline: string | null;
  status: string;
  matched_services: any[];
  meeting_booked: boolean;
  created_at: string;
  updated_at: string;
}

export const exportInquiriesToCSV = (inquiries: InquiryExportData[], filename: string = 'inquiries') => {
  if (!inquiries || inquiries.length === 0) {
    throw new Error('No data to export');
  }

  // Define CSV headers
  const headers = [
    'Inquiry ID',
    'Client Name',
    'Email',
    'Phone',
    'Project Type',
    'Description',
    'Business Goals',
    'Current Solution',
    'Budget Range',
    'Timeline',
    'Status',
    'Matched Services',
    'Services Count',
    'Total Value',
    'Currency',
    'Meeting Booked',
    'Created Date',
    'Last Updated',
    'Days Since Created',
  ];

  // Convert inquiries to CSV rows
  const rows = inquiries.map(inquiry => {
    const servicesCount = inquiry.matched_services?.length || 0;
    const totalValue = inquiry.matched_services?.reduce(
      (sum: number, service: any) => sum + (service.base_price || 0),
      0
    ) || 0;
    const currency = inquiry.matched_services?.[0]?.price_currency || 'GBP';
    const serviceNames = inquiry.matched_services?.map((s: any) => s.service_name).join('; ') || 'None';
    
    const createdDate = new Date(inquiry.created_at);
    const daysSinceCreated = Math.floor(
      (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return [
      inquiry.id,
      escapeCSV(inquiry.user_name),
      inquiry.user_email,
      inquiry.user_phone || '',
      inquiry.project_type || '',
      escapeCSV(inquiry.project_description),
      escapeCSV(inquiry.business_goals || ''),
      escapeCSV(inquiry.current_solution || ''),
      inquiry.budget_range || '',
      inquiry.timeline || '',
      inquiry.status,
      escapeCSV(serviceNames),
      servicesCount,
      totalValue.toFixed(2),
      currency,
      inquiry.meeting_booked ? 'Yes' : 'No',
      formatDate(inquiry.created_at),
      formatDate(inquiry.updated_at),
      daysSinceCreated,
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${formatDateForFilename(new Date())}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportInquirySummary = (inquiries: InquiryExportData[], filename: string = 'inquiry_summary') => {
  if (!inquiries || inquiries.length === 0) {
    throw new Error('No data to export');
  }

  // Calculate summary statistics
  const total = inquiries.length;
  const byStatus = inquiries.reduce((acc, inquiry) => {
    acc[inquiry.status] = (acc[inquiry.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalValue = inquiries.reduce((sum, inquiry) => {
    return sum + (inquiry.matched_services?.reduce(
      (serviceSum: number, service: any) => serviceSum + (service.base_price || 0),
      0
    ) || 0);
  }, 0);

  const wonInquiries = inquiries.filter(i => i.status === 'won');
  const wonValue = wonInquiries.reduce((sum, inquiry) => {
    return sum + (inquiry.matched_services?.reduce(
      (serviceSum: number, service: any) => serviceSum + (service.base_price || 0),
      0
    ) || 0);
  }, 0);

  const currency = inquiries.find(i => i.matched_services?.[0]?.price_currency)
    ?.matched_services?.[0]?.price_currency || 'GBP';

  const conversionRate = total > 0 ? ((wonInquiries.length / total) * 100).toFixed(1) : '0';

  // Create summary CSV
  const summaryRows = [
    ['Inquiry Summary Report'],
    ['Generated', formatDate(new Date().toISOString())],
    [''],
    ['Overview'],
    ['Total Inquiries', total.toString()],
    ['Total Potential Value', `${currency} ${totalValue.toLocaleString()}`],
    ['Won Inquiries', wonInquiries.length.toString()],
    ['Won Value', `${currency} ${wonValue.toLocaleString()}`],
    ['Conversion Rate', `${conversionRate}%`],
    [''],
    ['Status Breakdown'],
    ['Status', 'Count', 'Percentage'],
    ...Object.entries(byStatus).map(([status, count]) => [
      status,
      count.toString(),
      `${((count / total) * 100).toFixed(1)}%`
    ]),
  ];

  const csvContent = summaryRows.map(row => row.join(',')).join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${formatDateForFilename(new Date())}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper functions
const escapeCSV = (str: string | null | undefined): string => {
  if (!str) return '';
  
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0] + ' ' + 
           date.toTimeString().split(' ')[0];
  } catch {
    return dateString;
  }
};

const formatDateForFilename = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}`;
};
