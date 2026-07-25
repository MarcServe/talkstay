# Inquiry Follow-up Cron Job Setup

To enable automated follow-up emails, you need to set up a daily cron job in Supabase.

## Setup Instructions

1. Go to your Supabase SQL Editor: https://supabase.com/dashboard/project/oujqkygfmyapmrgxmhvt/sql/new

2. Run the following SQL to create the cron job:

```sql
-- Schedule the follow-up checker to run daily at 9 AM UTC
SELECT cron.schedule(
  'inquiry-follow-up-daily',
  '0 9 * * *', -- Every day at 9 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/inquiry-follow-up-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91anFreWdmbXlhcG1yZ3htaHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzE4NjEsImV4cCI6MjA2Nzc0Nzg2MX0.QIbZhxQTXqPQhNhlLqBVGYtgsq4gpjgE5ZCa3VY7pKg"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
```

## Verify the Cron Job

After creating the cron job, verify it's scheduled:

```sql
SELECT * FROM cron.job;
```

You should see a job named `inquiry-follow-up-daily` with the cron schedule `0 9 * * *`.

## Monitor Cron Job Execution

To check the execution history:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'inquiry-follow-up-daily')
ORDER BY start_time DESC 
LIMIT 10;
```

## Test the Function Manually

You can test the follow-up scheduler manually at any time:

```bash
curl -X POST 'https://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/inquiry-follow-up-scheduler' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91anFreWdmbXlhcG1yZ3htaHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzE4NjEsImV4cCI6MjA2Nzc0Nzg2MX0.QIbZhxQTXqPQhNhlLqBVGYtgsq4gpjgE5ZCa3VY7pKg' \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'
```

## Unschedule the Cron Job (if needed)

To remove the cron job:

```sql
SELECT cron.unschedule('inquiry-follow-up-daily');
```

## Adjust Schedule (if needed)

To change the schedule, unschedule the existing job and create a new one with your desired cron expression.

Common cron expressions:
- `0 9 * * *` - Daily at 9 AM UTC
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 1` - Every Monday at midnight
- `0 8,17 * * *` - Daily at 8 AM and 5 PM UTC

## Notes

- The follow-up scheduler runs automatically once set up
- Check the function logs for execution details
- Follow-up emails are only sent if enabled in the assistant settings
- No duplicate reminders will be sent for the same inquiry/status combination
