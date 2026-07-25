import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Code, BookOpen, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const supabaseUrl = "https://oujqkygfmyapmrgxmhvt.supabase.co";

export const DeveloperDocumentation = () => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20 border-2 border-accent/50 rounded-lg p-8">
        <div className="flex items-center gap-4 mb-4">
          <Code className="w-12 h-12 text-accent" />
          <div>
            <h1 className="text-4xl font-bold">TalkWeb for Developers</h1>
            <p className="text-xl text-muted-foreground mt-2">
              Integrate TalkWeb's AI assistant capabilities into your applications
            </p>
          </div>
        </div>
        <div className="flex gap-4 mt-6">
          <Link to="/dashboard?tab=api">
            <Button size="lg" className="gap-2">
              <Key className="w-5 h-5" />
              Manage API Keys
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline" className="gap-2">
              Get Started
            </Button>
          </Link>
        </div>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Getting Started
          </CardTitle>
          <CardDescription>
            Use your API key to integrate TalkWeb's AI assistant capabilities into your applications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2">Authentication</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Include your API key in the Authorization header of all requests:
            </p>
            <div className="bg-muted p-3 rounded font-mono text-sm relative group">
              <code>Authorization: Bearer tw_live_your_api_key_here</code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyToClipboard('Authorization: Bearer tw_live_your_api_key_here', 'Authorization header')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Base URL</h4>
            <div className="bg-muted p-3 rounded font-mono text-sm relative group">
              <code>{supabaseUrl}/functions/v1/api-gateway</code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyToClipboard(`${supabaseUrl}/functions/v1/api-gateway`, 'Base URL')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Available Endpoints</h4>
            <div className="space-y-3">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">POST</Badge>
                  <code className="text-sm">/api/v1/chat</code>
                </div>
                <p className="text-sm text-muted-foreground">Send chat message</p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">GET</Badge>
                  <code className="text-sm">/api/v1/assistants</code>
                </div>
                <p className="text-sm text-muted-foreground">List assistants</p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">GET</Badge>
                  <code className="text-sm">/api/v1/assistants/{"{id}"}</code>
                </div>
                <p className="text-sm text-muted-foreground">Get assistant details</p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">POST</Badge>
                  <code className="text-sm">/api/v1/scrape</code>
                </div>
                <p className="text-sm text-muted-foreground">Scrape website content</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Rate Limits</h4>
            <div className="text-sm space-y-2 bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span><strong>Live keys:</strong></span>
                <span>1,000 requests per month</span>
              </div>
              <div className="flex justify-between items-center">
                <span><strong>Test keys:</strong></span>
                <span>100 requests per month</span>
              </div>
              <p className="text-muted-foreground pt-2 border-t">
                Rate limits are enforced per API key. Contact support for higher limits.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Request */}
      <Card>
        <CardHeader>
          <CardTitle>Example Request</CardTitle>
          <CardDescription>
            Here's how to send a chat message to your assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Request</h4>
              <div className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto relative group">
                <pre>{`curl -X POST \\
  ${supabaseUrl}/functions/v1/api-gateway/api/v1/chat \\
  -H "Authorization: Bearer tw_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "assistant_id": "your-assistant-id",
    "message": "Hello, I need help with my order",
    "session_id": "unique-session-id"
  }'`}</pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyToClipboard(`curl -X POST \\
  ${supabaseUrl}/functions/v1/api-gateway/api/v1/chat \\
  -H "Authorization: Bearer tw_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "assistant_id": "your-assistant-id",
    "message": "Hello, I need help with my order",
    "session_id": "unique-session-id"
  }'`, 'Example request')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Response</h4>
              <div className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto relative group">
                <pre>{`{
  "success": true,
  "data": {
    "response": "Hello! I'd be happy to help...",
    "session_id": "unique-session-id",
    "assistant_id": "your-assistant-id"
  },
  "metadata": {
    "request_id": "req_123456",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}`}</pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyToClipboard(`{
  "success": true,
  "data": {
    "response": "Hello! I'd be happy to help...",
    "session_id": "unique-session-id",
    "assistant_id": "your-assistant-id"
  },
  "metadata": {
    "request_id": "req_123456",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}`, 'Example response')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Handling */}
      <Card>
        <CardHeader>
          <CardTitle>Error Handling</CardTitle>
          <CardDescription>
            Understanding API error responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-destructive pl-4">
              <h4 className="font-semibold mb-2">Common Error Codes</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <Badge variant="destructive" className="mr-2">401</Badge>
                  <span>Invalid or missing API key</span>
                </div>
                <div>
                  <Badge variant="destructive" className="mr-2">429</Badge>
                  <span>Rate limit exceeded</span>
                </div>
                <div>
                  <Badge variant="destructive" className="mr-2">400</Badge>
                  <span>Invalid request parameters</span>
                </div>
                <div>
                  <Badge variant="destructive" className="mr-2">500</Badge>
                  <span>Server error</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Example Error Response</h4>
              <div className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto">
                <pre>{`{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Monthly rate limit exceeded",
    "details": "Current usage: 1000/1000"
  },
  "metadata": {
    "request_id": "req_123456",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}`}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Get support and access additional resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-semibold">API Key Management</h4>
                <p className="text-sm text-muted-foreground">Create and manage your API keys</p>
              </div>
              <Link to="/dashboard?tab=api">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-semibold">Contact Support</h4>
                <p className="text-sm text-muted-foreground">Get help from our team</p>
              </div>
              <Link to="/contact">
                <Button variant="outline">Contact Us</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
