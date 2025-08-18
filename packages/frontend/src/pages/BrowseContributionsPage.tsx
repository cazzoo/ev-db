import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DataTable, { Column } from '../components/DataTable';
import VehicleImageCarousel from '../components/VehicleImageCarousel';
import RejectionHistory from '../components/RejectionHistory';
import {
  fetchPendingContributions,
  fetchAllContributions,
  voteOnContribution,
  approveContribution,
  rejectContribution,
  cancelMyContribution,
  updateMyContribution,
  fetchPendingImageContributions,
  Contribution,
  Vehicle,
  ImageContribution,
  fetchVehicles,
} from '../services/api';

// Enhanced inline editable field component with improved UX
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
  type?: 'text' | 'number' | 'textarea';
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

  // Read-only view
  if (!isEditable || !isEditMode) {
    return (
      <div className="flex justify-between items-center py-3 border-b border-base-200 last:border-b-0">
        <span className="text-base-content/70 font-medium">{label}:</span>
        <span className={`font-semibold ${
          isModified ? 'text-warning' :
          isDifferentFromOriginal ? 'text-success bg-success/10 px-2 py-1 rounded-md' :
          'text-base-content'
        }`}>
          {draftValue || 'Not specified'}{unit}
          {isModified && <span className="ml-2 text-warning">●</span>}
          {isDifferentFromOriginal && !isModified && <span className="ml-2 text-success">●</span>}
        </span>
      </div>
    );
  }

  // Edit mode view
  return (
    <div className="form-control w-full mb-6">
      <label className="label pb-2">
        <span className="label-text font-semibold text-base flex items-center gap-2">
          {label}
          {isModified && (
            <div className="badge badge-warning badge-sm">
              Modified
            </div>
          )}
        </span>
        {unit && <span className="label-text-alt text-base-content/60 font-medium">{unit}</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          value={draftValue || ''}
          onChange={(e) => updateDraftField(contributionId, fieldName, e.target.value)}
          className={`textarea textarea-bordered w-full h-24 ${isModified ? 'textarea-warning' : ''}`}
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      ) : (
        <div className="join w-full">
          <input
            type={type}
            value={draftValue || ''}
            onChange={(e) => {
              const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
              updateDraftField(contributionId, fieldName, newValue);
            }}
            className={`input input-bordered join-item flex-1 ${isModified ? 'input-warning' : ''}`}
            placeholder={`Enter ${label.toLowerCase()}...`}
            step={type === 'number' ? '0.1' : undefined}
          />
          {unit && (
            <span className="bg-base-200 text-base-content/70 px-4 flex items-center text-sm font-semibold border border-l-0 border-base-300 join-item">
              {unit}
            </span>
          )}
        </div>
      )}

      {showDiff && originalValue !== undefined && String(originalValue).trim() !== String(draftValue || '').trim() && (
        <label className="label pt-1">
          <span className="label-text-alt text-info flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Original: {originalValue}{unit}
          </span>
        </label>
      )}
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
  updateDraftField,
  imageContributions = []
}: {
  contribution: Contribution;
  original: Vehicle | null;
  isEditable?: boolean;
  isEditMode?: boolean;
  getDraftValue: (contributionId: number, fieldName: string, originalValue: string | number | undefined) => string | number | undefined;
  isFieldModified: (contributionId: number, fieldName: string) => boolean;
  updateDraftField: (contributionId: number, fieldName: string, value: string | number | undefined) => void;
  imageContributions?: ImageContribution[];
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
            <h5 className="card-title text-lg mb-4">
              {isEditMode ? 'Edit Proposed Changes' : 'Proposed Vehicle Data'}
            </h5>
            <div className={isEditMode ? 'space-y-1' : 'space-y-2'}>
              <EditableField contributionId={contribution.id} fieldName="make" value={vehicleData.make} label="Make" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="model" value={vehicleData.model} label="Model" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="year" value={vehicleData.year} type="number" label="Year" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="batteryCapacity" value={vehicleData.batteryCapacity} type="number" label="Battery Capacity" unit=" kWh" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="range" value={vehicleData.range} type="number" label="Range" unit=" km" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="chargingSpeed" value={vehicleData.chargingSpeed} type="number" label="Charging Speed" unit=" kW" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="acceleration" value={vehicleData.acceleration} type="number" label="0-100 km/h" unit=" s" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="topSpeed" value={vehicleData.topSpeed} type="number" label="Top Speed" unit=" km/h" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="price" value={vehicleData.price} type="number" label="Price" unit=" $" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
              <EditableField contributionId={contribution.id} fieldName="description" value={vehicleData.description} type="textarea" label="Description" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} />
            </div>
          </div>
        </div>

        {/* Images section for variant proposals */}
        {imageContributions.length > 0 && (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title text-lg mb-4">Proposed Images ({imageContributions.length})</h5>
              <div className="h-48 bg-base-200 rounded-lg overflow-hidden mb-4">
                <VehicleImageCarousel
                  images={imageContributions.map(img => ({
                    id: img.id,
                    url: `http://localhost:3000/uploads/${img.path}`,
                    altText: img.altText,
                    caption: img.caption
                  }))}
                  vehicleMake={vehicleData.make}
                  vehicleModel={vehicleData.model}
                  vehicleYear={vehicleData.year}
                  className="w-full h-full"
                  showIndicators={true}
                  showNavigation={true}
                  autoPlay={false}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {imageContributions.map((img, index) => (
                  <div key={img.id} className="text-center">
                    <div className="aspect-video bg-base-300 rounded overflow-hidden mb-1">
                      <img
                        src={`http://localhost:3000/uploads/${img.path}`}
                        alt={img.altText || `Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-base-content/60 truncate" title={img.originalFilename}>
                      {img.originalFilename}
                    </p>
                    <div className={`badge badge-sm ${img.status === 'PENDING' ? 'badge-warning' : img.status === 'APPROVED' ? 'badge-success' : 'badge-error'}`}>
                      {img.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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
            <h5 className="card-title text-lg mb-4">
              {isEditMode ? `Edit Proposed ${isVariant ? 'Variant' : 'Changes'}` : `Proposed ${isVariant ? 'Variant' : 'Changes'}`}
            </h5>
            <div className={isEditMode ? 'space-y-1' : 'space-y-2'}>
              <EditableField contributionId={contribution.id} fieldName="make" value={vehicleData.make} label="Make" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.make} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="model" value={vehicleData.model} label="Model" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.model} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="year" value={vehicleData.year} type="number" label="Year" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.year} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="batteryCapacity" value={vehicleData.batteryCapacity} type="number" label="Battery Capacity" unit=" kWh" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.batteryCapacity} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="range" value={vehicleData.range} type="number" label="Range" unit=" km" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.range} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="chargingSpeed" value={vehicleData.chargingSpeed} type="number" label="Charging Speed" unit=" kW" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.chargingSpeed} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="acceleration" value={vehicleData.acceleration} type="number" label="0-100 km/h" unit=" s" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.acceleration} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="topSpeed" value={vehicleData.topSpeed} type="number" label="Top Speed" unit=" km/h" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.topSpeed} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="price" value={vehicleData.price} type="number" label="Price" unit=" $" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.price} showDiff={!!original} />
              <EditableField contributionId={contribution.id} fieldName="description" value={vehicleData.description} type="textarea" label="Description" isEditable={isEditable} isEditMode={isEditMode} getDraftValue={getDraftValue} isFieldModified={isFieldModified} updateDraftField={updateDraftField} originalValue={original?.description} showDiff={!!original} />
            </div>
          </div>
        </div>
      </div>

      {/* Images section for updates/variants */}
      {imageContributions.length > 0 && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h5 className="card-title text-lg mb-4">
              Proposed Images ({imageContributions.length})
              <div className="badge badge-info badge-sm ml-2">Pending Review</div>
            </h5>

            {/* Main carousel view */}
            <div className="h-48 bg-base-200 rounded-lg overflow-hidden mb-4">
              <VehicleImageCarousel
                images={imageContributions.map(img => ({
                  id: img.id,
                  url: `http://localhost:3000/uploads/${img.path}`,
                  altText: img.altText,
                  caption: img.caption
                }))}
                vehicleMake={vehicleData.make}
                vehicleModel={vehicleData.model}
                vehicleYear={vehicleData.year}
                className="w-full h-full"
                showIndicators={true}
                showNavigation={true}
                autoPlay={false}
              />
            </div>

            {/* Thumbnail grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {imageContributions.map((img, index) => (
                <div key={img.id} className="text-center">
                  <div className="aspect-video bg-base-300 rounded overflow-hidden mb-2">
                    <img
                      src={`http://localhost:3000/uploads/${img.path}`}
                      alt={img.altText || `Image ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      title={img.altText || `Image ${index + 1}`}
                    />
                  </div>
                  <p className="text-xs text-base-content/70 truncate mb-1" title={img.originalFilename}>
                    {img.originalFilename}
                  </p>
                  <div className="flex justify-center gap-1">
                    <div className={`badge badge-xs ${
                      img.status === 'PENDING' ? 'badge-warning' :
                      img.status === 'APPROVED' ? 'badge-success' :
                      'badge-error'
                    }`}>
                      {img.status}
                    </div>
                    {img.fileSize && (
                      <div className="badge badge-xs badge-ghost">
                        {(img.fileSize / 1024 / 1024).toFixed(1)}MB
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Image contribution info */}
            <div className="alert alert-info mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p className="font-medium">Image Contributions</p>
                <p className="text-sm">
                  These images were submitted along with this vehicle contribution and are pending review.
                  They will be added to the vehicle if both the vehicle data and images are approved.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
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
  const [imageContributions, setImageContributions] = useState<ImageContribution[]>([]);
  const [isNewlySubmitted, setIsNewlySubmitted] = useState(false);

// Rejection form state
const [showRejectForm, setShowRejectForm] = useState(false);
const [rejectComment, setRejectComment] = useState('');
const [rejectError, setRejectError] = useState<string | null>(null);

  // New state for multi-proposal navigation
  const [relatedProposals, setRelatedProposals] = useState<Contribution[]>([]);
  const [currentProposalIndex, setCurrentProposalIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  // State for inline editing
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftChanges, setDraftChanges] = useState<Record<number, Partial<Vehicle>>>({});
  const [modifiedFields, setModifiedFields] = useState<Record<number, Set<string>>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Ref to track processed auto-opens to prevent reopening after approval
  const processedAutoOpenRef = useRef<number | null>(null);

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

    // Fetch image contributions for this vehicle
    loadImageContributions(contribution);

    setShowDiffModal(true);
  }, [allContributions]);

  // Function to load image contributions for a specific contribution
  const loadImageContributions = useCallback(async (contribution: Contribution) => {
    try {
      console.log('🔍 Loading image contributions for contribution:', contribution.id);
      console.log('   - Change type:', contribution.changeType);
      console.log('   - Target vehicle ID:', contribution.targetVehicleId);
      console.log('   - Vehicle data ID:', contribution.vehicleData?.id);

      // For now, fetch all pending image contributions and filter by vehicle
      // In a full implementation, you'd want a specific API endpoint for this
      const allImageContribs = await fetchPendingImageContributions();
      console.log('📸 Fetched all image contributions:', allImageContribs.length);

      // Filter image contributions by contribution ID (more accurate than vehicle ID)
      console.log('🎯 Looking for images linked to contribution ID:', contribution.id);

      const relevantImages = allImageContribs.filter(img => {
        // First try to match by contribution ID (new linking method)
        if (img.contributionId === contribution.id) {
          console.log(`   - Image ${img.id} (contribution ${img.contributionId}): ✅ DIRECT MATCH`);
          return true;
        }

        // Fallback to vehicle ID matching for older images without contribution linking
        const vehicleId = contribution.targetVehicleId || contribution.vehicleData.id;
        const matches = img.vehicleId === vehicleId || (img.vehicleId === contribution.vehicleData.id);
        if (matches && !img.contributionId) {
          console.log(`   - Image ${img.id} (vehicle ${img.vehicleId}, no contribution link): ⚠️ FALLBACK MATCH`);
          return true;
        }

        console.log(`   - Image ${img.id}: ❌ no match`);
        return false;
      });

      console.log('🖼️ Found relevant images:', relevantImages.length);
      setImageContributions(relevantImages);
    } catch (error) {
      console.error('Failed to load image contributions:', error);
      setImageContributions([]);
    }
  }, []);

  // Debug effect to track imageContributions changes
  useEffect(() => {
    console.log('🖼️ Image contributions state updated:', imageContributions.length);
    imageContributions.forEach((img, index) => {
      console.log(`   ${index + 1}. ${img.originalFilename} (ID: ${img.id}, Vehicle: ${img.vehicleId})`);
    });
  }, [imageContributions]);

  // Reset processed auto-open when location changes
  useEffect(() => {
    processedAutoOpenRef.current = null;
  }, [location.pathname, location.search]);

  // Auto-open modal for newly submitted contribution
  useEffect(() => {
    const state = location.state as { openContributionId?: number; showSuccessMessage?: boolean };
    if (state?.openContributionId && allContributions.length > 0 && allVehicles.length > 0) {
      // Check if we've already processed this auto-open to prevent reopening after approval
      if (processedAutoOpenRef.current === state.openContributionId) {
        return;
      }

      const contributionToOpen = allContributions.find(c => c.id === state.openContributionId);
      if (contributionToOpen) {
        console.log('🎯 Auto-opening modal for contribution:', state.openContributionId);
        processedAutoOpenRef.current = state.openContributionId;
        setIsNewlySubmitted(state.showSuccessMessage || false);
        handleShowDiff(contributionToOpen, allVehicles, allContributions);

        // Clear the state to prevent re-opening on subsequent renders
        window.history.replaceState({}, '', location.pathname);
      } else if (state?.openContributionId) {
        // Contribution not found (likely approved/rejected), clear the state
        console.log('🚫 Contribution not found (likely approved/rejected):', state.openContributionId);
        processedAutoOpenRef.current = state.openContributionId;
        window.history.replaceState({}, '', location.pathname);
      }
    }
  }, [allContributions, allVehicles, location.state, handleShowDiff]);

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
    setIsNewlySubmitted(false);

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
    const draftValue = draftChanges[contributionId]?.[fieldName as keyof Vehicle];
    // Only return primitive values, not arrays like images
    if (typeof draftValue === 'string' || typeof draftValue === 'number' || draftValue === undefined) {
      return draftValue ?? originalValue;
    }
    return originalValue;
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
              {!showRejectForm ? (
                <button
                  className="btn btn-error btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRejectForm(true);
                    setRejectError(null);
                  }}
                >
                  Reject
                </button>
              ) : null}
              {showRejectForm && selectedContribution?.id === contribution.id && (
                <div className="w-full max-w-lg mt-2">
                  {rejectError && (
                    <div className="alert alert-error mb-2">
                      <span>{rejectError}</span>
                    </div>
                  )}
                  <textarea
                    className="textarea textarea-bordered w-full"
                    placeholder="Provide detailed rejection reason (min 10 characters)"
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      className="btn btn-error btn-sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const comment = rejectComment.trim();
                        if (comment.length < 10) {
                          setRejectError('Rejection comment must be at least 10 characters.');
                          return;
                        }
                        setRejectError(null);
                        setIsSubmitting(true);
                        try {
                          await rejectContribution(contribution.id, comment);
                          await loadData();
                          setShowRejectForm(false);
                          setRejectComment('');
                        } catch (err) {
                          setRejectError((err as Error).message || 'Failed to reject contribution.');
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Rejecting...' : 'Confirm Reject'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setShowRejectForm(false); setRejectComment(''); }} disabled={isSubmitting}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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
                {selectedContribution?.status === 'REJECTED' && selectedContribution?.rejectionComment && (
                  <div className="alert alert-error mt-2">
                    <span>Rejection reason: {selectedContribution.rejectionComment}</span>
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

          {/* Success message for newly submitted contributions */}
          {isNewlySubmitted && (
            <div className="alert alert-success mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-bold">Contribution Submitted Successfully!</h3>
                <div className="text-sm">Your proposal has been submitted and is now pending review by moderators. You can see the details below.</div>
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
              imageContributions={imageContributions}
            />
          )}
          <div className="modal-action">
            <div className="flex justify-between items-center w-full">
              {/* Action buttons - left side */}
              <div className="flex gap-2 flex-wrap">
                {selectedContribution && isAuthenticated && (
                  <>
                    {user?.userId !== selectedContribution.userId && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleModalAction(voteOnContribution, selectedContribution.id)} disabled={isSubmitting}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        {isSubmitting ? 'Voting...' : 'Vote (+1)'}
                      </button>
                    )}
                    {user?.userId === selectedContribution.userId && selectedContribution.status === 'PENDING' && (
                      <>
                        {!isEditMode ? (
                          <button className="btn btn-warning btn-sm" onClick={toggleEditMode} disabled={isSubmitting}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
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
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                              </>
                            )}
                            <button
                              className="btn btn-outline btn-warning btn-sm"
                              onClick={() => discardChanges(selectedContribution.id)}
                              disabled={isSubmitting}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Discard Changes
                            </button>
                          </>
                        )}
                        <button className="btn btn-outline btn-secondary btn-sm" onClick={toggleEditMode} disabled={isSubmitting}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Exit Edit Mode
                        </button>
                          </>
                        )}
                        <button className="btn btn-error btn-sm" onClick={() => handleModalAction(cancelMyContribution, selectedContribution.id)} disabled={isSubmitting}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {isSubmitting ? 'Cancelling...' : 'Cancel Proposal'}
                        </button>
                      </>
                    )}
                    {(user?.role === 'ADMIN' || (user?.role === 'MODERATOR' && user?.userId !== selectedContribution.userId)) && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => handleModalAction(approveContribution, selectedContribution.id)} disabled={isSubmitting}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {isSubmitting ? 'Approving...' : 'Approve'}
                        </button>
                        {!showRejectForm ? (
                          <button className="btn btn-error btn-sm" onClick={() => { setShowRejectForm(true); setRejectError(null); }} disabled={isSubmitting}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {isSubmitting ? 'Rejecting...' : 'Reject'}
                          </button>
                        ) : (
                          <div className="w-full max-w-lg">
                            {rejectError && (
                              <div className="alert alert-error mb-2">
                                <span>{rejectError}</span>
                              </div>
                            )}
                            <textarea
                              className="textarea textarea-bordered w-full"
                              placeholder="Provide detailed rejection reason (min 10 characters)"
                              value={rejectComment}
                              onChange={(e) => setRejectComment(e.target.value)}
                              rows={3}
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                className="btn btn-error btn-sm"
                                onClick={async () => {
                                  const comment = rejectComment.trim();
                                  if (comment.length < 10) {
                                    setRejectError('Rejection comment must be at least 10 characters.');
                                    return;
                                  }
                                  setRejectError(null);
                                  setIsSubmitting(true);
                                  try {
                                    await rejectContribution(selectedContribution!.id, comment);
                                    await loadData();
                                    setShowRejectForm(false);
                                    setRejectComment('');
                                    handleCloseDiff();
                                  } catch (err) {
                                    setRejectError((err as Error).message || 'Failed to reject contribution.');
                                  } finally {
                                    setIsSubmitting(false);
                                  }
                                }}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? 'Rejecting...' : 'Confirm Reject'}
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setShowRejectForm(false); setRejectComment(''); }} disabled={isSubmitting}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                      </>

                    )}
              </div>

              {/* Close button - right side */}
              <button className="btn btn-outline btn-secondary" onClick={handleCloseDiff} disabled={isSubmitting}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>
          </div>
        </div>
      </dialog>


    </div>
  );
};

export default BrowseContributionsPage;
