import React, { useState, useEffect, useRef } from 'react';
import { searchCustomFields, CustomFieldSuggestion } from '../services/api';

interface CustomFieldSelectorProps {
  onFieldSelect: (field: CustomFieldSuggestion) => void;
  excludeFields?: string[]; // Field keys to exclude from suggestions
  className?: string;
}

export const CustomFieldSelector: React.FC<CustomFieldSelectorProps> = ({
  onFieldSelect,
  excludeFields = [],
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CustomFieldSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await searchCustomFields(query, 10);
        const filteredSuggestions = response.results.filter(
          field => !excludeFields.includes(field.key)
        );
        setSuggestions(filteredSuggestions);
        // Always show dropdown when there's a query (for existing suggestions or create new option)
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error searching custom fields:', error);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, excludeFields]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleFieldSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleFieldSelect = (field: CustomFieldSuggestion) => {
    onFieldSelect(field);
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleCreateNewField = () => {
    if (!query.trim()) return;

    // Generate consistent field key (matches backend logic)
    const generateFieldKey = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    };

    // Create a new field suggestion with default values
    const newField: CustomFieldSuggestion = {
      id: -1, // Temporary ID for new fields
      name: query.trim(),
      key: generateFieldKey(query.trim()),
      fieldType: 'TEXT',
      usageCount: 0,
      validationRules: null
    };

    handleFieldSelect(newField);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} style={{ zIndex: 1 }}>
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-medium">Add Custom Field</span>
        </label>

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="input input-bordered w-full pr-10"
            placeholder="Search or create custom field..."
          />

          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <span className="loading loading-spinner loading-sm"></span>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-[9999] w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          style={{ top: '100%', left: 0, right: 0 }}
        >
          {suggestions.map((field, index) => (
            <button
              key={field.id}
              type="button"
              onClick={() => handleFieldSelect(field)}
              className={`w-full px-4 py-3 text-left hover:bg-base-200 border-b border-base-200 last:border-b-0 ${
                index === selectedIndex ? 'bg-primary/10' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{field.name}</div>
                  <div className="text-sm text-base-content/70">
                    {field.fieldType} • Used {field.usageCount} times
                  </div>
                </div>
                <div className="badge badge-outline badge-sm">
                  {field.fieldType}
                </div>
              </div>
            </button>
          ))}

          {/* Create new field option */}
          {query.trim() && !suggestions.some(s => s.name.toLowerCase() === query.toLowerCase()) && (
            <button
              type="button"
              onClick={handleCreateNewField}
              className={`w-full px-4 py-3 text-left hover:bg-base-200 border-t border-base-300 ${
                selectedIndex === suggestions.length ? 'bg-primary/10' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <div>
                  <div className="font-medium text-primary">Create "{query}"</div>
                  <div className="text-sm text-base-content/70">
                    Add as new custom field
                  </div>
                </div>
              </div>
            </button>
          )}

          {suggestions.length === 0 && !isLoading && query.trim() && (
            <div className="px-4 py-3 text-center text-base-content/70">
              No existing fields found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
