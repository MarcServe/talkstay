import React, { useState, useEffect } from 'react';
import { X, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PrivacyInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldType: 'email' | 'phone';
  onSubmit: (value: string) => void;
  currentValue?: string;
}

export const PrivacyInputModal: React.FC<PrivacyInputModalProps> = ({
  isOpen,
  onClose,
  fieldType,
  onSubmit,
  currentValue = ''
}) => {
  const [value, setValue] = useState(currentValue);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  useEffect(() => {
    validateInput(value);
  }, [value, fieldType]);

  const validateInput = (input: string) => {
    switch (fieldType) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        setIsValid(emailRegex.test(input));
        break;
      case 'phone':
        const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;
        setIsValid(phoneRegex.test(input.replace(/\s/g, '')));
        break;
      default:
        setIsValid(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSubmit(value);
      onClose();
    }
  };

  const getFieldLabel = () => {
    switch (fieldType) {
      case 'email': return 'Email Address';
      case 'phone': return 'Phone Number';
      default: return 'Information';
    }
  };

  const getPlaceholder = () => {
    switch (fieldType) {
      case 'email': return 'your.email@example.com';
      case 'phone': return '+1 (555) 123-4567';
      default: return '';
    }
  };

  const getDescription = () => {
    switch (fieldType) {
      case 'email': return 'Your email will be used for booking confirmations and important updates.';
      case 'phone': return 'Your phone number helps us reach you if needed for your appointment.';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              <Lock className="h-4 w-4" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <CardTitle className="text-xl font-semibold">
              Secure Input
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Type your {fieldType} securely below
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={fieldType} className="text-sm font-medium">
                {getFieldLabel()}
              </Label>
              <Input
                id={fieldType}
                type={fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : 'text'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={getPlaceholder()}
                className={`transition-colors ${
                  value && !isValid 
                    ? 'border-destructive focus:border-destructive' 
                    : value && isValid 
                    ? 'border-green-500 focus:border-green-500' 
                    : ''
                }`}
                autoFocus
                autoComplete={fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : 'name'}
              />
              {value && !isValid && (
                <p className="text-sm text-destructive">
                  Please enter a valid {fieldType}
                </p>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                {getDescription()}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </form>

          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <Shield className="h-3 w-3" />
            <span>Your information is encrypted and secure</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};