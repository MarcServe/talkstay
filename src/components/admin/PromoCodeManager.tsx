import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Copy, Calendar, Users, Percent } from "lucide-react";
import { format } from "date-fns";

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_trial';
  discount_amount: number;
  usage_limit?: number;
  used_count: number;
  expires_at?: string;
  active: boolean;
  created_at: string;
  created_by?: string;
}

export const PromoCodeManager = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed_amount' | 'free_trial',
    discountAmount: 10,
    usageLimit: '',
    expiresAt: ''
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch promo codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code: result });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast({
        title: "Error",
        description: "Promo code is required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-promo-code', {
        body: {
          code: formData.code.trim(),
          discountType: formData.discountType,
          discountAmount: formData.discountType === 'free_trial' ? 100 : formData.discountAmount,
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
          expiresAt: formData.expiresAt || null
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Promo code "${formData.code}" created successfully`,
      });

      // Reset form
      setFormData({
        code: '',
        discountType: 'percentage',
        discountAmount: 10,
        usageLimit: '',
        expiresAt: ''
      });
      setShowForm(false);
      fetchPromoCodes();

    } catch (error) {
      console.error('Error creating promo code:', error);
      toast({
        title: "Error",
        description: "Failed to create promo code",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const togglePromoCode = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ active })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Promo code ${active ? 'activated' : 'deactivated'}`,
      });

      fetchPromoCodes();
    } catch (error) {
      console.error('Error updating promo code:', error);
      toast({
        title: "Error",
        description: "Failed to update promo code",
        variant: "destructive",
      });
    }
  };

  const deletePromoCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promo code deleted successfully",
      });

      fetchPromoCodes();
    } catch (error) {
      console.error('Error deleting promo code:', error);
      toast({
        title: "Error",
        description: "Failed to delete promo code",
        variant: "destructive",
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: `Promo code "${code}" copied to clipboard`,
    });
  };

  const getDiscountDisplay = (promoCode: PromoCode) => {
    if (promoCode.discount_type === 'percentage') {
      return `${promoCode.discount_amount}%`;
    } else if (promoCode.discount_type === 'fixed_amount') {
      return `$${promoCode.discount_amount}`;
    } else {
      return 'Free Trial';
    }
  };

  const getBadgeVariant = (promoCode: PromoCode) => {
    if (!promoCode.active) return 'secondary';
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) return 'destructive';
    if (promoCode.usage_limit && promoCode.used_count >= promoCode.usage_limit) return 'destructive';
    return 'default';
  };

  if (loading) {
    return <div className="p-6">Loading promo codes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Promo Code Management</h2>
          <p className="text-muted-foreground">Create and manage promotional codes</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Promo Code
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Promo Code</CardTitle>
            <CardDescription>
              Create promotional codes for discounts or free trials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Promo Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Enter code"
                      maxLength={20}
                    />
                    <Button type="button" variant="outline" onClick={generateCode}>
                      Generate
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="discountType">Discount Type</Label>
                  <Select
                    value={formData.discountType}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      discountType: value as any,
                      discountAmount: value === 'free_trial' ? 100 : 10
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                      <SelectItem value="free_trial">Free Trial (100%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discountAmount">
                    Discount Amount {formData.discountType === 'percentage' ? '(%)' : '($)'}
                  </Label>
                  <Input
                    id="discountAmount"
                    type="number"
                    min="0"
                    max={formData.discountType === 'percentage' ? 100 : undefined}
                    value={formData.discountAmount}
                    onChange={(e) => setFormData({ ...formData, discountAmount: parseFloat(e.target.value) })}
                    disabled={formData.discountType === 'free_trial'}
                  />
                </div>
                <div>
                  <Label htmlFor="usageLimit">Usage Limit (optional)</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Promo Code'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Existing Promo Codes</CardTitle>
          <CardDescription>
            Manage your promotional codes and track their usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {promoCodes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No promo codes created yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((promoCode) => (
                  <TableRow key={promoCode.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono bg-muted px-2 py-1 rounded">
                          {promoCode.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCode(promoCode.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {promoCode.discount_type === 'percentage' ? (
                          <Percent className="h-3 w-3 mr-1" />
                        ) : promoCode.discount_type === 'fixed_amount' ? (
                          '$'
                        ) : (
                          'Trial'
                        )}
                        {promoCode.discount_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{getDiscountDisplay(promoCode)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {promoCode.used_count}
                        {promoCode.usage_limit && `/${promoCode.usage_limit}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      {promoCode.expires_at ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(promoCode.expires_at), 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        'Never'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(promoCode)}>
                        {!promoCode.active
                          ? 'Inactive'
                          : promoCode.expires_at && new Date(promoCode.expires_at) < new Date()
                          ? 'Expired'
                          : promoCode.usage_limit && promoCode.used_count >= promoCode.usage_limit
                          ? 'Used Up'
                          : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={promoCode.active}
                          onCheckedChange={(checked) => togglePromoCode(promoCode.id, checked)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePromoCode(promoCode.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};