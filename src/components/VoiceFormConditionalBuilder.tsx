import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, GitBranch, AlertCircle } from 'lucide-react';
import { VoiceFormField, ConditionalRule } from '@/types/voiceForm';

interface VoiceFormConditionalBuilderProps {
  field: VoiceFormField;
  allFields: VoiceFormField[];
  onRulesChange: (rules: ConditionalRule[]) => void;
}

const conditionOptions = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'isEmpty', label: 'Is Empty' },
  { value: 'isNotEmpty', label: 'Is Not Empty' },
];

const actionOptions = [
  { value: 'show', label: 'Show' },
  { value: 'hide', label: 'Hide' },
  { value: 'skip', label: 'Skip' },
  { value: 'require', label: 'Make Required' },
  { value: 'optional', label: 'Make Optional' },
];

export const VoiceFormConditionalBuilder: React.FC<VoiceFormConditionalBuilderProps> = ({
  field,
  allFields,
  onRulesChange,
}) => {
  const [rules, setRules] = useState<ConditionalRule[]>(field.conditionalRules || []);
  
  // Get fields that come before this one (can only depend on earlier fields)
  const previousFields = allFields.filter((f, idx) => 
    idx < allFields.findIndex(af => af.id === field.id)
  );

  const addRule = () => {
    const newRule: ConditionalRule = {
      if: {
        fieldId: '',
        condition: 'equals',
        value: '',
      },
      then: {
        action: 'show',
        targetFieldId: field.id,
      },
    };
    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    onRulesChange(updatedRules);
  };

  const updateRule = (index: number, updatedRule: ConditionalRule) => {
    const updatedRules = rules.map((r, i) => (i === index ? updatedRule : r));
    setRules(updatedRules);
    onRulesChange(updatedRules);
  };

  const removeRule = (index: number) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    setRules(updatedRules);
    onRulesChange(updatedRules);
  };

  const getFieldName = (fieldId: string) => {
    return allFields.find(f => f.id === fieldId)?.label || 'Unknown Field';
  };

  const needsValue = (condition: string) => {
    return !['isEmpty', 'isNotEmpty'].includes(condition);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch className="h-4 w-4" />
              Conditional Logic
            </CardTitle>
            <CardDescription>
              Control when this field is shown or required based on other fields
            </CardDescription>
          </div>
          <Badge variant="secondary">{rules.length} rules</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {previousFields.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This is the first field. Add more fields above to create conditional logic.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {rules.length > 0 && (
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <Card key={index} className="bg-muted/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Rule {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRule(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      {/* IF Section */}
                      <div className="space-y-2">
                        <div className="text-sm font-medium">IF</div>
                        <div className="grid gap-2 md:grid-cols-3">
                          <Select
                            value={rule.if.fieldId}
                            onValueChange={(value) =>
                              updateRule(index, {
                                ...rule,
                                if: { ...rule.if, fieldId: value },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {previousFields.map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={rule.if.condition}
                            onValueChange={(value: any) =>
                              updateRule(index, {
                                ...rule,
                                if: { ...rule.if, condition: value },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {conditionOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {needsValue(rule.if.condition) && (
                            <Input
                              placeholder="Value"
                              value={rule.if.value || ''}
                              onChange={(e) =>
                                updateRule(index, {
                                  ...rule,
                                  if: { ...rule.if, value: e.target.value },
                                })
                              }
                            />
                          )}
                        </div>
                      </div>

                      {/* THEN Section */}
                      <div className="space-y-2">
                        <div className="text-sm font-medium">THEN</div>
                        <Select
                          value={rule.then.action}
                          onValueChange={(value: any) =>
                            updateRule(index, {
                              ...rule,
                              then: { ...rule.then, action: value },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {actionOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Rule Summary */}
                      <div className="text-xs text-muted-foreground bg-background p-2 rounded border">
                        When <strong>{getFieldName(rule.if.fieldId)}</strong>{' '}
                        {rule.if.condition}{' '}
                        {needsValue(rule.if.condition) && (
                          <>
                            "<strong>{rule.if.value}</strong>"
                          </>
                        )}
                        , then <strong>{rule.then.action}</strong> this field
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={addRule}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>

            {rules.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Rules are evaluated in order. The first matching rule determines the field's behavior.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
