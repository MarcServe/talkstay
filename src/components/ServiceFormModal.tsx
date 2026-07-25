import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, X } from 'lucide-react';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assistantId: string;
  service?: any | null;
}

export const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assistantId,
  service
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    service_name: '',
    service_category: '',
    description: '',
    base_price: '',
    max_price: '',
    price_type: 'fixed' as 'fixed' | 'range',
    price_currency: 'GBP',
    pricing_model: 'fixed',
    billing_cycle: 'monthly',
    delivery_time: '',
    is_active: true,
    payment_link: ''
  });
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    if (service) {
      // Detect if service has a range (check metadata or if it's stored differently)
      const hasRange = service.metadata?.max_price || service.max_price;
      setFormData({
        service_name: service.service_name || '',
        service_category: service.service_category || '',
        description: service.description || '',
        base_price: service.base_price?.toString() || '',
        max_price: (service.metadata?.max_price || service.max_price)?.toString() || '',
        price_type: hasRange ? 'range' : 'fixed',
        price_currency: service.price_currency || 'GBP',
        pricing_model: service.pricing_model || 'fixed',
        billing_cycle: service.metadata?.billing_cycle || 'monthly',
        delivery_time: service.delivery_time || '',
        is_active: service.is_active ?? true,
        payment_link: service.metadata?.payment_link || ''
      });
      setFeatures(service.key_features || []);
    } else {
      // Reset form for new service
      setFormData({
        service_name: '',
        service_category: '',
        description: '',
        base_price: '',
        max_price: '',
        price_type: 'fixed',
        price_currency: 'GBP',
        pricing_model: 'fixed',
        billing_cycle: 'monthly',
        delivery_time: '',
        is_active: true,
        payment_link: ''
      });
      setFeatures([]);
    }
    setNewFeature('');
  }, [service, isOpen]);

  const handleAddFeature = () => {
    if (newFeature.trim() && !features.includes(newFeature.trim())) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.service_name || !formData.base_price) {
      toast({
        title: 'Validation Error',
        description: 'Service name and price are required',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.service_category?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category is required',
        variant: 'destructive'
      });
      return;
    }

    const basePrice = parseFloat(formData.base_price);
    if (isNaN(basePrice) || basePrice < 0) {
      toast({
        title: 'Validation Error',
        description: 'Base price must be a valid positive number',
        variant: 'destructive'
      });
      return;
    }

    // Validate range pricing
    if (formData.price_type === 'range') {
      if (!formData.max_price) {
        toast({
          title: 'Validation Error',
          description: 'Maximum price is required for range pricing',
          variant: 'destructive'
        });
        return;
      }
      
      const maxPrice = parseFloat(formData.max_price);
      if (isNaN(maxPrice) || maxPrice < 0) {
        toast({
          title: 'Validation Error',
          description: 'Maximum price must be a valid positive number',
          variant: 'destructive'
        });
        return;
      }

      if (maxPrice <= basePrice) {
        toast({
          title: 'Validation Error',
          description: 'Maximum price must be greater than minimum price',
          variant: 'destructive'
        });
        return;
      }
    }

    setSaving(true);
    try {
      const serviceData = {
        assistant_id: assistantId,
        service_name: formData.service_name.trim(),
        service_category: formData.service_category.trim(),
        description: formData.description?.trim() || null,
        base_price: basePrice,
        price_currency: formData.price_currency,
        pricing_model: formData.pricing_model,
        delivery_time: formData.delivery_time?.trim() || null,
        key_features: features,
        is_active: formData.is_active,
        metadata: {
          ...(formData.price_type === 'range' 
            ? { max_price: parseFloat(formData.max_price), price_type: 'range' }
            : { price_type: 'fixed' }),
          ...(formData.pricing_model === 'subscription' ? { billing_cycle: formData.billing_cycle } : {}),
          ...(formData.payment_link.trim() ? { payment_link: formData.payment_link.trim() } : {})
        }
      };

      if (service) {
        // Update existing service
        const { error } = await supabase
          .from('services_catalog')
          .update(serviceData)
          .eq('id', service.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Service updated successfully'
        });
      } else {
        // Create new service
        const { error } = await supabase
          .from('services_catalog')
          .insert([serviceData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Service created successfully'
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving service:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save service',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          <DialogDescription>
            Configure your service offering with pricing and features
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Name */}
          <div className="space-y-2">
            <Label htmlFor="service_name">Service Name *</Label>
            <Input
              id="service_name"
              value={formData.service_name}
              onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
              placeholder="e.g., AI Chatbot Development"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Input
              id="category"
              value={formData.service_category}
              onChange={(e) => setFormData({ ...formData, service_category: e.target.value })}
              placeholder="e.g., Web Development, Consulting, Marketing"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter your own category name to organize services
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the service..."
              rows={3}
            />
          </div>

          {/* Pricing Type Toggle */}
          <div className="space-y-2">
            <Label>Pricing Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.price_type === 'fixed' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, price_type: 'fixed', max_price: '' })}
                className="flex-1"
              >
                Fixed Price
              </Button>
              <Button
                type="button"
                variant={formData.price_type === 'range' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, price_type: 'range' })}
                className="flex-1"
              >
                Price Range
              </Button>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_price">
                {formData.price_type === 'range' ? 'Minimum Price *' : 'Base Price *'}
              </Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                min="0"
                max="999999999"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                placeholder="1200"
                required
              />
            </div>

            {formData.price_type === 'range' && (
              <div className="space-y-2">
                <Label htmlFor="max_price">Maximum Price *</Label>
                <Input
                  id="max_price"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999999999"
                  value={formData.max_price}
                  onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
                  placeholder="2500"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.price_currency}
                onValueChange={(value) => setFormData({ ...formData, price_currency: value })}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricing_model">Pricing Model</Label>
              <Select
                value={formData.pricing_model}
                onValueChange={(value) => setFormData({ ...formData, pricing_model: value })}
              >
                <SelectTrigger id="pricing_model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="hourly">Hourly Rate</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="custom">Custom Quote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Billing Cycle (shown only for subscription) */}
          {formData.pricing_model === 'subscription' && (
            <div className="space-y-2">
              <Label htmlFor="billing_cycle">Billing Cycle</Label>
              <Select
                value={formData.billing_cycle}
                onValueChange={(value) => setFormData({ ...formData, billing_cycle: value })}
              >
                <SelectTrigger id="billing_cycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Delivery Time */}
          <div className="space-y-2">
            <Label htmlFor="delivery_time">Delivery Time</Label>
            <Input
              id="delivery_time"
              value={formData.delivery_time}
              onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
              placeholder="e.g., 2 weeks, 1 month"
            />
          </div>

          {/* Payment Link */}
          <div className="space-y-2">
            <Label htmlFor="payment_link">Payment Link (Stripe / Payment URL)</Label>
            <Input
              id="payment_link"
              type="url"
              value={formData.payment_link}
              onChange={(e) => setFormData({ ...formData, payment_link: e.target.value })}
              placeholder="https://buy.stripe.com/... or any payment URL"
            />
            <p className="text-xs text-muted-foreground">
              The AI will share this link with customers so they can pay for this service directly
            </p>
          </div>

          {/* Key Features */}
          <div className="space-y-2">
            <Label>Key Features</Label>
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add a feature..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
              />
              <Button type="button" onClick={handleAddFeature} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {features.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {features.map((feature, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {feature}
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="is_active" className="cursor-pointer">Active Status</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Inactive services won't be shown to users
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                service ? 'Update Service' : 'Create Service'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
