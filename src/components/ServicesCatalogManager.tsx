import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search, DollarSign, Loader2, Package, CheckCircle2, XCircle } from 'lucide-react';
import { ServiceFormModal } from './ServiceFormModal';

interface ServicesCatalogManagerProps {
  assistantId: string;
}

interface Service {
  id: string;
  service_name: string;
  service_category: string;
  description: string;
  base_price: number;
  price_currency: string;
  pricing_model: string;
  delivery_time: string;
  key_features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata?: {
    max_price?: number;
    price_type?: 'fixed' | 'range';
    billing_cycle?: string;
  };
}

export const ServicesCatalogManager: React.FC<ServicesCatalogManagerProps> = ({ assistantId }) => {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  
  // Get unique categories from services
  const uniqueCategories = React.useMemo(() => {
    const categories = services.map(s => s.service_category).filter(Boolean);
    return Array.from(new Set(categories)).sort();
  }, [services]);

  useEffect(() => {
    if (assistantId) {
      loadServices();
    }
  }, [assistantId]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services_catalog')
        .select('*')
        .eq('assistant_id', assistantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error('Error loading services:', error);
      toast({
        title: 'Error',
        description: 'Failed to load services',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = () => {
    setEditingService(null);
    setIsFormOpen(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsFormOpen(true);
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('services_catalog')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Service deleted successfully'
      });
      
      loadServices();
    } catch (error: any) {
      console.error('Error deleting service:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete service',
        variant: 'destructive'
      });
    } finally {
      setDeletingServiceId(null);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services_catalog')
        .update({ is_active: !service.is_active })
        .eq('id', service.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Service ${!service.is_active ? 'activated' : 'deactivated'}`
      });
      
      loadServices();
    } catch (error: any) {
      console.error('Error toggling service status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update service status',
        variant: 'destructive'
      });
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingService(null);
    loadServices();
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || service.service_category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      'GBP': '£',
      'USD': '$',
      'EUR': '€'
    };
    return symbols[currency] || currency;
  };

  if (!assistantId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Please select an assistant to manage services.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Services & Pricing Catalog
              </CardTitle>
              <CardDescription>
                Add your service offerings with pricing for the AI assistant to recommend
              </CardDescription>
            </div>
            <Button onClick={handleAddService}>
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{services.length}</p>
                    <p className="text-xs text-muted-foreground">Total Services</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{services.filter(s => s.is_active).length}</p>
                    <p className="text-xs text-muted-foreground">Active Services</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {services.length > 0 
                        ? `${getCurrencySymbol(services[0]?.price_currency || 'GBP')}${Math.min(...services.map(s => s.base_price))}`
                        : '-'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">Starting From</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Services Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {services.length === 0 
                  ? 'No services added yet. Add your first service to get started.'
                  : 'No services match your filters.'
                }
              </p>
              {services.length === 0 && (
                <Button onClick={handleAddService}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Service
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{service.service_name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {service.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{service.service_category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {getCurrencySymbol(service.price_currency)}
                            {service.base_price.toLocaleString()}
                            {service.metadata?.price_type === 'range' && service.metadata?.max_price && (
                              <> - {getCurrencySymbol(service.price_currency)}{service.metadata.max_price.toLocaleString()}</>
                            )}
                            {service.pricing_model === 'subscription' && service.metadata?.billing_cycle && (
                              <span className="text-xs font-normal text-muted-foreground">/{service.metadata.billing_cycle}</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {service.pricing_model}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{service.delivery_time || 'Custom'}</p>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(service)}
                          className="gap-1"
                        >
                          {service.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-gray-400" />
                              Inactive
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditService(service)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog
                            open={deletingServiceId === service.id}
                            onOpenChange={(open) => !open && setDeletingServiceId(null)}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingServiceId(service.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Service?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{service.service_name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteService(service.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-muted">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">💡 How Services & Pricing Works</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Add your service offerings with detailed descriptions and pricing</li>
            <li>• The AI assistant will match user inquiries to your services automatically</li>
            <li>• Users receive instant pricing for matched services in their conversations</li>
            <li>• Inactive services won't be shown to users but remain in your catalog</li>
            <li>• Update pricing anytime without affecting past inquiries</li>
          </ul>
        </CardContent>
      </Card>

      {/* Service Form Modal */}
      <ServiceFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingService(null);
        }}
        onSuccess={handleFormSuccess}
        assistantId={assistantId}
        service={editingService}
      />
    </div>
  );
};
