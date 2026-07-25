/**
 * Utility functions for exporting analytics data
 */

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const formatOverviewDataForExport = (analytics: any) => {
  if (!analytics) return [];

  const overviewData = [
    { Metric: 'Total Conversations', Value: analytics.overview.totalConversations || 0 },
    { Metric: 'Total Inquiries', Value: analytics.overview.totalInquiries || 0 },
    { Metric: 'Total Bookings', Value: analytics.overview.totalBookings || 0 },
    { Metric: 'Estimated Revenue', Value: `£${analytics.overview.revenue || 0}` },
    { Metric: 'Unique Sessions', Value: analytics.engagement.uniqueSessions || 0 },
    { Metric: 'Average Messages per Session', Value: analytics.engagement.avgMessagesPerSession || 0 },
    { Metric: 'Leads Contacted', Value: analytics.pipeline.contacted || 0 },
    { Metric: 'Leads Qualified', Value: analytics.pipeline.qualified || 0 },
    { Metric: 'Inquiries Converted', Value: analytics.pipeline.converted || 0 },
    { Metric: 'Booking Conversion Rate', Value: `${analytics.bookings.conversionRate.toFixed(1)}%` },
    { Metric: 'Bookings Confirmed', Value: analytics.bookings.confirmed || 0 },
    { Metric: 'Bookings Pending', Value: analytics.bookings.pending || 0 },
    { Metric: 'Bookings Completed', Value: analytics.bookings.completed || 0 },
  ];

  return overviewData;
};

export const formatBookingsDataForExport = (bookings: any[]) => {
  if (!bookings || bookings.length === 0) return [];

  return bookings.map(booking => ({
    'Booking ID': booking.id,
    'Client Name': booking.user_name || 'N/A',
    'Client Email': booking.user_email,
    'Phone': booking.user_phone || 'N/A',
    'Service Type': booking.service_type || 'N/A',
    'Preferred Date': booking.preferred_date,
    'Preferred Time': booking.preferred_time || 'N/A',
    'Status': booking.status,
    'Booking Method': booking.booking_method || 'manual_timeslots',
    'Video Platform': booking.video_platform_used || 'N/A',
    'Meeting URL': booking.video_meeting_url || 'N/A',
    'Created At': new Date(booking.created_at).toLocaleString(),
  }));
};

export const formatVoiceFormSubmissionsForExport = (submissions: any[]) => {
  if (!submissions || submissions.length === 0) return [];

  return submissions.map(submission => ({
    'Submission ID': submission.id,
    'Form Name': submission.voice_forms?.form_name || 'N/A',
    'User Name': submission.user_name || 'N/A',
    'User Email': submission.user_email || 'N/A',
    'Completion Time (seconds)': submission.completion_time || 'N/A',
    'Submitted At': new Date(submission.submitted_at).toLocaleString(),
  }));
};
