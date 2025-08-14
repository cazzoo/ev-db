import React, { useState } from 'react';
import { Vehicle } from '../../services/api';
import MultiStepContributionForm from '../MultiStepContributionForm';

/**
 * Example component demonstrating different usage patterns
 * of the MultiStepContributionForm component.
 * 
 * This is for documentation and testing purposes.
 */

const MultiStepFormExamples: React.FC = () => {
  const [activeExample, setActiveExample] = useState<string | null>(null);

  // Example handlers
  const handleSubmit = (vehicleData: Vehicle, changeType: 'NEW' | 'UPDATE', targetVehicleId?: number) => {
    console.log('Form submitted:', { vehicleData, changeType, targetVehicleId });
    alert('Form submitted successfully! Check console for details.');
    setActiveExample(null);
  };

  const handleCancel = () => {
    console.log('Form cancelled');
    setActiveExample(null);
  };

  // Example data sets
  const teslaModel3Data: Partial<Vehicle> = {
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    batteryCapacity: 75,
    range: 500,
    chargingSpeed: 250
  };

  const bmwI4Data: Partial<Vehicle> = {
    make: 'BMW',
    model: 'i4',
    year: 2024,
    batteryCapacity: 80.7,
    range: 520,
    chargingSpeed: 200,
    acceleration: 5.7,
    topSpeed: 225,
    price: 55000
  };

  if (activeExample) {
    return (
      <div className="min-h-screen bg-base-200 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-4">
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => setActiveExample(null)}
            >
              ← Back to Examples
            </button>
          </div>

          {activeExample === 'new' && (
            <MultiStepContributionForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          )}

          {activeExample === 'edit' && (
            <MultiStepContributionForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              initialData={teslaModel3Data}
              initialChangeType="UPDATE"
              initialTargetVehicleId={123}
            />
          )}

          {activeExample === 'variant' && (
            <MultiStepContributionForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              initialData={bmwI4Data}
              isVariantMode={true}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Multi-Step Form Examples</h1>
          <p className="text-lg opacity-70">
            Interactive examples demonstrating different usage patterns of the MultiStepContributionForm component.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* New Contribution Example */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">New Contribution</h2>
              <p className="text-sm opacity-70 mb-4">
                Start with a blank form to submit a completely new vehicle entry.
              </p>
              
              <div className="space-y-2 text-sm">
                <div><strong>Use case:</strong> Adding a new vehicle to the database</div>
                <div><strong>Initial data:</strong> None</div>
                <div><strong>Change type:</strong> NEW</div>
                <div><strong>Features:</strong> Full validation, duplicate checking</div>
              </div>

              <div className="card-actions justify-end mt-4">
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveExample('new')}
                >
                  Try Example
                </button>
              </div>
            </div>
          </div>

          {/* Edit Existing Example */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Edit Existing</h2>
              <p className="text-sm opacity-70 mb-4">
                Pre-populate the form with existing vehicle data for updates.
              </p>
              
              <div className="space-y-2 text-sm">
                <div><strong>Use case:</strong> Updating existing vehicle information</div>
                <div><strong>Initial data:</strong> Tesla Model 3 (2023)</div>
                <div><strong>Change type:</strong> UPDATE</div>
                <div><strong>Features:</strong> Pre-filled fields, update validation</div>
              </div>

              <div className="card-actions justify-end mt-4">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveExample('edit')}
                >
                  Try Example
                </button>
              </div>
            </div>
          </div>

          {/* Variant Creation Example */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Create Variant</h2>
              <p className="text-sm opacity-70 mb-4">
                Create a variant of an existing vehicle with different specifications.
              </p>
              
              <div className="space-y-2 text-sm">
                <div><strong>Use case:</strong> Adding trim levels or variants</div>
                <div><strong>Initial data:</strong> BMW i4 (2024)</div>
                <div><strong>Change type:</strong> NEW</div>
                <div><strong>Features:</strong> Variant mode, duplicate tolerance</div>
              </div>

              <div className="card-actions justify-end mt-4">
                <button 
                  className="btn btn-accent btn-sm"
                  onClick={() => setActiveExample('variant')}
                >
                  Try Example
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="card bg-base-100 shadow-xl mt-8">
          <div className="card-body">
            <h2 className="card-title">Technical Implementation</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h3 className="font-semibold mb-2">Component Props</h3>
                <div className="mockup-code text-xs">
                  <pre data-prefix="interface"><code>MultiStepContributionFormProps {`{`}</code></pre>
                  <pre data-prefix="  "><code>onSubmit: (data, type, id?) =&gt; void;</code></pre>
                  <pre data-prefix="  "><code>onCancel: () =&gt; void;</code></pre>
                  <pre data-prefix="  "><code>initialData?: Partial&lt;Vehicle&gt;;</code></pre>
                  <pre data-prefix="  "><code>initialChangeType?: 'NEW' | 'UPDATE';</code></pre>
                  <pre data-prefix="  "><code>initialTargetVehicleId?: number;</code></pre>
                  <pre data-prefix="  "><code>isVariantMode?: boolean;</code></pre>
                  <pre data-prefix="}">{}</pre>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Form Steps</h3>
                <ul className="steps steps-vertical">
                  <li className="step step-primary">
                    <div className="text-left">
                      <div className="font-medium">Basic Info</div>
                      <div className="text-xs opacity-70">Make, Model, Year</div>
                    </div>
                  </li>
                  <li className="step step-primary">
                    <div className="text-left">
                      <div className="font-medium">Performance</div>
                      <div className="text-xs opacity-70">Battery, Range, Charging</div>
                    </div>
                  </li>
                  <li className="step step-primary">
                    <div className="text-left">
                      <div className="font-medium">Details</div>
                      <div className="text-xs opacity-70">Speed, Price, Description</div>
                    </div>
                  </li>
                  <li className="step step-primary">
                    <div className="text-left">
                      <div className="font-medium">Review</div>
                      <div className="text-xs opacity-70">Confirm & Submit</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="alert alert-info mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <h4 className="font-semibold">Development Note</h4>
                <p className="text-sm">
                  This examples component is for development and documentation purposes. 
                  In production, use the MultiStepContributionForm directly in your pages.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiStepFormExamples;
