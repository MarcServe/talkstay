import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, ArrowRight } from 'lucide-react';
import { VoiceFormField } from '@/types/voiceForm';

interface VoiceFormDependencyGraphProps {
  fields: VoiceFormField[];
}

interface FieldDependency {
  fieldId: string;
  fieldName: string;
  dependsOn: string[];
  affectedBy: string[];
}

export const VoiceFormDependencyGraph: React.FC<VoiceFormDependencyGraphProps> = ({ fields }) => {
  const dependencies = useMemo(() => {
    const deps: FieldDependency[] = fields.map(field => ({
      fieldId: field.id,
      fieldName: field.label,
      dependsOn: [],
      affectedBy: [],
    }));

    // Build dependency relationships
    fields.forEach((field, fieldIndex) => {
      if (field.conditionalRules && field.conditionalRules.length > 0) {
        field.conditionalRules.forEach(rule => {
          const sourceFieldId = rule.if.fieldId;
          const targetFieldId = field.id;

          // This field depends on sourceField
          const targetDep = deps.find(d => d.fieldId === targetFieldId);
          if (targetDep && !targetDep.dependsOn.includes(sourceFieldId)) {
            targetDep.dependsOn.push(sourceFieldId);
          }

          // sourceField affects this field
          const sourceDep = deps.find(d => d.fieldId === sourceFieldId);
          if (sourceDep && !sourceDep.affectedBy.includes(targetFieldId)) {
            sourceDep.affectedBy.push(targetFieldId);
          }
        });
      }
    });

    return deps;
  }, [fields]);

  const hasAnyDependencies = dependencies.some(
    d => d.dependsOn.length > 0 || d.affectedBy.length > 0
  );

  const getFieldName = (fieldId: string) => {
    return fields.find(f => f.id === fieldId)?.label || 'Unknown';
  };

  if (!hasAnyDependencies) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Field Dependencies
          </CardTitle>
          <CardDescription>
            No conditional dependencies configured yet
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Field Dependencies
        </CardTitle>
        <CardDescription>
          Visual map of how fields affect each other
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {dependencies
          .filter(d => d.dependsOn.length > 0 || d.affectedBy.length > 0)
          .map((dep) => (
            <div key={dep.fieldId} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="font-mono">
                  {dep.fieldName}
                </Badge>
              </div>

              {dep.dependsOn.length > 0 && (
                <div className="ml-4 pl-4 border-l-2 border-primary/20 space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">
                    Depends on:
                  </div>
                  {dep.dependsOn.map((sourceId) => (
                    <div key={sourceId} className="flex items-center gap-2 text-sm">
                      <ArrowRight className="h-3 w-3 text-primary" />
                      <span className="text-muted-foreground">
                        {getFieldName(sourceId)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {dep.affectedBy.length > 0 && (
                <div className="ml-4 pl-4 border-l-2 border-secondary/20 space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">
                    Controls:
                  </div>
                  {dep.affectedBy.map((targetId) => (
                    <div key={targetId} className="flex items-center gap-2 text-sm">
                      <ArrowRight className="h-3 w-3 text-secondary" />
                      <span className="text-muted-foreground">
                        {getFieldName(targetId)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </CardContent>
    </Card>
  );
};
