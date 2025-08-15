import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Vehicle, submitContribution, submitImageContribution } from '../services/api';
import MultiStepContributionForm from '../components/MultiStepContributionForm';

interface ImageWithMetadata {
  file: File;
  caption: string;
  altText: string;
}

interface LocationState {
  mode?: 'UPDATE' | 'VARIANT';
  vehicleData?: Vehicle;
  targetVehicleId?: number;
  isVariantMode?: boolean;
}

const ContributeVehiclePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract state passed from VehiclesPage
  const locationState = location.state as LocationState | null;
  const initialData = locationState?.vehicleData;
  const initialChangeType = locationState?.mode === 'UPDATE' ? 'UPDATE' : 'NEW';
  const initialTargetVehicleId = locationState?.targetVehicleId;
  const isVariantMode = locationState?.isVariantMode || false;

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (vehicleData: Vehicle, changeType: 'NEW' | 'UPDATE', targetVehicleId?: number, images?: ImageWithMetadata[]) => {
    setIsSubmitting(true);
    try {
      // First submit the vehicle contribution
      const contribution = await submitContribution(vehicleData, changeType, targetVehicleId);

      // If images were provided, submit them as image contributions
      if (images && images.length > 0) {
        console.log(`Submitting ${images.length} images for contribution ${contribution.id}`);

        // Submit each image as an image contribution
        const imageSubmissions = images.map(async (imageData) => {
          try {
            // Use the target vehicle ID for the image contribution
            const vehicleIdForImage = targetVehicleId || contribution.vehicleData.id;
            if (!vehicleIdForImage) {
              throw new Error('No vehicle ID available for image submission');
            }

            return await submitImageContribution(
              vehicleIdForImage,
              imageData.file,
              contribution.id,
              imageData.altText,
              imageData.caption
            );
          } catch (error) {
            console.error('Error submitting image:', error);
            throw error;
          }
        });

        // Wait for all image submissions to complete
        await Promise.all(imageSubmissions);

        showToast('success', `Contribution submitted with ${images.length} image(s)! Everything will be reviewed by moderators.`);
      } else {
        showToast('success', 'Contribution submitted successfully! It will be reviewed by moderators.');
      }

      // Redirect to the contributions page with the review modal open for the new contribution
      navigate('/contributions/browse', {
        state: {
          openContributionId: contribution.id,
          showSuccessMessage: true
        }
      });
    } catch (error: any) {
      console.error('Failed to submit contribution:', error);

      // Handle specific error types
      if (error.message?.includes('duplicate')) {
        showToast('warning', 'This vehicle may already exist. Please check the existing entries or create a variant.');
      } else if (error.message?.includes('validation')) {
        showToast('error', 'Please check your input and try again.');
      } else {
        showToast('error', 'Failed to submit contribution. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Navigate back to where the user came from, or default to /contribute
    const returnTo = location.state?.returnTo || '/contribute';
    navigate(returnTo);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-6">
        {/* Compact Vehicle Context Bar - always shown */}
        <div className={`w-full mb-3 px-4 py-3 rounded-lg border-l-4 ${
          locationState?.mode === 'UPDATE' ? 'bg-warning/10 border-l-warning' :
          locationState?.mode === 'VARIANT' ? 'bg-info/10 border-l-info' :
          'bg-success/10 border-l-success'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`badge ${
                locationState?.mode === 'UPDATE' ? 'badge-warning' :
                locationState?.mode === 'VARIANT' ? 'badge-info' :
                'badge-success'
              } badge-sm`}>
                {locationState?.mode === 'UPDATE' ? 'UPDATE' :
                 locationState?.mode === 'VARIANT' ? 'VARIANT' :
                 'NEW'}
              </div>

              {(locationState?.mode === 'UPDATE' || locationState?.mode === 'VARIANT') && initialData ? (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {initialData.year} {initialData.make} {initialData.model}
                  </span>
                  {initialData.id && (
                    <span className="badge badge-outline badge-xs opacity-60">#{initialData.id}</span>
                  )}
                </div>
              ) : (
                <span className="font-semibold">Add New Vehicle</span>
              )}
            </div>

            {/* Compact specs for updates/variants */}
            {(locationState?.mode === 'UPDATE' || locationState?.mode === 'VARIANT') && initialData && (
              <div className="hidden sm:flex items-center gap-4 text-xs opacity-70">
                {initialData.batteryCapacity && (
                  <span>{initialData.batteryCapacity}kWh</span>
                )}
                {initialData.range && (
                  <span>{initialData.range}km</span>
                )}
                {initialData.chargingSpeed && (
                  <span>{initialData.chargingSpeed}kW</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Multi-step form */}
        <MultiStepContributionForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          initialData={initialData}
          initialChangeType={initialChangeType}
          initialTargetVehicleId={initialTargetVehicleId}
          isVariantMode={isVariantMode}
        />

        {/* Contribution Guidelines - moved to bottom */}
        <div className="card bg-base-100 shadow-xl mt-12 max-w-4xl mx-auto">
          <div className="card-body">
            <h2 className="card-title">Contribution Guidelines</h2>
            <p className="text-sm opacity-70 mb-4">
              Follow these guidelines to ensure your contribution is accepted and helps maintain data quality.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h3 className="font-semibold mb-3 text-success">✅ Best Practices</h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>Provide accurate make, model, and year</li>
                  <li>Use official specifications when available</li>
                  <li>Include battery capacity, range, and charging speed</li>
                  <li>Search existing entries to avoid duplicates</li>
                  <li>Use consistent units (kWh, km, kW)</li>
                  <li>Reference trusted sources for specifications</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-error">❌ Avoid These</h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>Submit estimated or unverified data</li>
                  <li>Use marketing language or opinions</li>
                  <li>Include concept or unreleased vehicles</li>
                  <li>Submit duplicate entries</li>
                  <li>Leave required fields empty</li>
                  <li>Mix different measurement units</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <h4 className="font-semibold">Earn Credits</h4>
                  <p className="text-sm">+10 credits for each approved contribution</p>
                </div>
              </div>

              <div className="alert alert-warning">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="font-semibold">Review Process</h4>
                  <p className="text-sm">Contributions are reviewed by moderators</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading overlay */}
        {isSubmitting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <span className="loading loading-spinner loading-lg"></span>
                <p className="mt-4">Submitting your contribution...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContributeVehiclePage;
