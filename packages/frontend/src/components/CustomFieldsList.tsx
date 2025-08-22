import React, { useState, useEffect } from 'react';
import { CustomFieldInput } from './CustomFieldInput';
import { CustomFieldSelector } from './CustomFieldSelector';
import { fetchCustomFieldSuggestions, CustomFieldSuggestion } from '../services/api';

interface CustomFieldsListProps {
  customFields: Record<string, any>;
  onChange: (customFields: Record<string, any>) => void;
  errors?: Record<string, string>;
  className?: string;
}

export const CustomFieldsList: React.FC<CustomFieldsListProps> = ({
  customFields,
  onChange,
  errors = {},
  className = ''
}) => {
  const [fieldDefinitions, setFieldDefinitions] = useState<Record<string, CustomFieldSuggestion>>({});
  const [suggestions, setSuggestions] = useState<CustomFieldSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  // Load popular field suggestions on mount
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const response = await fetchCustomFieldSuggestions(8);
        setSuggestions(response.suggestions);
      } catch (error) {
        console.error('Error loading custom field suggestions:', error);
        // Set empty suggestions on error so UI still works
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    loadSuggestions();
  }, []);

  const handleFieldAdd = (field: CustomFieldSuggestion) => {
    // Generate consistent field key
    const fieldKey = field.key || generateFieldKey(field.name);

    // Store field definition for later use
    setFieldDefinitions(prev => ({
      ...prev,
      [fieldKey]: { ...field, key: fieldKey }
    }));

    // Add field to custom fields with empty value
    const defaultValue = getDefaultValue(field.fieldType);
    const newCustomFields = {
      ...customFields,
      [fieldKey]: defaultValue
    };

    onChange(newCustomFields);
  };

  // Generate a consistent field key from field name (matches backend logic)
  const generateFieldKey = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  };

  const handleFieldChange = (fieldKey: string, value: any) => {
    const newCustomFields = {
      ...customFields,
      [fieldKey]: value
    };

    onChange(newCustomFields);
  };

  const handleFieldRemove = (fieldKey: string) => {
    const newCustomFields = { ...customFields };
    delete newCustomFields[fieldKey];

    // Also remove from field definitions
    setFieldDefinitions(prev => {
      const newDefs = { ...prev };
      delete newDefs[fieldKey];
      return newDefs;
    });

    onChange(newCustomFields);
  };

  const handleSuggestionClick = (field: CustomFieldSuggestion) => {
    const fieldKey = field.key || generateFieldKey(field.name);

    if (!customFields.hasOwnProperty(fieldKey)) {
      handleFieldAdd(field);
    }
  };

  const handleFieldTypeChange = (fieldKey: string, newFieldType: string) => {
    // Update the field definition with the new type
    setFieldDefinitions(prev => {
      const fieldDef = prev[fieldKey];
      if (fieldDef) {
        const updatedDef = { ...fieldDef, fieldType: newFieldType as any };

        // Reset value to default for the new type
        const defaultValue = getDefaultValue(newFieldType as any);
        const newCustomFields = {
          ...customFields,
          [fieldKey]: defaultValue
        };
        onChange(newCustomFields);

        return {
          ...prev,
          [fieldKey]: updatedDef
        };
      }
      return prev;
    });
  };

  const isNewField = (fieldKey: string): boolean => {
    const fieldDef = fieldDefinitions[fieldKey];
    // A field is considered "new" if it has a temporary ID (-1) or doesn't exist in suggestions
    return fieldDef?.id === -1 || !suggestions.some(s => s.key === fieldKey);
  };

  const getDefaultValue = (fieldType: string): any => {
    switch (fieldType) {
      case 'NUMBER':
        return '';
      case 'BOOLEAN':
        return false;
      case 'DATE':
        return '';
      default:
        return '';
    }
  };

  const getFieldDefinition = (fieldKey: string): CustomFieldSuggestion => {
    return fieldDefinitions[fieldKey] || {
      id: -1,
      name: fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      key: fieldKey,
      fieldType: 'TEXT',
      usageCount: 0,
      validationRules: null
    };
  };

  const activeFieldKeys = Object.keys(customFields);
  const availableSuggestions = suggestions.filter(
    suggestion => !activeFieldKeys.includes(suggestion.key)
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Active Custom Fields */}
      {activeFieldKeys.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Custom Fields</h3>

          <div className="space-y-4">
            {activeFieldKeys.map(fieldKey => {
              const fieldDef = getFieldDefinition(fieldKey);
              return (
                <CustomFieldInput
                  key={fieldKey}
                  field={fieldDef}
                  value={customFields[fieldKey]}
                  onChange={(value) => handleFieldChange(fieldKey, value)}
                  onRemove={() => handleFieldRemove(fieldKey)}
                  onFieldTypeChange={(fieldType) => handleFieldTypeChange(fieldKey, fieldType)}
                  error={errors[fieldKey]}
                  isNewField={isNewField(fieldKey)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Popular Field Suggestions */}
      {availableSuggestions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-medium text-base-content/80">
            Popular Fields
            {isLoadingSuggestions && (
              <span className="loading loading-spinner loading-sm ml-2"></span>
            )}
          </h4>

          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map(field => (
              <button
                key={field.id}
                type="button"
                onClick={() => handleSuggestionClick(field)}
                className="btn btn-outline btn-sm gap-2 hover:btn-primary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {field.name}
                <div className="badge badge-ghost badge-xs">
                  {field.usageCount}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Field Selector */}
      <div className="border-t border-base-300 pt-4">
        <CustomFieldSelector
          onFieldSelect={handleFieldAdd}
          excludeFields={activeFieldKeys}
        />
      </div>

      {/* Help Text */}
      {activeFieldKeys.length === 0 && (
        <div className="text-center py-8 text-base-content/60">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <p className="text-sm">
            Add custom fields to provide additional information about this vehicle.
            <br />
            You can use popular fields above or search for existing ones.
          </p>
        </div>
      )}
    </div>
  );
};
