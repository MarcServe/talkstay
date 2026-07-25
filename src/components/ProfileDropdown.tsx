import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Settings, LogOut, CreditCard, HelpCircle, Mail, Phone, Key, MessageSquare } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

interface ProfileDropdownProps {
  onProfileClick: () => void;
  onSignOut: () => void;
}

export const ProfileDropdown = ({ onProfileClick, onSignOut }: ProfileDropdownProps) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
      fetchProfile();
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('subscribed, subscription_tier, subscription_end')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, company_name, avatar_url')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const getSubscriptionStatus = () => {
    if (!subscription) return { label: 'Free', variant: 'secondary' as const };
    
    if (subscription.subscribed) {
      const tier = subscription.subscription_tier?.toLowerCase();
      switch (tier) {
        case 'pro':
          return { label: 'Pro', variant: 'default' as const };
        case 'enterprise':
          return { label: 'Enterprise', variant: 'default' as const };
        default:
          return { label: 'Premium', variant: 'default' as const };
      }
    }
    
    return { label: 'Free', variant: 'secondary' as const };
  };

  const getDisplayName = () => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    if (profile?.company_name) {
      return profile.company_name;
    }
    return user?.email || 'User';
  };

  const getInitials = () => {
    const name = getDisplayName();
    
    // If it's just an email, use the first two letters of the email prefix
    if (name === user?.email && name.includes('@')) {
      const prefix = name.split('@')[0];
      return prefix.slice(0, 2).toUpperCase();
    }
    
    const words = name.split(' ').filter(word => word.length > 0);
    
    // If we have multiple words, use first letter of first two words
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    
    // If single word but long enough, use first two letters
    if (words.length === 1 && words[0].length >= 2) {
      return words[0].slice(0, 2).toUpperCase();
    }
    
    // Fallback to first letter + 'U' for User
    return (words[0]?.[0] || 'U') + 'U';
  };

  const status = getSubscriptionStatus();
  const { openCustomerPortal } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate('/dashboard?tab=profile');
  };

  const handleBillingClick = async () => {
    try {
      if (subscription?.subscribed) {
        await openCustomerPortal();
      } else {
        navigate('/pricing');
      }
    } catch (err: any) {
      console.error('Open customer portal error:', err);
      toast({ title: 'Billing', description: err?.message || 'Unable to open billing portal.', variant: 'destructive' });
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      toast({ title: 'Error', description: 'No email associated with this account.', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`
      });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ 
          title: 'Password reset email sent!', 
          description: 'Please check your inbox for the password reset link.' 
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to send reset email.', variant: 'destructive' });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 md:h-11 md:w-11 rounded-full ring-2 ring-border hover:ring-primary/30 transition-all">
          <div className="h-10 w-10 md:h-11 md:w-11 rounded-full bg-purple-600 text-orange-400 font-black text-lg md:text-xl leading-none flex items-center justify-center shadow-sm">
            {getInitials()}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 z-[2000] bg-background border shadow-md" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
              <Badge variant={status.variant} className="text-xs">
                {status.label}
              </Badge>
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
            {subscription?.subscribed && subscription.subscription_end && (
              <p className="text-xs leading-none text-muted-foreground">
                Expires: {new Date(subscription.subscription_end).toLocaleDateString()}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onProfileClick}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile & Business Info</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSettingsClick}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleBillingClick}>
          <CreditCard className="mr-2 h-4 w-4" />
          <span>{subscription?.subscribed ? 'Billing' : 'Subscribe'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleChangePassword}>
          <Key className="mr-2 h-4 w-4" />
          <span>Change Password</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center space-x-2">
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Support</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigate('/feedback')}>
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>Send Feedback</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open('mailto:support@talkweb.io', '_self')}>
          <Mail className="mr-2 h-4 w-4" />
          <span>Email Support</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open('tel:+447471245972', '_self')}>
          <Phone className="mr-2 h-4 w-4" />
          <span>Call Support</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};