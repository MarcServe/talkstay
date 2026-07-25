import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Eye, EyeOff, Key, Plus, Trash2, ToggleLeft, ToggleRight, AlertCircle, CheckCircle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const supabaseUrl = "https://oujqkygfmyapmrgxmhvt.supabase.co";

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: any;
  usage_count: number;
  rate_limit_per_month: number;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
  last_used_at?: string;
}

export const APIKeyManagement = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyData, setNewKeyData] = useState<any>(null);
  const { toast } = useToast();

  // Create API Key Form State
  const [keyName, setKeyName] = useState('');
  const [environment, setEnvironment] = useState('live');
  const [expiresIn, setExpiresIn] = useState('never');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-api-key`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch API keys');
      }

      const result = await response.json();
      setApiKeys(result?.data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAPIKey = async () => {
    try {
      setCreating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-api-key', {
        body: {
          name: keyName,
          environment,
          expiresIn: expiresIn === 'never' ? null : expiresIn
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setNewKeyData(data?.data);
      setKeyName('');
      setEnvironment('live');
      setExpiresIn('never');
      
      toast({
        title: "API Key Created",
        description: "Your new API key has been generated successfully.",
      });

      await fetchAPIKeys();
    } catch (error: any) {
      console.error('Error creating API key:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteAPIKey = async (keyId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session');
      }

      const url = new URL(window.location.href);
      url.searchParams.set('keyId', keyId);
      
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-api-key?keyId=${keyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete API key');
      }

      toast({
        title: "API Key Deleted",
        description: "The API key has been permanently deleted.",
      });

      await fetchAPIKeys();
    } catch (error: any) {
      console.error('Error deleting API key:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const toggleAPIKey = async (keyId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-api-key?keyId=${keyId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'toggle' })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update API key');
      }

      toast({
        title: "API Key Updated",
        description: "The API key status has been updated.",
      });

      await fetchAPIKeys();
    } catch (error: any) {
      console.error('Error toggling API key:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update API key",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage your API keys for external integrations. Keep your keys secure and never share them publicly.
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key for external integrations. Choose a descriptive name to help you identify its purpose.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="keyName">API Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., Production App, Mobile App, etc."
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="environment">Environment</Label>
                    <Select value={environment} onValueChange={setEnvironment}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">Live (1,000 req/month)</SelectItem>
                        <SelectItem value="test">Test (100 req/month)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="expires">Expiration</Label>
                    <Select value={expiresIn} onValueChange={setExpiresIn}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never expires</SelectItem>
                        <SelectItem value="30d">30 days</SelectItem>
                        <SelectItem value="90d">90 days</SelectItem>
                        <SelectItem value="1y">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAPIKey} disabled={!keyName.trim() || creating}>
                    {creating ? 'Creating...' : 'Create Key'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {newKeyData && (
            <Alert className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">API Key Created Successfully!</p>
                  <p className="text-sm">This is the only time you'll see the full key. Copy it now:</p>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                    <code className="flex-1">{newKeyData.key}</code>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(newKeyData.key, 'API Key')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setNewKeyData(null)}
                  >
                    I've copied the key
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="keys" className="w-full">
            <TabsList>
              <TabsTrigger value="keys">API Keys</TabsTrigger>
              <TabsTrigger value="docs">Documentation</TabsTrigger>
            </TabsList>

            <TabsContent value="keys" className="space-y-4">
              {apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No API keys created yet</p>
                  <p className="text-sm">Create your first API key to get started with external integrations.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <Card key={key.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{key.name}</h3>
                              <Badge variant={key.is_active ? "default" : "secondary"}>
                                {key.is_active ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant="outline">
                                {key.key_prefix.includes('test') ? 'Test' : 'Live'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>Key: {key.key_prefix}***</span>
                              <span>Usage: {key.usage_count} / {key.rate_limit_per_month}</span>
                              <span>Created: {formatDate(key.created_at)}</span>
                              {key.expires_at && (
                                <span>Expires: {formatDate(key.expires_at)}</span>
                              )}
                              {key.last_used_at && (
                                <span>Last used: {formatDate(key.last_used_at)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleAPIKey(key.id)}
                            >
                              {key.is_active ? (
                                <ToggleRight className="w-4 h-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-gray-400" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteAPIKey(key.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="docs" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
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
                    <div className="bg-muted p-3 rounded font-mono text-sm">
                      <code>Authorization: Bearer tw_live_your_api_key_here</code>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Base URL</h4>
                    <div className="bg-muted p-3 rounded font-mono text-sm">
                      <code>https://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/api-gateway</code>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Available Endpoints</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">POST</Badge>
                        <code>/api/v1/chat</code>
                        <span className="text-muted-foreground">- Send chat message</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">GET</Badge>
                        <code>/api/v1/assistants</code>
                        <span className="text-muted-foreground">- List assistants</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">GET</Badge>
                        <code>/api/v1/assistants/{"{"}{`id`}{"}"}</code>
                        <span className="text-muted-foreground">- Get assistant</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">POST</Badge>
                        <code>/api/v1/scrape</code>
                        <span className="text-muted-foreground">- Scrape website content</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Rate Limits</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Live keys:</strong> 1,000 requests per month</p>
                      <p><strong>Test keys:</strong> 100 requests per month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Code Examples</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">JavaScript/Node.js</h4>
                    <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
<pre>{`const response = await fetch('https://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/api-gateway/api/v1/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tw_live_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: "Hello, I need help with my order",
    assistantId: "your-assistant-id",
    sessionId: "unique-session-id"
  })
});

const data = await response.json();
if (data.success) {
  console.log('AI Response:', data.data.response);
} else {
  console.error('Error:', data.error);
}`}</pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Python</h4>
                    <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
<pre>{`import requests

url = "https://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/api-gateway/api/v1/chat"
headers = {
    "Authorization": "Bearer tw_live_your_api_key_here",
    "Content-Type": "application/json"
}
data = {
    "message": "Hello, I need help with my order",
    "assistantId": "your-assistant-id",
    "sessionId": "unique-session-id"
}

response = requests.post(url, headers=headers, json=data)
result = response.json()

if result["success"]:
    print("AI Response:", result["data"]["response"])
else:
    print("Error:", result["error"])`}</pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">cURL</h4>
                    <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
<pre>{`curl -X POST \\
  https://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/api-gateway/api/v1/chat \\
  -H 'Authorization: Bearer tw_live_your_api_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "message": "Hello, I need help with my order",
    "assistantId": "your-assistant-id",
    "sessionId": "unique-session-id"
  }'`}</pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">PHP</h4>
                    <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
<pre>{`<?php
$url = 'https://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/api-gateway/api/v1/chat';
$headers = [
    'Authorization: Bearer tw_live_your_api_key_here',
    'Content-Type: application/json'
];
$data = json_encode([
    'message' => 'Hello, I need help with my order',
    'assistantId' => 'your-assistant-id',
    'sessionId' => 'unique-session-id'
]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
if ($result['success']) {
    echo 'AI Response: ' . $result['data']['response'];
} else {
    echo 'Error: ' . $result['error']['message'];
}
?>`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Integration Use Cases</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Customer Support Systems</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Integrate with Zendesk, Intercom, or Freshdesk to provide AI-powered responses to customer inquiries.
                    </p>
                    <div className="text-sm">
                      <strong>Webhook Example:</strong> Set up a webhook in your support system to send new tickets to the API and get AI responses.
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">E-commerce Platforms</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Add AI chat to Shopify, WooCommerce, or Magento stores for product recommendations and support.
                    </p>
                    <div className="text-sm">
                      <strong>Widget Integration:</strong> Use the chat API to power custom chat widgets on your store.
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">CRM Integration</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Connect with HubSpot, Salesforce, or Pipedrive to enhance lead qualification and customer communication.
                    </p>
                    <div className="text-sm">
                      <strong>Lead Scoring:</strong> Use the API to analyze and respond to lead inquiries automatically.
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Mobile Applications</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Integrate AI chat into iOS and Android apps for in-app customer support.
                    </p>
                    <div className="text-sm">
                      <strong>Real-time Chat:</strong> Build chat interfaces that connect to your AI assistants via the API.
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Automation Tools</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Connect with Zapier, Make.com, or custom automation workflows.
                    </p>
                    <div className="text-sm">
                      <strong>Workflow Triggers:</strong> Automatically respond to emails, forms, or other triggers using the API.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* MCP Integration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    MCP Integration
                  </CardTitle>
                  <CardDescription>
                    Connect with AI tools like Claude Desktop using Model Context Protocol
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">MCP Server Configuration</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Add this configuration to your MCP client (e.g., Claude Desktop):
                    </p>
                    <div className="bg-muted p-4 rounded-md">
                      <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
{`{
  "mcpServers": {
    "talkweb": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "env": {
        "FETCH_BASE_URL": "https://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/mcp-server",
        "FETCH_HEADERS": "{\\"Authorization\\": \\"Bearer YOUR_API_KEY\\"}"
      }
    }
  }
}`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Available MCP Tools</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="p-3 border rounded-md">
                          <h5 className="font-medium">list_assistants</h5>
                          <p className="text-xs text-muted-foreground">List all your AI assistants</p>
                        </div>
                        <div className="p-3 border rounded-md">
                          <h5 className="font-medium">create_assistant</h5>
                          <p className="text-xs text-muted-foreground">Create a new AI assistant</p>
                        </div>
                        <div className="p-3 border rounded-md">
                          <h5 className="font-medium">chat_with_assistant</h5>
                          <p className="text-xs text-muted-foreground">Send messages to assistants</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="p-3 border rounded-md">
                          <h5 className="font-medium">get_assistant_analytics</h5>
                          <p className="text-xs text-muted-foreground">View assistant performance metrics</p>
                        </div>
                        <div className="p-3 border rounded-md">
                          <h5 className="font-medium">scrape_website</h5>
                          <p className="text-xs text-muted-foreground">Trigger website content updates</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Setup Instructions</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Create an API key above if you haven't already</li>
                      <li>Replace "YOUR_API_KEY" in the configuration with your actual API key</li>
                      <li>Add the configuration to your Claude Desktop config file:
                        <ul className="list-disc list-inside ml-4 mt-1">
                          <li>macOS: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
                          <li>Windows: <code>%APPDATA%\Claude\claude_desktop_config.json</code></li>
                        </ul>
                      </li>
                      <li>Restart Claude Desktop to load the MCP server</li>
                      <li>You can now use natural language to manage your assistants through Claude</li>
                    </ol>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      MCP integration allows AI tools like Claude Desktop to directly interact with your TalkWeb assistants,
                      enabling powerful automation and management workflows through natural language.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Response Format</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <h4 className="font-semibold mb-2">Success Response</h4>
                    <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
<pre>{`{
  "success": true,
  "data": {
    "response": "Hello! I'd be happy to help you with your order...",
    "sessionId": "unique-session-id",
    "timestamp": "2025-01-09T19:30:00.000Z"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-01-09T19:30:00.000Z",
    "rateLimit": {
      "limit": 1000,
      "remaining": 995,
      "resetAt": "2025-02-01T00:00:00.000Z"
    }
  }
}`}</pre>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Error Response</h4>
                    <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
<pre>{`{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Monthly rate limit exceeded"
  },
  "meta": {
    "requestId": "req_def456",
    "timestamp": "2025-01-09T19:30:00.000Z",
    "rateLimit": {
      "limit": 1000,
      "remaining": 0,
      "resetAt": "2025-02-01T00:00:00.000Z"
    }
  }
}`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};