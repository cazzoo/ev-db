import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Vehicle, fetchVehicleSuggestions, VehicleSuggestions, checkForDuplicate, DuplicateCheckResult } from '../services/api';
import { AutocompleteInput } from './AutocompleteInput';
import { CustomFieldsList } from './CustomFieldsList';
import { Form, Input, Textarea, Button } from '../design-system';

interface ImageWithMetadata {
  file: File;
  caption: string;
  altText: string;
}

interface MultiStepContributionFormProps {
  onSubmit: (vehicleData: Vehicle, changeType: 'NEW' | 'UPDATE', targetVehicleId?: number, images?: ImageWithMetadata[]) => void;
  onCancel: () => void;
  initialData?: Partial<Vehicle>;
  initialChangeType?: 'NEW' | 'UPDATE';
  initialTargetVehicleId?: number;
  isVariantMode?: boolean;
  isAdmin?: boolean;
}

interface FormData {
  make: string;
  model: string;
  year: number;
  batteryCapacity: number;
  range: number;
  chargingSpeed: number;
  acceleration: number;
  topSpeed: number;
  price: number;
  description: string;
  images: ImageWithMetadata[];
  customFields: Record<string, any>;
}

interface StepValidation {
  isValid: boolean;
  errors: string[];
}

const STEPS = [
  { id: 1, title: 'Basic Info', description: 'Vehicle identification' },
  { id: 2, title: 'Performance', description: 'Technical specifications' },
  { id: 3, title: 'Details', description: 'Additional information' },
  { id: 4, title: 'Images', description: 'Upload vehicle photos' },
  { id: 5, title: 'Review', description: 'Confirm submission' }
];

const MultiStepContributionForm: React.FC<MultiStepContributionFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  initialChangeType,
  initialTargetVehicleId,
  isVariantMode = false
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    make: initialData?.make || '',
    model: initialData?.model || '',
    year: initialData?.year || new Date().getFullYear(),
    batteryCapacity: initialData?.batteryCapacity || 0,
    range: initialData?.range || 0,
    chargingSpeed: initialData?.chargingSpeed || 0,
    acceleration: initialData?.acceleration || 0,
    topSpeed: initialData?.topSpeed || 0,
    price: initialData?.price || 0,
    description: initialData?.description || '',
    images: [],
    customFields: initialData?.customFields || {}
  });

  // Autocomplete and validation state
  const [suggestions, setSuggestions] = useState<VehicleSuggestions>({ makes: [], models: [], modelsByMake: {} });
  const [changeType] = useState<'NEW' | 'UPDATE'>(initialChangeType || 'NEW');
  const [targetVehicleId] = useState<number | undefined>(initialTargetVehicleId);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const duplicateCheckTimeoutRef = useRef<number | null>(null);

  // Load suggestions on mount
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const data = await fetchVehicleSuggestions();
        setSuggestions(data);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
      }
    };
    loadSuggestions();
  }, []);

  // Update form data
  const updateFormData = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle image uploads
  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).slice(0, 5 - formData.images.length); // Limit to 5 total
    const newImages: ImageWithMetadata[] = newFiles.map(file => ({
      file,
      caption: '',
      altText: ''
    }));

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  }, [formData.images.length]);

  const removeImage = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  }, []);

  // Handle image metadata updates
  const updateImageMetadata = useCallback((index: number, field: 'caption' | 'altText', value: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) =>
        i === index ? { ...img, [field]: value } : img
      )
    }));
  }, []);

  // Validate current step
  const validateStep = useCallback((step: number): StepValidation => {
    const errors: string[] = [];

    switch (step) {
      case 1: // Basic Info
        if (!formData.make.trim()) errors.push('Make is required');
        if (!formData.model.trim()) errors.push('Model is required');
        if (!formData.year || formData.year < 1990 || formData.year > new Date().getFullYear() + 2) {
          errors.push('Valid year is required');
        }
        break;
      case 2: // Performance - all optional but should be positive if provided
        if (formData.batteryCapacity < 0) errors.push('Battery capacity cannot be negative');
        if (formData.range < 0) errors.push('Range cannot be negative');
        if (formData.chargingSpeed < 0) errors.push('Charging speed cannot be negative');
        break;
      case 3: // Details - all optional but should be positive if provided
        if (formData.acceleration < 0) errors.push('Acceleration cannot be negative');
        if (formData.topSpeed < 0) errors.push('Top speed cannot be negative');
        if (formData.price < 0) errors.push('Price cannot be negative');
        break;
      case 4: // Images - optional but validate file types and metadata if provided
        if (formData.images.length > 0) {
          const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
          const maxSize = 10 * 1024 * 1024; // 10MB
          for (let i = 0; i < formData.images.length; i++) {
            const imageData = formData.images[i];
            const file = imageData.file;

            if (!validTypes.includes(file.type)) {
              errors.push(`${file.name}: Only JPEG, PNG, and WebP images are allowed`);
            }
            if (file.size > maxSize) {
              errors.push(`${file.name}: File size must be less than 10MB`);
            }
            if (!imageData.altText.trim()) {
              errors.push(`${file.name}: Alt text is required for accessibility`);
            }
          }
          if (formData.images.length > 5) {
            errors.push('Maximum 5 images allowed');
          }
        }
        break;
    }

    return { isValid: errors.length === 0, errors };
  }, [formData]);

  // Handle step navigation
  const goToStep = useCallback((step: number) => {
    if (step < currentStep || validateStep(currentStep).isValid) {
      setCurrentStep(step);
    }
  }, [currentStep, validateStep]);

  const nextStep = useCallback(() => {
    const validation = validateStep(currentStep);
    if (validation.isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Handle duplicate checking
  const performDuplicateCheck = useCallback(async () => {
    if (!formData.make || !formData.model || !formData.year) return;

    setIsCheckingDuplicate(true);
    try {
      const result = await checkForDuplicate({
        make: formData.make,
        model: formData.model,
        year: formData.year,
        batteryCapacity: formData.batteryCapacity || undefined,
        range: formData.range || undefined,
        chargingSpeed: formData.chargingSpeed || undefined,
        description: formData.description || undefined
      });
      setDuplicateCheck(result);
    } catch (error) {
      console.error('Duplicate check failed:', error);
    } finally {
      setIsCheckingDuplicate(false);
    }
  }, [formData]);

  // Debounced duplicate check
  useEffect(() => {
    if (duplicateCheckTimeoutRef.current) {
      clearTimeout(duplicateCheckTimeoutRef.current);
    }

    duplicateCheckTimeoutRef.current = setTimeout(() => {
      if (formData.make && formData.model && formData.year) {
        performDuplicateCheck();
      }
    }, 1000);

    return () => {
      if (duplicateCheckTimeoutRef.current) {
        clearTimeout(duplicateCheckTimeoutRef.current);
      }
    };
  }, [formData.make, formData.model, formData.year, performDuplicateCheck]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    const finalValidation = validateStep(currentStep);
    if (!finalValidation.isValid) return;

    const vehicleData: Vehicle = {
      make: formData.make,
      model: formData.model,
      year: formData.year,
      batteryCapacity: formData.batteryCapacity || undefined,
      range: formData.range || undefined,
      chargingSpeed: formData.chargingSpeed || undefined,
      acceleration: formData.acceleration || undefined,
      topSpeed: formData.topSpeed || undefined,
      price: formData.price || undefined,
      description: formData.description || undefined,
      customFields: Object.keys(formData.customFields).length > 0 ? formData.customFields : undefined
    };

    onSubmit(vehicleData, changeType, targetVehicleId, formData.images);
  }, [formData, changeType, targetVehicleId, onSubmit, validateStep, currentStep]);

  const currentValidation = validateStep(currentStep);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Steps indicator */}
      <div className="mb-4">
        <ul className="steps steps-horizontal w-full">
          {STEPS.map((step) => (
            <li
              key={step.id}
              className={`step ${step.id <= currentStep ? 'step-primary' : ''} ${
                step.id < currentStep ? 'cursor-pointer' : ''
              }`}
              onClick={() => step.id < currentStep && goToStep(step.id)}
            >
              <div className="text-center">
                <div className="font-medium text-sm sm:text-base">{step.title}</div>
                <div className="text-xs opacity-70 hidden sm:block">{step.description}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Navigation buttons - Fixed position after steps indicator */}
      <div className="card bg-base-100 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              {currentStep > 1 && (
                <Button variant="secondary" size="sm" onClick={prevStep}>
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {currentStep < STEPS.length ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={nextStep}
                  disabled={!currentValidation.isValid}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!currentValidation.isValid || isCheckingDuplicate}
                  loading={isCheckingDuplicate}
                >
                  {isCheckingDuplicate ? 'Checking...' : 'Submit'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Update/Variant mode indicator */}
      {(isVariantMode || initialChangeType === 'UPDATE') && (
        <div className={`alert mb-4 py-3 ${isVariantMode ? 'alert-info' : 'alert-warning'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div className="text-sm">
            {isVariantMode ? (
              <span>Creating variant - specify different specifications or trim details</span>
            ) : (
              <span>Proposing update - modify the fields you want to change</span>
            )}
          </div>
        </div>
      )}

      {/* Form content */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body py-4 px-4 sm:py-6 sm:px-6">
          <Form spacing="sm">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <>
                <AutocompleteInput
                  label="Make"
                  value={formData.make}
                  onChange={(value) => updateFormData('make', value)}
                  suggestions={suggestions.makes}
                  placeholder="e.g., Tesla, BMW, Nissan"
                  required
                />

                <AutocompleteInput
                  label="Model"
                  value={formData.model}
                  onChange={(value) => updateFormData('model', value)}
                  suggestions={suggestions.modelsByMake[formData.make] || []}
                  placeholder="e.g., Model 3, i4, Leaf"
                  required
                />

                <Input
                  label="Year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => updateFormData('year', parseInt(e.target.value) || new Date().getFullYear())}
                  min={1990}
                  max={new Date().getFullYear() + 2}
                  required
                />
              </>
            )}

            {/* Step 2: Performance */}
            {currentStep === 2 && (
              <>
                <Input
                  label="Battery Capacity (kWh)"
                  type="number"
                  value={formData.batteryCapacity || ''}
                  onChange={(e) => updateFormData('batteryCapacity', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 75"
                  min={0}
                  step={0.1}
                  helperText="Optional - Battery capacity in kilowatt-hours"
                />

                <Input
                  label="Range (km)"
                  type="number"
                  value={formData.range || ''}
                  onChange={(e) => updateFormData('range', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 500"
                  min={0}
                  helperText="Optional - WLTP/EPA range in kilometers"
                />

                <Input
                  label="Charging Speed (kW)"
                  type="number"
                  value={formData.chargingSpeed || ''}
                  onChange={(e) => updateFormData('chargingSpeed', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 150"
                  min={0}
                  step={0.1}
                  helperText="Optional - Maximum DC fast charging speed"
                />
              </>
            )}

            {/* Step 3: Additional Details */}
            {currentStep === 3 && (
              <>
                <Input
                  label="0-100 km/h Acceleration (seconds)"
                  type="number"
                  value={formData.acceleration || ''}
                  onChange={(e) => updateFormData('acceleration', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 5.4"
                  min={0}
                  step={0.1}
                  helperText="Optional - Time to accelerate from 0 to 100 km/h"
                />

                <Input
                  label="Top Speed (km/h)"
                  type="number"
                  value={formData.topSpeed || ''}
                  onChange={(e) => updateFormData('topSpeed', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 250"
                  min={0}
                  helperText="Optional - Maximum speed"
                />

                <Input
                  label="Starting Price (USD)"
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => updateFormData('price', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 45000"
                  min={0}
                  helperText="Optional - Base model starting price"
                />

                <Textarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Add specifications, trims, market notes, etc."
                  rows={4}
                  helperText="Optional - Additional details about the vehicle"
                />

                {/* Custom Fields Section */}
                <div className="divider">Custom Fields</div>
                <CustomFieldsList
                  customFields={formData.customFields}
                  onChange={(customFields) => updateFormData('customFields', customFields)}
                  errors={{}}
                />
              </>
            )}

            {/* Step 4: Images */}
            {currentStep === 4 && (
              <>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Upload Vehicle Images</h3>
                    <p className="text-sm text-base-content/60 mb-4">
                      Add up to 5 high-quality images of the vehicle. Images will be reviewed before being published.
                    </p>
                  </div>

                  {/* File upload area */}
                  <div className="border-2 border-dashed border-base-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                    <input
                      type="file"
                      id="image-upload"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleImageUpload(e.target.files)}
                      className="hidden"
                      disabled={formData.images.length >= 5}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`cursor-pointer ${formData.images.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="space-y-2">
                        <svg className="mx-auto h-12 w-12 text-base-content/40" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium">
                            {formData.images.length >= 5 ? 'Maximum images reached' : 'Click to upload images'}
                          </p>
                          <p className="text-xs text-base-content/60">
                            JPEG, PNG, WebP up to 10MB each
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Image previews */}
                  {formData.images.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Selected Images ({formData.images.length}/5)</h4>
                      <div className="space-y-6">
                        {formData.images.map((imageData, index) => (
                          <div key={index} className="card bg-base-100 border border-base-300">
                            <div className="card-body p-4">
                              <div className="flex gap-4">
                                {/* Image preview */}
                                <div className="relative group flex-shrink-0">
                                  <div className="w-32 h-24 bg-base-200 rounded-lg overflow-hidden">
                                    <img
                                      src={URL.createObjectURL(imageData.file)}
                                      alt={imageData.altText || `Preview ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove image"
                                  >
                                    ✕
                                  </button>
                                </div>

                                {/* Image metadata fields */}
                                <div className="flex-1 space-y-3">
                                  <div>
                                    <p className="text-sm font-medium text-base-content/70 mb-1">
                                      {imageData.file.name}
                                    </p>
                                  </div>

                                  {/* Alt text field */}
                                  <div className="form-control">
                                    <label className="label py-1">
                                      <span className="label-text text-sm font-medium">
                                        Alt Text <span className="text-error">*</span>
                                      </span>
                                    </label>
                                    <input
                                      type="text"
                                      className="input input-bordered input-sm"
                                      placeholder="Describe the image for accessibility (required)"
                                      value={imageData.altText}
                                      onChange={(e) => updateImageMetadata(index, 'altText', e.target.value)}
                                    />
                                  </div>

                                  {/* Caption field */}
                                  <div className="form-control">
                                    <label className="label py-1">
                                      <span className="label-text text-sm font-medium">Caption</span>
                                    </label>
                                    <input
                                      type="text"
                                      className="input input-bordered input-sm"
                                      placeholder="Optional caption for the image"
                                      value={imageData.caption}
                                      onChange={(e) => updateImageMetadata(index, 'caption', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="alert alert-info">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                      <p className="font-medium">Image Guidelines</p>
                      <ul className="text-sm mt-1 space-y-1">
                        <li>• High-quality photos showing different angles of the vehicle</li>
                        <li>• Clear, well-lit images without watermarks</li>
                        <li>• Images will be reviewed by moderators before publication</li>
                        <li>• You can skip this step and add images later</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Please review your submission before submitting. You can go back to edit any information.</span>
                </div>

                {/* Duplicate warning */}
                {duplicateCheck?.isDuplicate && (
                  <div className="alert alert-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h3 className="font-bold">Potential Duplicate Detected</h3>
                      <div className="text-sm">{duplicateCheck.message}</div>
                      {duplicateCheck.suggestions && duplicateCheck.suggestions.length > 0 && (
                        <div className="text-sm mt-1">
                          <strong>Suggestions:</strong> {duplicateCheck.suggestions.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Review summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="card-title text-lg">Basic Information</h3>
                      <div className="space-y-2">
                        <div><strong>Make:</strong> {formData.make}</div>
                        <div><strong>Model:</strong> {formData.model}</div>
                        <div><strong>Year:</strong> {formData.year}</div>
                      </div>
                    </div>
                  </div>

                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="card-title text-lg">Performance</h3>
                      <div className="space-y-2">
                        <div><strong>Battery:</strong> {formData.batteryCapacity ? `${formData.batteryCapacity} kWh` : 'Not specified'}</div>
                        <div><strong>Range:</strong> {formData.range ? `${formData.range} km` : 'Not specified'}</div>
                        <div><strong>Charging:</strong> {formData.chargingSpeed ? `${formData.chargingSpeed} kW` : 'Not specified'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="card-title text-lg">Additional Details</h3>
                      <div className="space-y-2">
                        <div><strong>0-100 km/h:</strong> {formData.acceleration ? `${formData.acceleration}s` : 'Not specified'}</div>
                        <div><strong>Top Speed:</strong> {formData.topSpeed ? `${formData.topSpeed} km/h` : 'Not specified'}</div>
                        <div><strong>Price:</strong> {formData.price ? `$${formData.price.toLocaleString()}` : 'Not specified'}</div>
                      </div>
                    </div>
                  </div>

                  {formData.description && (
                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h3 className="card-title text-lg">Description</h3>
                        <p className="text-sm">{formData.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Custom Fields section */}
                  {Object.keys(formData.customFields).length > 0 && (
                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h3 className="card-title text-lg">Custom Fields</h3>
                        <div className="space-y-2">
                          {Object.entries(formData.customFields).map(([key, value]) => {
                            if (value === null || value === undefined || value === '') return null;

                            const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);

                            return (
                              <div key={key}>
                                <strong>{displayName}:</strong> {displayValue}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Images section */}
                  <div className="card bg-base-200 md:col-span-2">
                    <div className="card-body">
                      <h3 className="card-title text-lg">Images ({formData.images.length})</h3>
                      {formData.images.length > 0 ? (
                        <div className="space-y-3 mt-2">
                          {formData.images.map((imageData, index) => (
                            <div key={index} className="flex gap-3 p-3 bg-base-100 rounded-lg">
                              <div className="w-20 h-16 bg-base-300 rounded overflow-hidden flex-shrink-0">
                                <img
                                  src={URL.createObjectURL(imageData.file)}
                                  alt={imageData.altText || `Preview ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{imageData.file.name}</p>
                                {imageData.altText && (
                                  <p className="text-xs text-base-content/70 mt-1">
                                    <span className="font-medium">Alt:</span> {imageData.altText}
                                  </p>
                                )}
                                {imageData.caption && (
                                  <p className="text-xs text-base-content/70 mt-1">
                                    <span className="font-medium">Caption:</span> {imageData.caption}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-base-content/60">No images selected</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Validation errors */}
            {!currentValidation.isValid && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <ul className="list-disc list-inside">
                    {currentValidation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Form>

        </div>
      </div>
    </div>
  );
};

export default MultiStepContributionForm;
