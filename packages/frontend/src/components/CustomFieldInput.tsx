import React from 'react';
import { CustomFieldSuggestion } from '../services/api';

interface CustomFieldInputProps {
  field: CustomFieldSuggestion;
  value: any;
  onChange: (value: any) => void;
  onRemove: () => void;
  onFieldTypeChange?: (fieldType: string) => void;
  error?: string;
  className?: string;
  isNewField?: boolean;
}

export const CustomFieldInput: React.FC<CustomFieldInputProps> = ({
  field,
  value,
  onChange,
  onRemove,
  onFieldTypeChange,
  error,
  className = '',
  isNewField = false
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newValue = e.target.value;

    // Convert value based on field type
    switch (field.fieldType) {
      case 'NUMBER':
        const num = parseFloat(newValue);
        onChange(isNaN(num) ? '' : num);
        break;
      case 'BOOLEAN':
        onChange(e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : newValue === 'true');
        break;
      default:
        onChange(newValue);
    }
  };

  const renderInput = () => {
    const baseClasses = `input input-bordered w-full ${error ? 'input-error' : ''}`;

    switch (field.fieldType) {
      case 'TEXT':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={handleInputChange}
            className={baseClasses}
            placeholder={`Enter ${field.name.toLowerCase()}`}
          />
        );

      case 'NUMBER':
        const validationRules = field.validationRules || {};
        return (
          <input
            type="number"
            value={value || ''}
            onChange={handleInputChange}
            className={baseClasses}
            placeholder={`Enter ${field.name.toLowerCase()}`}
            min={validationRules.min}
            max={validationRules.max}
            step={validationRules.step || 'any'}
          />
        );

      case 'DATE':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={handleInputChange}
            className={baseClasses}
          />
        );

      case 'URL':
        return (
          <input
            type="url"
            value={value || ''}
            onChange={handleInputChange}
            className={baseClasses}
            placeholder={`Enter ${field.name.toLowerCase()} URL`}
          />
        );

      case 'BOOLEAN':
        return (
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={handleInputChange}
                className="checkbox checkbox-primary"
              />
              <span className="label-text">Yes</span>
            </label>
          </div>
        );

      case 'DROPDOWN':
        const options = field.validationRules?.options || [];
        return (
          <select
            value={value || ''}
            onChange={handleInputChange}
            className={`select select-bordered w-full ${error ? 'select-error' : ''}`}
          >
            <option value="">Select {field.name.toLowerCase()}</option>
            {options.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={handleInputChange}
            className={baseClasses}
            placeholder={`Enter ${field.name.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <div className={`form-control w-full ${className}`}>
      <label className="label">
        <div className="flex items-center gap-3">
          <span className="label-text font-medium">
            {field.name}
            {field.validationRules?.required && <span className="text-error ml-1">*</span>}
          </span>

          {/* Field Type Selection/Display */}
          {isNewField && onFieldTypeChange ? (
            <select
              value={field.fieldType}
              onChange={(e) => onFieldTypeChange(e.target.value)}
              className="select select-bordered select-xs"
              title="Select field type"
            >
              <option value="TEXT">Text</option>
              <option value="NUMBER">Number</option>
              <option value="DATE">Date</option>
              <option value="DROPDOWN">Dropdown</option>
              <option value="BOOLEAN">Boolean</option>
              <option value="URL">URL</option>
            </select>
          ) : (
            <div className="badge badge-outline badge-sm" title="Field type">
              {field.fieldType}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="btn btn-ghost btn-xs text-error hover:bg-error hover:text-error-content"
          title="Remove field"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </label>

      {renderInput()}

      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}

      {field.validationRules?.description && (
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            {field.validationRules.description}
          </span>
        </label>
      )}
    </div>
  );
};
