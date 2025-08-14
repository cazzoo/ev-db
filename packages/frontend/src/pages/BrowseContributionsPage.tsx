import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DataTable, { Column } from '../components/DataTable';
import {
  fetchPendingContributions,
  fetchAllContributions,
  voteOnContribution,
  approveContribution,
  rejectContribution,
  cancelMyContribution,
  updateMyContribution,
  Contribution,
  Vehicle,
  fetchVehicles,
} from '../services/api';

// Inline editable field component (defined outside of main component to avoid re-creation)
const EditableField = ({
  contributionId,
  fieldName,
  value,
  type = 'text',
  label,
  unit = '',
  isEditable = false,
  isEditMode = false,
  getDraftValue,
  isFieldModified,
  updateDraftField,
  originalValue,
  showDiff = false
}: {
  contributionId: number;
  fieldName: string;
  value: string | number | undefined;
  type?: 'text' | 'number';
  label: string;
  unit?: string;
  isEditable?: boolean;
  isEditMode?: boolean;
  getDraftValue: (contributionId: number, fieldName: string, originalValue: string | number | undefined) => string | number | undefined;
  isFieldModified: (contributionId: number, fieldName: string) => boolean;
  updateDraftField: (contributionId: number, fieldName: string, value: string | number | undefined) => void;
  originalValue?: string | number | undefined;
  showDiff?: boolean;
}) => {
  const draftValue = getDraftValue(contributionId, fieldName, value);
  const isModified = isFieldModified(contributionId, fieldName);

  // Check if the proposed value is different from the original value (for diff highlighting)
  const isDifferentFromOriginal = showDiff && originalValue !== undefined &&
    String(value || '').trim() !== String(originalValue || '').trim();

  if (!isEditable || !isEditMode) {
    return (
      <div className="flex justify-between py-1">
        <span className="text-gray-600">{label}:</span>
        <span className={`font-medium ${isModified ? 'text-orange-600' : ''} ${isDifferentFromOriginal ? 'text-green-600 bg-green-50 px-2 py-1 rounded' : ''}`}>
          {draftValue}{unit}
          {isModified && <span className="ml-1 text-orange-500">*</span>}
          {isDifferentFromOriginal && !isModified && <span className="ml-1 text-green-500">●</span>}
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center py-1">
      <label className="text-gray-600">{label}:</label>
      <div className="flex items-center">
        <input
          type={type}
          value={draftValue || ''}
          onChange={(e) => {
            const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
            updateDraftField(contributionId, fieldName, newValue);
          }}
          className={`input input-sm w-32 ${isModified ? 'input-warning border-orange-400' : 'input-bordered'} ${isDifferentFromOriginal && !isModified ? 'input-success border-green-400' : ''}`}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
        {unit && <span className="ml-1 text-gray-500">{unit}</span>}
        {isModified && <span className="ml-1 text-orange-500">*</span>}
        {isDifferentFromOriginal && !isModified && <span className="ml-1 text-green-500">●</span>}
      </div>
    </div>
  );
};

const InlineEditableVehicleDetails = ({
  contribution,
  original,
  isEditable = false,
  isEditMode = false,
  getDraftValue,
  isFieldModified,
  updateDraftField
}: {
  contribution: Contribution;
  original: Vehicle | null;
  isEditable?: boolean;
  isEditMode?: boolean;
  getDraftValue: (contributionId: number, fieldName: string, originalValue: string | number | undefined) => string | number | undefined;
  isFieldModified: (contributionId: number, fieldName: string) => boolean;
  updateDraftField: (contributionId: number, fieldName: string, value: string | number | undefined) => void;
}) => {
  const vehicleData = contribution.vehicleData;
  const isVariant = contribution.changeType === 'NEW';

  if (!original && isVariant) {
    return (
      <div className="space-y-4">
        <div className="alert alert-info">
          <span>This is a new vehicle variant proposal</span>
        </div>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h5 className="card-title text-lg">Proposed Vehicle Data</h5>
            <div className="space-y-2">
              <EditableField contributionId={contribution.id} fieldName="make" value={vehicleData.make} label="Make" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="model" value={vehicleData.model} label="Model" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="year" value={vehicleData.year} type="number" label="Year" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="batteryCapacity" value={vehicleData.batteryCapacity} type="number" label="Battery Capacity" unit=" kWh" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="range" value={vehicleData.range} type="number" label="Range" unit=" km" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="chargingSpeed" value={vehicleData.chargingSpeed} type="number" label="Charging Speed" unit=" kW" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="acceleration" value={vehicleData.acceleration} type="number" label="0-100 km/h" unit=" s" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="topSpeed" value={vehicleData.topSpeed} type="number" label="Top Speed" unit=" km/h" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="price" value={vehicleData.price} type="number" label="Price" unit=" $" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="description" value={vehicleData.description} label="Description" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle missing target vehicle for UPDATE contributions
  if (contribution.changeType === 'UPDATE' && !original) {
    return (
      <div className="space-y-4">
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <div>
            <h3 className="font-bold">Target Vehicle Not Found</h3>
            <div className="text-sm">
              This update proposal was created for vehicle ID {contribution.targetVehicleId}, but that vehicle has been deleted.
              The proposal cannot be applied and should be cancelled.
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h5 className="card-title text-lg">Proposed Changes (Cannot be Applied)</h5>
            <div className="space-y-2 opacity-60">
              <div className="flex justify-between py-1"><span className="text-gray-600">Make:</span><span>{vehicleData.make}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600">Model:</span><span>{vehicleData.model}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600">Year:</span><span>{vehicleData.year}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600">Battery Capacity:</span><span>{vehicleData.batteryCapacity} kWh</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600">Range:</span><span>{vehicleData.range} km</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600">Charging Speed:</span><span>{vehicleData.chargingSpeed} kW</span></div>
              {vehicleData.description && (
                <div className="flex justify-between py-1"><span className="text-gray-600">Description:</span><span>{vehicleData.description}</span></div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For updates, show comparison view
  return (
    <div className="space-y-4">
      {isVariant && (
        <div className="alert alert-warning">
          <span>This variant proposal is compared against the closest existing vehicle</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original Vehicle */}
        {original ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title text-lg">{isVariant ? 'Reference Vehicle' : 'Original'}</h5>
              <div className="space-y-2">
                <div className="flex justify-between py-1"><span className="text-gray-600">Make:</span><span className="font-medium">{original.make}</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-600">Model:</span><span className="font-medium">{original.model}</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-600">Year:</span><span className="font-medium">{original.year}</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-600">Battery Capacity:</span><span className="font-medium">{original.batteryCapacity} kWh</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-600">Range:</span><span className="font-medium">{original.range} km</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-600">Charging Speed:</span><span className="font-medium">{original.chargingSpeed} kW</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-600">0-100 km/h:</span><span className="font-medium">{original.acceleration} s</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-600">Top Speed:</span><span className="font-medium">{original.topSpeed} km/h</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-600">Price:</span><span className="font-medium">{original.price} $</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-600">Description:</span><span className="font-medium">{original.description}</span></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title text-lg">No Reference Vehicle</h5>
              <div className="text-gray-500">
                This is a new vehicle variant with no existing reference vehicle to compare against.
              </div>
            </div>
          </div>
        )}

        {/* Proposed Changes */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h5 className="card-title text-lg">Proposed {isVariant ? 'Variant' : 'Changes'}</h5>
            <div className="space-y-2">
              <EditableField contributionId={contribution.id} fieldName="make" value={vehicleData.make} label="Make" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.make} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="model" value={vehicleData.model} label="Model" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.model} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="year" value={vehicleData.year} type="number" label="Year" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.year} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="batteryCapacity" value={vehicleData.batteryCapacity} type="number" label="Battery Capacity" unit=" kWh" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.batteryCapacity} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="range" value={vehicleData.range} type="number" label="Range" unit=" km" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.range} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="chargingSpeed" value={vehicleData.chargingSpeed} type="number" label="Charging Speed" unit=" kW" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.chargingSpeed} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="acceleration" value={vehicleData.acceleration} type="number" label="0-100 km/h" unit=" s" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.acceleration} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="topSpeed" value={vehicleData.topSpeed} type="number" label="Top Speed" unit=" km/h" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.topSpeed} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="price" value={vehicleData.price} type="number" label="Price" unit=" $" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.price} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="description" value={vehicleData.description} label="Description" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.description} showDiff={!!original} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BrowseContributionsPage = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [pendingContributions, setPendingContributions] = useState<Contribution[]>([]);
  const [allContributions, setAllContributions] = useState<Contribution[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDiffModal, setShowDiffModal] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [originalVehicle, setOriginalVehicle] = useState<Vehicle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // New state for multi-proposal navigation
  const [relatedProposals, setRelatedProposals] = useState<Contribution[]>([]);
  const [currentProposalIndex, setCurrentProposalIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  // State for inline editing
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftChanges, setDraftChanges] = useState<Record<number, Partial<Vehicle>>>({});
  const [modifiedFields, setModifiedFields] = useState<Record<number, Set<string>>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Helper function to get related proposals for a vehicle
  // Only returns PENDING proposals to prevent navigation through cancelled/rejected proposals
  const getRelatedProposals = (targetContribution: Contribution, allContributions: Contribution[], vehicles?: Vehicle[]): Contribution[] => {
    const related: Contribution[] = [];
    const vehiclesToSearch = vehicles || allVehicles;

    if (targetContribution.changeType === 'UPDATE' && targetContribution.targetVehicleId) {
      // For UPDATE proposals, find all PENDING proposals targeting the same vehicle
      related.push(...allContributions.filter(c =>
        c.changeType === 'UPDATE' &&
        c.targetVehicleId === targetContribution.targetVehicleId &&
        c.status === 'PENDING'
      ));

      // Also include PENDING VARIANT proposals (NEW type) for the same vehicle
      const targetVehicle = vehiclesToSearch.find(v => v.id === targetContribution.targetVehicleId);
      if (targetVehicle) {
        related.push(...allContributions.filter(c =>
          c.changeType === 'NEW' &&
          c.vehicleData.make.toLowerCase() === targetVehicle.make.toLowerCase() &&
          c.vehicleData.model.toLowerCase() === targetVehicle.model.toLowerCase() &&
          Math.abs(c.vehicleData.year - targetVehicle.year) <= 2 &&
          c.status === 'PENDING'
        ));
      }
    } else if (targetContribution.changeType === 'NEW') {
      // For VARIANT proposals (NEW type), find similar vehicles
      const { make, model, year } = targetContribution.vehicleData;

      // Find PENDING UPDATE proposals for vehicles with same make/model/year (±2 years)
      const similarVehicles = vehiclesToSearch.filter(v =>
        v.make.toLowerCase() === make.toLowerCase() &&
        v.model.toLowerCase() === model.toLowerCase() &&
        Math.abs(v.year - year) <= 2
      );

      similarVehicles.forEach(vehicle => {
        related.push(...allContributions.filter(c =>
          c.changeType === 'UPDATE' &&
          c.targetVehicleId === vehicle.id &&
          c.status === 'PENDING'
        ));
      });

      // Find other PENDING VARIANT proposals for the same make/model/year range
      related.push(...allContributions.filter(c =>
        c.changeType === 'NEW' &&
        c.vehicleData.make.toLowerCase() === make.toLowerCase() &&
        c.vehicleData.model.toLowerCase() === model.toLowerCase() &&
        Math.abs(c.vehicleData.year - year) <= 2 &&
        c.status === 'PENDING'
      ));
    }

    // Remove duplicates and sort by creation date (newest first)
    const uniqueRelated = Array.from(new Set(related.map(c => c.id)))
      .map(id => related.find(c => c.id === id)!)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return uniqueRelated;
  };

  const handleShowDiff = useCallback((contribution: Contribution, vehicles: Vehicle[], allContribs?: Contribution[]) => {
    // Use provided allContribs or fall back to state (for when called from table clicks)
    const contributionsToSearch = allContribs || allContributions;

    // Get all related proposals for this vehicle
    const related = getRelatedProposals(contribution, contributionsToSearch, vehicles);
    setRelatedProposals(related);

    // Find the index of the current contribution in the related proposals
    const currentIndex = related.findIndex(c => c.id === contribution.id);
    setCurrentProposalIndex(currentIndex >= 0 ? currentIndex : 0);

    // Set the selected contribution and reference vehicle
    setSelectedContribution(contribution);
    const referenceVehicle = findReferenceVehicle(contribution, vehicles);
    setOriginalVehicle(referenceVehicle);

    setShowDiffModal(true);
  }, [allContributions]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [contribData, allContribData, vehiclesData] = await Promise.all([
        fetchPendingContributions(),
        fetchAllContributions(),
        fetchVehicles()
      ]);
      // contribData is used for pending contributions (public display), allContribData for all contributions (finding related proposals)
      setPendingContributions(contribData);
      setAllContributions(allContribData);
      setAllVehicles(vehiclesData);

      const locationState = location.state as { openContributionId?: number };
      if (locationState?.openContributionId) {
        // First try to find in pending contributions, then in all contributions
        const contribToOpen = contribData.find(c => c.id === locationState.openContributionId) ||
                             allContribData.find(c => c.id === locationState.openContributionId);
        if (contribToOpen) {
          // Call handleShowDiff directly with the data to avoid dependency issues
          const contributionsToSearch = allContribData;
          const related = getRelatedProposals(contribToOpen, contributionsToSearch, vehiclesData);
          setRelatedProposals(related);

          const currentIndex = related.findIndex(c => c.id === contribToOpen.id);
          setCurrentProposalIndex(currentIndex >= 0 ? currentIndex : 0);

          setSelectedContribution(contribToOpen);
          const referenceVehicle = findReferenceVehicle(contribToOpen, vehiclesData);
          setOriginalVehicle(referenceVehicle);

          setShowDiffModal(true);
        }
      }

    } catch (err) {
      setError((err as Error).message || 'Failed to load contributions.');
    } finally {
      setLoading(false);
    }
  }, [location.state]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleModalAction = useCallback(async (action: (id: number) => Promise<void>, id: number) => {
    setIsSubmitting(true);
    setModalError(null);
    try {
      await action(id);
      await loadData();
      handleCloseDiff();
    } catch (err) {
      setModalError((err as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }, [loadData]);

  // Helper function to find the best reference vehicle for comparison
  const findReferenceVehicle = (proposal: Contribution, vehicles?: Vehicle[]): Vehicle | null => {
    const vehiclesToSearch = vehicles || allVehicles;

    if (proposal.changeType === 'UPDATE' && proposal.targetVehicleId) {
      return vehiclesToSearch.find(v => v.id === proposal.targetVehicleId) || null;
    } else if (proposal.changeType === 'NEW') {
      // For VARIANT proposals, find the closest existing vehicle for comparison
      const { make, model, year } = proposal.vehicleData;
      return vehiclesToSearch.find(v =>
        v.make.toLowerCase() === make.toLowerCase() &&
        v.model.toLowerCase() === model.toLowerCase() &&
        Math.abs(v.year - year) <= 2
      ) || null;
    }
    return null;
  };

  // Navigation functions
  const navigateToProposal = useCallback((index: number) => {
    if (index >= 0 && index < relatedProposals.length) {
      setIsNavigating(true);

      const proposal = relatedProposals[index];
      setCurrentProposalIndex(index);
      setSelectedContribution(proposal);

      // Update original vehicle for the new proposal
      const referenceVehicle = findReferenceVehicle(proposal, allVehicles);
      setOriginalVehicle(referenceVehicle);

      // Clear any previous modal errors
      setModalError(null);

      // Small delay to show loading state
      setTimeout(() => setIsNavigating(false), 100);
    }
  }, [relatedProposals, allVehicles]);

  const handlePreviousProposal = useCallback(() => {
    if (currentProposalIndex > 0) {
      navigateToProposal(currentProposalIndex - 1);
    }
  }, [currentProposalIndex, navigateToProposal]);

  const handleNextProposal = useCallback(() => {
    if (currentProposalIndex < relatedProposals.length - 1) {
      navigateToProposal(currentProposalIndex + 1);
    }
  }, [currentProposalIndex, relatedProposals.length, navigateToProposal]);

  const handleCloseDiff = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close and lose your changes?');
      if (!confirmClose) {
        return;
      }
    }

    // Close modal and reset all state
    setShowDiffModal(false);
    setSelectedContribution(null);
    setOriginalVehicle(null);
    setRelatedProposals([]);
    setCurrentProposalIndex(0);
    setIsNavigating(false);
    setModalError(null);
    setIsSubmitting(false);
    setIsEditMode(false);

    // Discard all unsaved changes
    discardChanges();
  }, [hasUnsavedChanges]);

  // Helper functions for draft state management
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      // Exiting edit mode - could add confirmation here if needed
    }
  };

  const updateDraftField = (contributionId: number, fieldName: string, value: string | number | undefined) => {
    setDraftChanges(prev => ({
      ...prev,
      [contributionId]: {
        ...prev[contributionId],
        [fieldName]: value
      }
    }));

    setModifiedFields(prev => ({
      ...prev,
      [contributionId]: new Set([...(prev[contributionId] || []), fieldName])
    }));

    setHasUnsavedChanges(true);
  };

  const getDraftValue = (contributionId: number, fieldName: string, originalValue: string | number | undefined) => {
    return draftChanges[contributionId]?.[fieldName as keyof Vehicle] ?? originalValue;
  };

  const isFieldModified = (contributionId: number, fieldName: string) => {
    return modifiedFields[contributionId]?.has(fieldName) || false;
  };

  const hasUnsavedChangesForProposal = (contributionId: number) => {
    return (modifiedFields[contributionId]?.size || 0) > 0;
  };

  const discardChanges = (contributionId?: number) => {
    if (contributionId) {
      // Discard changes for specific proposal
      setDraftChanges(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[contributionId];
        return newDrafts;
      });
      setModifiedFields(prev => {
        const newModified = { ...prev };
        delete newModified[contributionId];
        return newModified;
      });
    } else {
      // Discard all changes
      setDraftChanges({});
      setModifiedFields({});
    }

    // Check if there are still unsaved changes
    const stillHasChanges = contributionId ?
      Object.keys(modifiedFields).some(id => parseInt(id) !== contributionId && (modifiedFields[parseInt(id)]?.size || 0) > 0) :
      false;
    setHasUnsavedChanges(stillHasChanges);
  };

  const saveChanges = useCallback(async (contributionId: number) => {
    const contribution = relatedProposals.find(c => c.id === contributionId);
    if (!contribution || !draftChanges[contributionId]) return;

    try {
      setIsSubmitting(true);
      setModalError(null);

      const updatedVehicleData = {
        ...contribution.vehicleData,
        ...draftChanges[contributionId]
      };

      await updateMyContribution(contributionId, updatedVehicleData, contribution.changeType, contribution.targetVehicleId);

      // Update the contribution in related proposals
      setRelatedProposals(prev => prev.map(c =>
        c.id === contributionId
          ? { ...c, vehicleData: updatedVehicleData }
          : c
      ));

      // Update selected contribution if it's the current one
      if (selectedContribution?.id === contributionId) {
        setSelectedContribution(prev => prev ? { ...prev, vehicleData: updatedVehicleData } : null);
      }

      // Clear draft changes for this proposal
      discardChanges(contributionId);

      // Reload data to ensure consistency
      await loadData();

    } catch (error) {
      setModalError((error as Error).message || 'Failed to save changes');
    } finally {
      setIsSubmitting(false);
    }
  }, [relatedProposals, draftChanges, selectedContribution, loadData]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showDiffModal) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePreviousProposal();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNextProposal();
          break;
        case 'Escape':
          event.preventDefault();
          handleCloseDiff();
          break;
      }
    };

    if (showDiffModal) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showDiffModal, currentProposalIndex, relatedProposals.length, handleCloseDiff, handleNextProposal, handlePreviousProposal]);

  // Custom search function for contributions
  const customSearch = (contribution: Contribution, query: string) => {
    const text = `${contribution.userEmail ?? ''} ${contribution.userId} ${JSON.stringify(contribution.vehicleData)}`.toLowerCase();
    return text.includes(query);
  };

  // Define table columns
  const columns: Column<Contribution>[] = [
    {
      key: 'id',
      header: 'ID',
      accessor: 'id',
      sortable: true,
      render: (value) => `#${value}`,
    },
    {
      key: 'submittedBy',
      header: 'Submitted By',
      render: (_, contribution) => contribution.userEmail || `User #${contribution.userId}`,
    },
    {
      key: 'changeType',
      header: 'Change Type',
      accessor: 'changeType',
      render: (value) => (
        <div className={`badge ${value === 'NEW' ? 'badge-success' : 'badge-warning'}`}>
          {String(value || 'N/A')}
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (_, contribution) => {
        const originalVehicleInfo = contribution.changeType === 'UPDATE'
          ? allVehicles.find(v => v.id === contribution.targetVehicleId)
          : null;
        const displayVehicle = originalVehicleInfo || contribution.vehicleData;

        return (
          <div>
            <div className="text-sm text-gray-500">
              {displayVehicle.make} {displayVehicle.model} ({displayVehicle.year})
            </div>
            <button
              className="btn btn-link btn-sm p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleShowDiff(contribution, allVehicles);
              }}
            >
              View Details
            </button>
          </div>
        );
      },
    },
    {
      key: 'votes',
      header: 'Votes',
      accessor: 'votes',
      sortable: true,
      render: (value) => String(value || 0),
    },
    {
      key: 'createdAt',
      header: 'Submitted At',
      accessor: 'createdAt',
      sortable: true,
      render: (value) => {
        const dateValue = value as string | number | Date;
        return new Date(dateValue).toLocaleString();
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      show: () => isAuthenticated,
      render: (_, contribution) => (
        <div className="flex gap-2">
          {user?.userId !== contribution.userId && (
            <button
              className="btn btn-primary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleModalAction(voteOnContribution, contribution.id);
              }}
            >
              Vote (+1)
            </button>
          )}
          {user?.userId === contribution.userId && contribution.status === 'PENDING' && (
            <button
              className="btn btn-outline btn-error btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleModalAction(cancelMyContribution, contribution.id);
              }}
            >
              Cancel
            </button>
          )}
          {(user?.role === 'ADMIN' || (user?.role === 'MODERATOR' && user?.userId !== contribution.userId)) && (
            <>
              <button
                className="btn btn-success btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleModalAction(approveContribution, contribution.id);
                }}
              >
                Approve
              </button>
              <button
                className="btn btn-error btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleModalAction(rejectContribution, contribution.id);
                }}
              >
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-6">Browse Contributions</h2>

      {!isAuthenticated && (
        <div className="alert alert-info mb-4">
          <span>Please log in to vote or moderate contributions.</span>
        </div>
      )}

      <DataTable<Contribution>
        data={pendingContributions}
        columns={columns}
        searchable={true}
        searchPlaceholder="Search by user or vehicle..."
        customSearch={customSearch}
        sortable={true}
        paginated={true}
        pageSize={10}
        paginationStyle="simple"
        loading={loading}
        error={error}
        emptyMessage="No pending contributions to browse."
        zebra={true}
      />

      <dialog className={`modal ${showDiffModal ? 'modal-open' : ''}`}>
        <div className="modal-box w-11/12 max-w-5xl">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-lg">Proposal #{selectedContribution?.id}</h3>
                {selectedContribution && (
                  <div className={`badge ${selectedContribution.changeType === 'NEW' ? 'badge-success' : 'badge-warning'}`}>
                    {selectedContribution.changeType === 'NEW' ? 'VARIANT' : 'UPDATE'}
                  </div>
                )}
                {selectedContribution && hasUnsavedChangesForProposal(selectedContribution.id) && (
                  <div className="badge badge-warning">
                    <span className="mr-1">⚠</span>
                    Draft - Unsaved Changes
                  </div>
                )}
                {isEditMode && (
                  <div className="badge badge-info">
                    <span className="mr-1">✏️</span>
                    Edit Mode
                  </div>
                )}
              </div>

              {/* Vehicle context information */}
              {selectedContribution && (
                <div className="text-sm text-gray-600 mb-2">
                  {selectedContribution.changeType === 'UPDATE' ? (
                    <div className="flex items-center gap-2">
                      <div className="badge badge-success badge-xs">UPDATE</div>
                      {originalVehicle ? (
                        <span>Update for {originalVehicle.year} {originalVehicle.make} {originalVehicle.model}</span>
                      ) : (
                        <span>Update for {selectedContribution.vehicleData.year} {selectedContribution.vehicleData.make} {selectedContribution.vehicleData.model}</span>
                      )}
                      {originalVehicle?.id && (
                        <div className="badge badge-outline badge-xs">ID: {originalVehicle.id}</div>
                      )}
                      {selectedContribution.changeType === 'UPDATE' && !originalVehicle && (
                        <div className="badge badge-error badge-xs" title={`Target vehicle ID ${selectedContribution.targetVehicleId} no longer exists`}>
                          Target vehicle deleted
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="badge badge-info badge-xs">VARIANT</div>
                      <span>Variant of {selectedContribution.vehicleData.year} {selectedContribution.vehicleData.make} {selectedContribution.vehicleData.model}</span>
                      {originalVehicle && (
                        <div className="badge badge-outline badge-xs">Compared to ID: {originalVehicle.id}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Proposal metadata */}
              {selectedContribution && (
                <div className="text-xs text-gray-500">
                  Submitted by {selectedContribution.userEmail || `User #${selectedContribution.userId}`} on {new Date(selectedContribution.createdAt).toLocaleString()}
                </div>
              )}
            </div>
            <button className="btn btn-sm btn-circle btn-ghost" onClick={handleCloseDiff}>✕</button>
          </div>

          {/* Navigation controls */}
          {relatedProposals.length > 1 && (
            <div className="mb-4 p-3 bg-base-200 rounded-lg">
              {/* Mobile-first responsive navigation */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 order-2 sm:order-1">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={handlePreviousProposal}
                    disabled={currentProposalIndex === 0 || isNavigating}
                    title="Previous proposal (Left arrow key)"
                  >
                    ← Previous
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={handleNextProposal}
                    disabled={currentProposalIndex === relatedProposals.length - 1 || isNavigating}
                    title="Next proposal (Right arrow key)"
                  >
                    Next →
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 order-1 sm:order-2">
                  <span className="text-sm font-medium whitespace-nowrap">
                    Proposal {currentProposalIndex + 1} of {relatedProposals.length}
                  </span>

                  {/* Breadcrumb navigation - hide on very small screens */}
                  <div className="breadcrumbs text-sm hidden sm:block">
                    <ul className="flex-wrap">
                      {relatedProposals.slice(0, 5).map((proposal, index) => {
                        const isUpdate = proposal.changeType === 'UPDATE';
                        const typeLabel = isUpdate ? 'U' : 'V';
                        const typeColor = isUpdate ? 'badge-success' : 'badge-info';
                        const hasUnsaved = hasUnsavedChangesForProposal(proposal.id);
                        return (
                          <li key={proposal.id}>
                            <button
                              className={`btn btn-xs ${index === currentProposalIndex ? 'btn-primary' : 'btn-ghost'} gap-1 ${hasUnsaved ? 'border-warning' : ''}`}
                              onClick={() => navigateToProposal(index)}
                              disabled={isNavigating}
                              title={`Go to ${isUpdate ? 'update' : 'variant'} proposal #${proposal.id}${hasUnsaved ? ' (has unsaved changes)' : ''}`}
                            >
                              <span className={`badge badge-xs ${typeColor}`}>{typeLabel}</span>
                              #{proposal.id}
                              {hasUnsaved && <span className="text-warning">*</span>}
                            </button>
                          </li>
                        );
                      })}
                      {relatedProposals.length > 5 && (
                        <li><span className="text-xs">...</span></li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Keyboard navigation hint */}
              <div className="text-xs text-gray-500 mt-2 text-center">
                Use ← → arrow keys to navigate between proposals
              </div>

              {/* Related proposals summary */}
              <div className="mt-3 text-xs text-gray-500">
                <span className="font-medium">Related proposals:</span>
                <span className="ml-2 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <div className="badge badge-success badge-xs">U</div>
                    {relatedProposals.filter(p => p.changeType === 'UPDATE').length} updates
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="badge badge-info badge-xs">V</div>
                    {relatedProposals.filter(p => p.changeType === 'NEW').length} variants
                  </span>
                </span>
              </div>
            </div>
          )}
          {modalError && (
            <div className="alert alert-error mb-4">
              <span>{modalError}</span>
            </div>
          )}
          {isNavigating ? (
            <div className="flex justify-center items-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : selectedContribution && (
            <InlineEditableVehicleDetails
              contribution={selectedContribution}
              original={originalVehicle}
              isEditable={user?.userId === selectedContribution.userId && selectedContribution.status === 'PENDING'}
              isEditMode={isEditMode}
              getDraftValue={getDraftValue}
              isFieldModified={isFieldModified}
              updateDraftField={updateDraftField}
            />
          )}
          <div className="modal-action">
            <div className="flex justify-between">
              {selectedContribution && isAuthenticated && (
                <div className="flex gap-2">
                  {user?.userId !== selectedContribution.userId && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleModalAction(voteOnContribution, selectedContribution.id)} disabled={isSubmitting}>
                      {isSubmitting ? 'Voting...' : 'Vote (+1)'}
                    </button>
                  )}
                  {user?.userId === selectedContribution.userId && selectedContribution.status === 'PENDING' && (
                    <>
                      {!isEditMode ? (
                        <button className="btn btn-outline btn-warning btn-sm" onClick={toggleEditMode} disabled={isSubmitting}>
                          Edit Mode
                        </button>
                      ) : (
                        <>
                          {hasUnsavedChangesForProposal(selectedContribution.id) && (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => saveChanges(selectedContribution.id)}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                              </button>
                              <button
                                className="btn btn-outline btn-warning btn-sm"
                                onClick={() => discardChanges(selectedContribution.id)}
                                disabled={isSubmitting}
                              >
                                Discard Changes
                              </button>
                            </>
                          )}
                          <button className="btn btn-outline btn-secondary btn-sm" onClick={toggleEditMode} disabled={isSubmitting}>
                            Exit Edit Mode
                          </button>
                        </>
                      )}
                      <button className="btn btn-outline btn-error btn-sm" onClick={() => handleModalAction(cancelMyContribution, selectedContribution.id)} disabled={isSubmitting}>
                        {isSubmitting ? 'Cancelling...' : 'Cancel Proposal'}
                      </button>
                    </>
                  )}
                  {(user?.role === 'ADMIN' || (user?.role === 'MODERATOR' && user?.userId !== selectedContribution.userId)) && (
                    <>
                      <button className="btn btn-success btn-sm" onClick={() => handleModalAction(approveContribution, selectedContribution.id)} disabled={isSubmitting}>
                        {isSubmitting ? 'Approving...' : 'Approve'}
                      </button>
                      <button className="btn btn-error btn-sm" onClick={() => handleModalAction(rejectContribution, selectedContribution.id)} disabled={isSubmitting}>
                        {isSubmitting ? 'Rejecting...' : 'Reject'}
                      </button>
                    </>
                  )}
                </div>
              )}
              <button className="btn btn-secondary" onClick={handleCloseDiff} disabled={isSubmitting}>Close</button>
            </div>
          </div>
        </div>
      </dialog>


    </div>
  );
};

export default BrowseContributionsPage;
