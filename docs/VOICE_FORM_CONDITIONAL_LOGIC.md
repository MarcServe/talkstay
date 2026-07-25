# Voice Form Conditional Logic

This guide explains how to create dynamic, intelligent forms using conditional logic that shows, hides, or modifies fields based on user responses.

## Overview

Conditional logic allows you to create sophisticated form flows where fields appear, disappear, or change requirements based on previous answers. This creates more personalized experiences and reduces form fatigue by only showing relevant fields.

## Features

### Visual Rule Builder
- Drag-and-drop interface for creating rules
- No code required
- Live preview of conditions
- Rule testing and validation

### Dependency Tracking
- Visual dependency graph
- Shows which fields depend on others
- Identifies circular dependencies
- Field relationship visualization

### Supported Conditions

| Condition | Description | Use Case |
|-----------|-------------|----------|
| `equals` | Field value matches exactly | Show "Company Name" if role equals "Business" |
| `contains` | Field value contains text | Show support options if issue contains "technical" |
| `greaterThan` | Numeric/date comparison | Show senior discount if age > 65 |
| `lessThan` | Numeric/date comparison | Show youth options if age < 18 |
| `isEmpty` | Field has no value | Show reminder if email is empty |
| `isNotEmpty` | Field has a value | Show follow-up if details provided |

### Supported Actions

| Action | Description | Use Case |
|--------|-------------|----------|
| `show` | Display the field | Show shipping address if needs delivery |
| `hide` | Hide the field | Hide discount code if not eligible |
| `skip` | Skip in form flow | Skip payment if already paid |
| `require` | Make field required | Require tax ID for business accounts |
| `optional` | Make field optional | Make phone optional for email-only users |

## Creating Conditional Rules

### Basic Rule Structure

```typescript
{
  if: {
    fieldId: "account_type",
    condition: "equals",
    value: "business"
  },
  then: {
    action: "show",
    targetFieldId: "company_name"
  }
}
```

### Step-by-Step Guide

1. **Open the Form Builder**
   - Navigate to Voice Forms
   - Create or edit a form
   - Select a field

2. **Access Conditional Tab**
   - Click on the "Conditional" tab
   - View existing rules or create new ones

3. **Create a Rule**
   - Click "Add Rule"
   - Select the trigger field (IF)
   - Choose the condition
   - Enter the comparison value
   - Select the action (THEN)

4. **Test Your Rule**
   - Use the preview mode
   - Fill out the form to see rules in action
   - Verify field visibility changes

## Examples

### Example 1: Business vs Personal Account

```typescript
// Show company name field only for business accounts
{
  if: {
    fieldId: "account_type",
    condition: "equals",
    value: "business"
  },
  then: {
    action: "show",
    targetFieldId: "company_name"
  }
}

// Show tax ID field only for business accounts
{
  if: {
    fieldId: "account_type",
    condition: "equals",
    value: "business"
  },
  then: {
    action: "require",
    targetFieldId: "tax_id"
  }
}
```

### Example 2: Age-Based Options

```typescript
// Show parent consent field for minors
{
  if: {
    fieldId: "age",
    condition: "lessThan",
    value: "18"
  },
  then: {
    action: "show",
    targetFieldId: "parent_consent"
  }
}

// Show senior discount for eligible users
{
  if: {
    fieldId: "age",
    condition: "greaterThan",
    value: "65"
  },
  then: {
    action: "show",
    targetFieldId: "senior_discount_code"
  }
}
```

### Example 3: Issue Triage

```typescript
// Show technical support options if issue is technical
{
  if: {
    fieldId: "issue_type",
    condition: "contains",
    value: "technical"
  },
  then: {
    action: "show",
    targetFieldId: "technical_details"
  }
}

// Require error screenshot for bug reports
{
  if: {
    fieldId: "issue_type",
    condition: "equals",
    value: "bug"
  },
  then: {
    action: "require",
    targetFieldId: "screenshot"
  }
}
```

### Example 4: Delivery Options

```typescript
// Show shipping address if user needs delivery
{
  if: {
    fieldId: "needs_delivery",
    condition: "equals",
    value: "yes"
  },
  then: {
    action: "show",
    targetFieldId: "shipping_address"
  }
}

// Show pickup location if not delivering
{
  if: {
    fieldId: "needs_delivery",
    condition: "equals",
    value: "no"
  },
  then: {
    action: "show",
    targetFieldId: "pickup_location"
  }
}
```

## Advanced Patterns

### Multi-Step Validation

```typescript
// Step 1: Check if phone is provided
{
  if: {
    fieldId: "phone",
    condition: "isEmpty",
    value: null
  },
  then: {
    action: "require",
    targetFieldId: "email" // Email becomes required if no phone
  }
}
```

### Progressive Disclosure

```typescript
// Show more details field if initial answer needs clarification
{
  if: {
    fieldId: "symptoms",
    condition: "contains",
    value: "severe"
  },
  then: {
    action: "show",
    targetFieldId: "detailed_symptoms"
  }
}
```

## Best Practices

### 1. Field Order Matters
- Rules can only reference fields that come **before** the current field
- Plan your field order to support your conditional logic
- Group related conditional fields together

### 2. Keep Rules Simple
- One rule per condition when possible
- Use clear, descriptive field names
- Avoid deeply nested dependencies

### 3. Test Thoroughly
- Use preview mode to test all paths
- Check edge cases (empty values, exact matches)
- Verify voice prompts still make sense

### 4. Provide Fallbacks
- Don't hide critical information
- Use "optional" instead of "hide" when possible
- Consider default values for hidden fields

### 5. Document Complex Logic
- Use clear field labels
- Add descriptions for business logic
- Keep dependency graph visible while editing

## Dependency Graph

The dependency graph shows:
- **Blue arrows**: Field dependencies (what this field depends on)
- **Orange arrows**: Field controls (what fields this controls)
- **Circular dependencies**: Highlighted in red (must be fixed)

### Reading the Graph

```
Email Field
  ├─ Depends on: [None]
  └─ Controls: Confirmation Email (show if email provided)

Phone Field
  ├─ Depends on: Email (required if email empty)
  └─ Controls: SMS Opt-in (show if phone provided)
```

## Troubleshooting

### Rules Not Working?

1. **Check field order**: Conditional fields must come after trigger fields
2. **Verify condition values**: Exact match required for `equals`
3. **Test in preview**: Some rules only visible during form flow
4. **Check rule conflicts**: Multiple rules may override each other

### Circular Dependencies

If you see a circular dependency warning:
- Field A depends on Field B
- Field B depends on Field A
- This creates an infinite loop

**Solution**: Remove one of the dependencies or restructure your form logic.

## Performance Considerations

- Rules are evaluated in order
- First matching rule wins
- Keep rule count reasonable (<10 per field)
- Use simple conditions when possible

## Database Structure

Conditional rules are stored in the `conditional_rules` JSONB field:

```sql
{
  "if": {
    "fieldId": "uuid",
    "condition": "equals|contains|greaterThan|...",
    "value": "any"
  },
  "then": {
    "action": "show|hide|skip|require|optional",
    "targetFieldId": "uuid"
  }
}
```

## Next Steps

- Add automatic rule suggestions based on field types
- Implement rule templates for common patterns
- Add A/B testing for different conditional flows
- Create rule analytics to track which paths users take
