import { VoiceForm, VoiceFormField, FormProgress, FieldCollectionLog } from '@/types/voiceForm';
import { VoiceFormFieldCapture } from './voiceFormCapture';
import { voiceTransitions } from './voiceTransitions';

/**
 * VoiceFormManager - Manages voice form state and collection flow
 */
export class VoiceFormManager {
  private form: VoiceForm;
  private collectedData: Record<string, any> = {};
  private currentFieldIndex: number = 0;
  private retryCount: Record<string, number> = {};
  private fieldCollectionLog: FieldCollectionLog[] = [];
  private fieldCapture: VoiceFormFieldCapture;
  private fieldStartTimes: Record<string, number> = {};

  constructor(form: VoiceForm) {
    this.form = form;
    this.fieldCapture = new VoiceFormFieldCapture();
  }

  /**
   * Get next field to collect based on required fields and dependencies
   */
  getNextField(): VoiceFormField | null {
    // Check conditional rules for each field
    const availableFields = this.form.fields.filter(field => {
      // Skip if already collected
      if (this.collectedData[field.id] !== undefined) return false;

      // Check conditional rules
      if (field.conditionalRules && field.conditionalRules.length > 0) {
        return this.evaluateConditionalRules(field);
      }

      return true;
    });

    // Prioritize required fields
    const requiredFields = availableFields.filter(f => f.required);
    if (requiredFields.length > 0) {
      return requiredFields[0];
    }

    // Then optional fields
    return availableFields[0] || null;
  }

  /**
   * Get current field being collected
   */
  getCurrentField(): VoiceFormField | null {
    return this.form.fields[this.currentFieldIndex] || this.getNextField();
  }

  /**
   * Record field value and update state
   */
  setFieldValue(
    fieldId: string, 
    value: any, 
    method: 'voice' | 'text' | 'secure',
    corrections: number = 0
  ): boolean {
    const field = this.form.fields.find(f => f.id === fieldId);
    if (!field) return false;

    // Validate
    const validation = this.fieldCapture.validateField(field, value);
    if (!validation.isValid) {
      console.warn(`Validation failed for ${field.name}:`, validation.error);
      return false;
    }

    // Store normalized value
    this.collectedData[fieldId] = validation.normalizedValue || value;

    // Track field collection
    const startTime = this.fieldStartTimes[fieldId] || Date.now();
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    this.fieldCollectionLog.push({
      fieldId: field.id,
      fieldName: field.name,
      collectionMethod: method,
      attempts: (this.retryCount[fieldId] || 0) + 1,
      timeSpent,
      correctionsMade: corrections,
      success: true
    });

    // Record transition
    const previousMethod = this.fieldCollectionLog.length > 0 
      ? this.fieldCollectionLog[this.fieldCollectionLog.length - 1].collectionMethod 
      : 'voice';
    voiceTransitions.recordTransition(fieldId, previousMethod, method, true);

    // Reset retry count for this field
    this.retryCount[fieldId] = 0;
    delete this.fieldStartTimes[fieldId];

    // Move to next field
    this.currentFieldIndex++;

    console.log('✅ Voice form field collected:', {
      field: field.name,
      value: validation.normalizedValue || value,
      method
    });

    return true;
  }

  /**
   * Increment retry count for current field
   */
  incrementRetry(fieldId: string): void {
    this.retryCount[fieldId] = (this.retryCount[fieldId] || 0) + 1;
    
    // Start timing if not already started
    if (!this.fieldStartTimes[fieldId]) {
      this.fieldStartTimes[fieldId] = Date.now();
    }
  }

  /**
   * Get retry count for field
   */
  getRetryCount(fieldId: string): number {
    return this.retryCount[fieldId] || 0;
  }

  /**
   * Check if form is complete
   */
  isComplete(): boolean {
    const requiredFields = this.form.fields.filter(f => f.required);
    return requiredFields.every(field => {
      // Check if field should be shown based on conditional rules
      if (field.conditionalRules && field.conditionalRules.length > 0) {
        const shouldShow = this.evaluateConditionalRules(field);
        if (!shouldShow) return true; // Skip this field
      }
      
      return this.collectedData[field.id] !== undefined;
    });
  }

  /**
   * Get form completion progress
   */
  getProgress(): FormProgress {
    const totalFields = this.form.fields.filter(f => {
      if (f.conditionalRules && f.conditionalRules.length > 0) {
        return this.evaluateConditionalRules(f);
      }
      return true;
    }).length;

    const completedFields = Object.keys(this.collectedData).length;
    const requiredFieldsRemaining = this.form.fields
      .filter(f => f.required && !this.collectedData[f.id])
      .length;

    return {
      totalFields,
      completedFields,
      currentFieldIndex: this.currentFieldIndex,
      percentComplete: totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0,
      requiredFieldsRemaining
    };
  }

  /**
   * Generate AI prompt for current field based on retry count
   */
  generateFieldPrompt(field: VoiceFormField): string {
    const retries = this.retryCount[field.id] || 0;
    
    if (retries === 0) {
      return field.voicePrompts.initial;
    } else if (retries === 1) {
      return field.voicePrompts.retry;
    } else {
      return field.voicePrompts.help;
    }
  }

  /**
   * Get all collected data
   */
  getCollectedData(): Record<string, any> {
    return { ...this.collectedData };
  }

  /**
   * Get field collection log for analytics
   */
  getFieldCollectionLog(): FieldCollectionLog[] {
    return [...this.fieldCollectionLog];
  }

  /**
   * Reset form state
   */
  reset(): void {
    this.collectedData = {};
    this.currentFieldIndex = 0;
    this.retryCount = {};
    this.fieldCollectionLog = [];
    this.fieldStartTimes = {};
  }

  /**
   * Check if max retries reached for current field
   */
  isMaxRetriesReached(fieldId: string): boolean {
    const retries = this.retryCount[fieldId] || 0;
    return retries >= this.form.settings.maxRetries;
  }

  /**
   * Update a field value (for corrections)
   */
  updateFieldValue(fieldId: string, newValue: any, method: 'voice' | 'text' | 'secure'): boolean {
    const field = this.form.fields.find(f => f.id === fieldId);
    if (!field) return false;

    const validation = this.fieldCapture.validateField(field, newValue);
    if (!validation.isValid) return false;

    const oldValue = this.collectedData[fieldId];
    this.collectedData[fieldId] = validation.normalizedValue || newValue;

    console.log('🔄 Voice form field corrected:', {
      field: field.name,
      oldValue,
      newValue: validation.normalizedValue || newValue,
      method
    });

    return true;
  }

  /**
   * Evaluate conditional rules for a field
   */
  private evaluateConditionalRules(field: VoiceFormField): boolean {
    if (!field.conditionalRules || field.conditionalRules.length === 0) {
      return true;
    }

    // All rules must pass (AND logic)
    return field.conditionalRules.every(rule => {
      const dependentValue = this.collectedData[rule.if.fieldId];
      
      switch (rule.if.condition) {
        case 'equals':
          return dependentValue === rule.if.value;
        case 'contains':
          return String(dependentValue).includes(String(rule.if.value));
        case 'greaterThan':
          return Number(dependentValue) > Number(rule.if.value);
        case 'lessThan':
          return Number(dependentValue) < Number(rule.if.value);
        case 'isEmpty':
          return !dependentValue || dependentValue === '';
        case 'isNotEmpty':
          return !!dependentValue && dependentValue !== '';
        default:
          return true;
      }
    });
  }

  /**
   * Get form metadata
   */
  getFormMetadata() {
    return {
      formId: this.form.id,
      formName: this.form.name,
      assistantId: this.form.assistantId,
      totalFields: this.form.fields.length,
      requiredFields: this.form.fields.filter(f => f.required).length
    };
  }

  /**
   * Export submission data
   */
  exportSubmissionData() {
    return {
      formId: this.form.id,
      assistantId: this.form.assistantId,
      data: this.getCollectedData(),
      completionTime: this.fieldCollectionLog.reduce((sum, log) => sum + log.timeSpent, 0),
      fieldCollectionLog: this.getFieldCollectionLog()
    };
  }
}
