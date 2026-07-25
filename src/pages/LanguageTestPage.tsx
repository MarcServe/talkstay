import React from 'react';
import { LanguageSelector } from '@/components/LanguageSelector';
import { VoiceFormFiller } from '@/components/VoiceFormFiller';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/utils/translations';

// Test page to demonstrate language detection and multi-language support
export const LanguageTestPage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Language Detection & Multi-Language Support Demo
              <LanguageSelector variant="button" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Language Selector Variants</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Button Variant</p>
                    <LanguageSelector variant="button" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Compact Variant</p>
                    <LanguageSelector variant="compact" />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Translation Examples</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Listening:</strong> {t('voice.listening')}</div>
                  <div><strong>Processing:</strong> {t('voice.processing')}</div>
                  <div><strong>Start Chat:</strong> {t('voice.startConversation')}</div>
                  <div><strong>Close:</strong> {t('chat.close')}</div>
                  <div><strong>Send:</strong> {t('chat.send')}</div>
                  <div><strong>Confirm:</strong> {t('booking.confirm')}</div>
                  <div><strong>Edit:</strong> {t('booking.edit')}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">Full Language Selector</h3>
              <LanguageSelector variant="full" />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Test Form for Voice Filling</h3>
              <form className="space-y-4 p-4 border rounded-lg">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="test-name" className="block text-sm font-medium mb-1">
                      {t('booking.name')}
                    </label>
                    <input
                      id="test-name"
                      type="text"
                      placeholder={t('booking.enterName')}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label htmlFor="test-email" className="block text-sm font-medium mb-1">
                      {t('booking.email')}
                    </label>
                    <input
                      id="test-email"
                      type="email"
                      placeholder={t('booking.enterEmail')}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label htmlFor="test-phone" className="block text-sm font-medium mb-1">
                      {t('booking.phone')}
                    </label>
                    <input
                      id="test-phone"
                      type="tel"
                      placeholder={t('booking.enterPhone')}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label htmlFor="test-message" className="block text-sm font-medium mb-1">
                      Message
                    </label>
                    <textarea
                      id="test-message"
                      placeholder="Enter your message..."
                      className="w-full p-2 border rounded"
                      rows={3}
                    />
                  </div>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        <VoiceFormFiller />
      </div>
    </div>
  );
};