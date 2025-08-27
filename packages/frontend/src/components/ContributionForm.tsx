import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Vehicle, fetchVehicles, fetchVehicleSuggestions, fetchModelsForMake, VehicleSuggestions, checkForDuplicate, DuplicateCheckResult } from '../services/api';
import { AutocompleteInput } from './AutocompleteInput';

interface ContributionFormProps {
  onSubmit: (vehicleData: Vehicle, changeType: 'NEW' | 'UPDATE', targetVehicleId?: number) => void;
  onCancel: () => void;
  initialData?: Partial<Vehicle>;
  initialChangeType?: 'NEW' | 'UPDATE';
  initialTargetVehicleId?: number;
  isVariantMode?: boolean; // New prop to indicate variant creation
}

const ContributionForm: React.FC<ContributionFormProps> = ({ onSubmit, onCancel, initialData, initialChangeType, initialTargetVehicleId, isVariantMode = false }) => {
  const [make, setMake] = useState(initialData?.make || '');
  const [model, setModel] = useState(initialData?.model || '');
  const [year, setYear] = useState(initialData?.year || new Date().getFullYear());
  const [batteryCapacity, setBatteryCapacity] = useState(initialData?.batteryCapacity || 0);
  const [range, setRange] = useState(initialData?.range || 0);
  const [chargingSpeed, setChargingSpeed] = useState(initialData?.chargingSpeed || 0);
  const [description, setDescription] = useState(initialData?.description || '');
  const [changeType, setChangeType] = useState<'NEW' | 'UPDATE'>(initialChangeType || 'NEW');
  const [targetVehicleId, setTargetVehicleId] = useState<number | undefined>(initialTargetVehicleId);
  const [existingVehicles, setExistingVehicles] = useState<Vehicle[]>([]);
  const [suggestions, setSuggestions] = useState<VehicleSuggestions>({ makes: [], models: [], modelsByMake: {} });
  const [modelsForCurrentMake, setModelsForCurrentMake] = useState<string[]>([]);

  // Real-time duplicate detection state
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const duplicateCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastCheckTrigger, setLastCheckTrigger] = useState<'typing' | 'blur' | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [vehicles, vehicleSuggestions] = await Promise.all([
          fetchVehicles(),
          fetchVehicleSuggestions()
        ]);
        setExistingVehicles(vehicles);
        setSuggestions(vehicleSuggestions);
      } catch (err) {
        console.error("Failed to fetch data for contribution form", err);
      }
    };
    load();
  }, []);

  // Load models when make changes
  useEffect(() => {
    const loadModels = async () => {
      if (make.trim()) {
        try {
          const models = await fetchModelsForMake(make.trim());
          setModelsForCurrentMake(models);
        } catch (err) {
          console.error("Failed to fetch models for make", err);
          // Fallback to suggestions from cache
          setModelsForCurrentMake(suggestions.modelsByMake[make] || []);
        }
      } else {
        setModelsForCurrentMake([]);
      }
    };
    loadModels();
  }, [make, suggestions.modelsByMake]);

  // Auto-populate form when target vehicle is selected in UPDATE mode
  useEffect(() => {
    if (changeType === 'UPDATE' && targetVehicleId && !initialTargetVehicleId) {
      const selectedVehicle = existingVehicles.find(v => v.id === targetVehicleId);
      if (selectedVehicle) {
        setMake(selectedVehicle.make);
        setModel(selectedVehicle.model);
        setYear(selectedVehicle.year);
        setBatteryCapacity(selectedVehicle.batteryCapacity || 0);
        setRange(selectedVehicle.range || 0);
        setChargingSpeed(selectedVehicle.chargingSpeed || 0);
        setDescription(selectedVehicle.description || '');
      }
    }
  }, [targetVehicleId, existingVehicles, changeType, initialTargetVehicleId]);

  // Immediate duplicate checking function (for focus out events)
  const checkForDuplicateImmediate = useCallback(async (vehicleData: Partial<Vehicle>) => {
    // Only check for NEW contributions, not updates
    if (changeType === 'UPDATE') {
      setDuplicateCheck(null);
      return;
    }

    if (!vehicleData.make || !vehicleData.model || !vehicleData.year) {
      setDuplicateCheck(null);
      return;
    }

    setIsCheckingDuplicate(true);
    setLastCheckTrigger('blur');
    try {
      const result = await checkForDuplicate(vehicleData);
      setDuplicateCheck(result);
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      setDuplicateCheck(null);
    } finally {
      setIsCheckingDuplicate(false);
    }
  }, [changeType]);

  // Debounced duplicate checking function (for typing events)
  const checkForDuplicateDebounced = useCallback(async (vehicleData: Partial<Vehicle>) => {
    // Only check for NEW contributions, not updates
    if (changeType === 'UPDATE') {
      setDuplicateCheck(null);
      return;
    }

    // Clear previous timeout
    if (duplicateCheckTimeoutRef.current) {
      clearTimeout(duplicateCheckTimeoutRef.current);
    }

    // Set new timeout for 3-second debounced checking
    const timeout = setTimeout(async () => {
      if (!vehicleData.make || !vehicleData.model || !vehicleData.year) {
        setDuplicateCheck(null);
        return;
      }

      setIsCheckingDuplicate(true);
      setLastCheckTrigger('typing');
      try {
        const result = await checkForDuplicate(vehicleData);
        setDuplicateCheck(result);
      } catch (error) {
        console.error('Error checking for duplicates:', error);
        setDuplicateCheck(null);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 3000); // 3 second debounce as requested

    duplicateCheckTimeoutRef.current = timeout;
  }, [changeType]);

  // Handle focus out events for immediate duplicate checking
  const handleFieldBlur = useCallback(() => {
    // Clear any pending debounced check since we're doing immediate check
    if (duplicateCheckTimeoutRef.current) {
      clearTimeout(duplicateCheckTimeoutRef.current);
      duplicateCheckTimeoutRef.current = null;
    }

    const vehicleData = {
      make,
      model,
      year,
      batteryCapacity: batteryCapacity || undefined,
      range: range || undefined,
      chargingSpeed: chargingSpeed || undefined,
      description: description || undefined
    };

    if (vehicleData.make && vehicleData.model && vehicleData.year) {
      checkForDuplicateImmediate(vehicleData);
    }
  }, [make, model, year, batteryCapacity, range, chargingSpeed, description, checkForDuplicateImmediate]);

  // Trigger duplicate check when key fields change (for typing with 3s debounce)
  useEffect(() => {
    // Only check for NEW contributions, not updates
    if (changeType === 'UPDATE') {
      setDuplicateCheck(null);
      return;
    }

    const vehicleData = {
      make,
      model,
      year,
      batteryCapacity: batteryCapacity || undefined,
      range: range || undefined,
      chargingSpeed: chargingSpeed || undefined,
      description: description || undefined
    };

    if (vehicleData.make && vehicleData.model && vehicleData.year) {
      checkForDuplicateDebounced(vehicleData);
    } else {
      setDuplicateCheck(null);
    }
  }, [make, model, year, batteryCapacity, range, chargingSpeed, changeType, checkForDuplicateDebounced]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (duplicateCheckTimeoutRef.current) {
        clearTimeout(duplicateCheckTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      make,
      model,
      year,
      batteryCapacity: batteryCapacity || undefined,
      range: range || undefined,
      chargingSpeed: chargingSpeed || undefined,
      description: description || undefined,
    }, changeType, targetVehicleId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Variant mode indicator */}
      {isVariantMode && (
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <span>Creating a variant of an existing vehicle. Please specify different specifications or trim details.</span>
            <div className="text-xs mt-1 opacity-75">💡 Duplicate checking: 3s after typing stops or immediately when you leave a field</div>
          </div>
        </div>
      )}

      {/* Duplicate checking info for new vehicles */}
      {!isVariantMode && changeType === 'NEW' && (
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <span>We'll automatically check for duplicate vehicles as you type.</span>
            <div className="text-xs mt-1 opacity-75">💡 Checks happen 3 seconds after you stop typing or when you leave a field</div>
          </div>
        </div>
      )}

      {/* Real-time duplicate detection warning */}
      {duplicateCheck?.isDuplicate && changeType === 'NEW' && (
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold">Potential Duplicate Detected</h3>
              {lastCheckTrigger && (
                <div className="badge badge-outline badge-xs">
                  {lastCheckTrigger === 'blur' ? 'Focus out check' : '3s typing check'}
                </div>
              )}
            </div>
            <div className="text-sm mb-3">{duplicateCheck.message}</div>

            {duplicateCheck.existingVehicle && (
              <div className="bg-base-100 p-3 rounded-lg mb-3">
                <div className="font-semibold text-sm mb-2">Existing Vehicle Found:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">Vehicle:</span> {duplicateCheck.existingVehicle.year} {duplicateCheck.existingVehicle.make} {duplicateCheck.existingVehicle.model}</div>
                  {duplicateCheck.existingVehicle.batteryCapacity && (
                    <div><span className="font-medium">Battery:</span> {duplicateCheck.existingVehicle.batteryCapacity} kWh</div>
                  )}
                  {duplicateCheck.existingVehicle.range && (
                    <div><span className="font-medium">Range:</span> {duplicateCheck.existingVehicle.range} km</div>
                  )}
                  {duplicateCheck.existingVehicle.chargingSpeed && (
                    <div><span className="font-medium">Charging:</span> {duplicateCheck.existingVehicle.chargingSpeed} kW</div>
                  )}
                </div>
                {duplicateCheck.existingVehicle.description && (
                  <div className="text-sm mt-2">
                    <span className="font-medium">Description:</span> {duplicateCheck.existingVehicle.description}
                  </div>
                )}
              </div>
            )}

            {duplicateCheck.suggestions && duplicateCheck.suggestions.length > 0 && (
              <div className="bg-info bg-opacity-10 p-3 rounded-lg">
                <div className="font-semibold text-sm mb-2">💡 Suggestions to make this a unique variant:</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {duplicateCheck.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success message when no duplicates found */}
      {duplicateCheck && !duplicateCheck.isDuplicate && changeType === 'NEW' && (
        <div className="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div className="flex items-center gap-2">
            <span>✅ No duplicates found - this appears to be a unique vehicle!</span>
            {lastCheckTrigger && (
              <div className="badge badge-outline badge-xs">
                {lastCheckTrigger === 'blur' ? 'Focus out check' : '3s typing check'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading indicator for duplicate checking */}
      {isCheckingDuplicate && (
        <div className="alert alert-info">
          <span className="loading loading-spinner loading-sm"></span>
          <div>
            <span>Checking for duplicates...</span>
            {lastCheckTrigger === 'blur' && (
              <div className="text-xs mt-1 opacity-75">Triggered by field focus out</div>
            )}
            {lastCheckTrigger === 'typing' && (
              <div className="text-xs mt-1 opacity-75">Triggered by typing (3s delay)</div>
            )}
          </div>
        </div>
      )}
      {!initialChangeType && (
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Change Type</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={changeType}
            onChange={(e) => setChangeType(e.target.value as 'NEW' | 'UPDATE')}
          >
            <option value="NEW">Add new vehicle</option>
            <option value="UPDATE">Update existing vehicle</option>
          </select>
        </div>
      )}

      {/* Target Vehicle Selection for UPDATE mode */}
      {changeType === 'UPDATE' && !initialTargetVehicleId && (
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Select Vehicle to Update</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={targetVehicleId || ''}
            onChange={(e) => setTargetVehicleId(e.target.value ? Number(e.target.value) : undefined)}
            required
          >
            <option value="">Choose a vehicle to update...</option>
            {existingVehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.year} {vehicle.make} {vehicle.model}
                {vehicle.batteryCapacity ? ` (${vehicle.batteryCapacity}kWh)` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Show selected vehicle info for UPDATE mode */}
      {changeType === 'UPDATE' && (initialTargetVehicleId || targetVehicleId) && (
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <span>Updating existing vehicle. Modify the fields below to propose changes.</span>
          </div>
        </div>
      )}

      <AutocompleteInput
        label="Make"
        value={make}
        onChange={setMake}
        onBlur={handleFieldBlur}
        suggestions={suggestions.makes}
        placeholder="Enter vehicle make (e.g., Tesla, BMW, Audi)"
        required
        className="w-full"
      />

      <AutocompleteInput
        label="Model"
        value={model}
        onChange={setModel}
        onBlur={handleFieldBlur}
        suggestions={modelsForCurrentMake.length > 0 ? modelsForCurrentMake : suggestions.models}
        placeholder="Enter vehicle model (e.g., Model 3, i4, e-tron)"
        required
        className="w-full"
      />
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Year</span>
        </label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          onBlur={handleFieldBlur}
          required
        />
      </div>
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Battery Capacity (kWh)</span>
        </label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={batteryCapacity}
          onChange={(e) => setBatteryCapacity(Number(e.target.value))}
          onBlur={handleFieldBlur}
        />
      </div>
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Range (km)</span>
        </label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
          onBlur={handleFieldBlur}
        />
      </div>
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Charging Speed (kW)</span>
        </label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={chargingSpeed}
          onChange={(e) => setChargingSpeed(Number(e.target.value))}
          onBlur={handleFieldBlur}
        />
      </div>
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Description</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleFieldBlur}
          placeholder="Add specifications, trims, market notes, etc."
        />
      </div>
      <div className="flex gap-2 mt-6">
        <button
          type="submit"
          className={`btn btn-primary ${duplicateCheck?.isDuplicate && changeType === 'NEW' ? 'btn-warning' : ''}`}
          disabled={isCheckingDuplicate}
        >
          {isCheckingDuplicate ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Checking...
            </>
          ) : duplicateCheck?.isDuplicate && changeType === 'NEW' ? (
            isVariantMode ? 'Submit Variant Anyway' : 'Submit Despite Duplicate'
          ) : (
            isVariantMode ? 'Submit Variant' : 'Submit Contribution'
          )}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ContributionForm;
