import { useEffect, useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  fetchVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  Vehicle,
  seedVehicles,
  seedContributions,
  submitContribution,
  fetchPendingContributions,
  Contribution,
  DuplicateError
} from '../services/api';
import ContributionForm from '../components/ContributionForm';
import MultiStepContributionForm from '../components/MultiStepContributionForm';
import DataTable, { Column } from '../components/DataTable';
import VehicleCardGrid from '../components/VehicleCardGrid';
import VehicleDetailsView from '../components/VehicleDetailsView';
import { AuthContext } from '../context/AuthContext';

const VehiclesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pendingContributions, setPendingContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<DuplicateError | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);
  const [contributeMode, setContributeMode] = useState<'ADD' | 'UPDATE' | 'VARIANT' | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'contribute'>('edit');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    // Remember user preference from localStorage
    return (localStorage.getItem('vehicleViewMode') as 'table' | 'cards') || 'table';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const { userRole, token } = useContext(AuthContext);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vehiclesData, contributionsData] = await Promise.all([
        fetchVehicles(),
        fetchPendingContributions()
      ]);
      setVehicles(vehiclesData);
      setPendingContributions(contributionsData);
    } catch (err) {
      setError((err as Error).message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleShowModal = (vehicle: Vehicle | null = null) => {
    setCurrentVehicle(vehicle);
    setModalMode('edit');
    setContributeMode(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentVehicle(null);
    setContributeMode(null);
    setModalMode('edit');
    setError(null);
    setDuplicateError(null);
  };

  const handleSaveVehicle = async (vehicleData: Vehicle) => {
    try {
      if (currentVehicle && currentVehicle.id) {
        await updateVehicle(currentVehicle.id, vehicleData);
      } else {
        await createVehicle(vehicleData);
      }
      loadData();
      handleCloseModal();
    } catch (err) {
      setError((err as Error).message || 'Failed to save vehicle.');
    }
  };

  // Handler for admin form using MultiStepContributionForm
  const handleAdminSubmit = async (vehicleData: Vehicle, changeType: 'NEW' | 'UPDATE', targetVehicleId?: number, images?: any[]) => {
    try {
      if (currentVehicle && currentVehicle.id) {
        await updateVehicle(currentVehicle.id, vehicleData);
      } else {
        await createVehicle(vehicleData);
      }
      // TODO: Handle image uploads for admin-created vehicles
      loadData();
      handleCloseModal();
    } catch (err) {
      setError((err as Error).message || 'Failed to save vehicle.');
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await deleteVehicle(id);
        loadData();
      } catch (err) {
        setError((err as Error).message || 'Failed to delete vehicle.');
      }
    }
  };

  const handleViewModeToggle = (mode: 'table' | 'cards') => {
    setViewMode(mode);
    localStorage.setItem('vehicleViewMode', mode);
  };

  const handleViewVehicle = (vehicle: Vehicle) => {
    // Show the modal in view mode with vehicle details
    setCurrentVehicle(vehicle);
    setModalMode('view');
    setContributeMode(null);
    setShowModal(true);
  };

  const handleProposeUpdate = (vehicle: Vehicle) => {
    // Navigate to multi-step form with update mode
    navigate('/contribute/vehicle', {
      state: {
        mode: 'UPDATE',
        vehicleData: vehicle,
        targetVehicleId: vehicle.id,
        returnTo: location.pathname + location.search // Include current location for redirect
      }
    });
  };

  const handleProposeVariant = (vehicle: Vehicle) => {
    // Navigate to multi-step form with variant mode
    navigate('/contribute/vehicle', {
      state: {
        mode: 'VARIANT',
        vehicleData: vehicle,
        isVariantMode: true,
        returnTo: location.pathname + location.search // Include current location for redirect
      }
    });
  };

  const handleSeedVehicles = async () => {
    if (window.confirm('Are you sure you want to seed 10 new vehicles? This will add them to the database.')) {
      try {
        await seedVehicles();
        loadData();
      } catch (err) {
        setError((err as Error).message || 'Failed to seed vehicles.');
      }
    }
  };

  const isDevelopment = (import.meta as { env: { MODE: string } }).env?.MODE === 'development';

  const handleSeedContributions = async () => {
    try {
      await seedContributions(10);
      loadData();
      alert('Seeded 10 contributions.');
    } catch (err) {
      setError((err as Error).message || 'Failed to seed contributions.');
    }
  };

  // Define table columns
  const columns: Column<Vehicle>[] = [
    {
      key: 'make',
      header: 'Make',
      accessor: 'make',
      sortable: true,
    },
    {
      key: 'model',
      header: 'Model',
      accessor: 'model',
      sortable: true,
    },
    {
      key: 'year',
      header: 'Year',
      accessor: 'year',
      sortable: true,
    },
    {
      key: 'batteryCapacity',
      header: 'Battery (kWh)',
      accessor: 'batteryCapacity',
      sortable: true,
    },
    {
      key: 'range',
      header: 'Range (km)',
      accessor: 'range',
      sortable: true,
    },
    {
      key: 'chargingSpeed',
      header: 'Charging (kW)',
      accessor: 'chargingSpeed',
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, vehicle) => {
        const pendingUpdateProposals = pendingContributions.filter(
          c => c.changeType === 'UPDATE' && c.targetVehicleId === vehicle.id
        );
        const pendingVariants = pendingContributions.filter(
          c => c.changeType === 'NEW' &&
          c.vehicleData.make.toLowerCase() === vehicle.make.toLowerCase() &&
          c.vehicleData.model.toLowerCase() === vehicle.model.toLowerCase() &&
          Math.abs(c.vehicleData.year - vehicle.year) <= 2
        );

        return (
          <div className="flex flex-col gap-1 min-w-[120px]">
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {userRole === 'ADMIN' && (
                <>
                  <button
                    className="btn btn-info btn-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowModal(vehicle);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-error btn-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVehicle(vehicle.id!);
                    }}
                  >
                    Delete
                  </button>
                </>
              )}
              {token && userRole !== 'ADMIN' && (
                <>
                  <button
                    className="btn btn-outline btn-success btn-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProposeUpdate(vehicle);
                    }}
                  >
                    Update
                  </button>
                  <button
                    className="btn btn-outline btn-primary btn-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProposeVariant(vehicle);
                    }}
                  >
                    Variant
                  </button>
                </>
              )}
            </div>

            {/* Pending proposals display */}
            <div className="flex flex-col gap-1">
              {pendingUpdateProposals.length > 0 && (
                <Link
                  to="/contributions/browse"
                  state={{ openContributionId: pendingUpdateProposals[0].id }}
                  className="badge badge-warning badge-xs hover:badge-warning-focus"
                  title={`View ${pendingUpdateProposals.length} update proposal(s) pending`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {pendingUpdateProposals.length > 1
                    ? `${pendingUpdateProposals.length} Updates Pending`
                    : `Update Pending (${pendingUpdateProposals[0].votes || 0} votes)`
                  }
                </Link>
              )}
              {pendingVariants.length > 0 && (
                <Link
                  to="/contributions/browse"
                  state={{ openContributionId: pendingVariants[0].id }}
                  className="badge badge-info badge-xs hover:badge-info-focus"
                  title={`View ${pendingVariants.length} variant proposal(s) pending`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {pendingVariants.length} Variant{pendingVariants.length > 1 ? 's' : ''} Pending
                </Link>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold mb-6">EV Database</h1>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {userRole === 'ADMIN' && (
          <>
            <button className="btn btn-primary" onClick={() => handleShowModal()}>
              Add New Vehicle
            </button>
            {isDevelopment && (
              <button className="btn btn-secondary" onClick={handleSeedVehicles}>
                Seed Vehicles
              </button>
            )}
          </>
        )}
        {token && (
          <button className="btn btn-success" onClick={() => navigate('/contribute/vehicle')}>
            Propose New Vehicle
          </button>
        )}
        {isDevelopment && token && (
          <button className="btn btn-outline btn-warning" onClick={handleSeedContributions}>
            Seed Contributions
          </button>
        )}
      </div>

      {/* View controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* Search input for card view */}
        {viewMode === 'cards' && (
          <div className="form-control w-full max-w-xs">
            <label htmlFor="vehicle-search" className="sr-only">
              Search vehicles
            </label>
            <input
              id="vehicle-search"
              type="text"
              placeholder="Search vehicles..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-describedby="search-help"
            />
            <div id="search-help" className="sr-only">
              Search by vehicle make or model
            </div>
          </div>
        )}

        {/* View toggle buttons */}
        <div className="join" role="group" aria-label="View mode selection">
          <button
            className={`btn join-item ${viewMode === 'table' ? 'btn-active' : 'btn-outline'}`}
            onClick={() => handleViewModeToggle('table')}
            aria-pressed={viewMode === 'table'}
            aria-label="Switch to table view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18m-9 8h9m-9 4h9m-9-8H3m0 4h6" />
            </svg>
            Table
          </button>
          <button
            className={`btn join-item ${viewMode === 'cards' ? 'btn-active' : 'btn-outline'}`}
            onClick={() => handleViewModeToggle('cards')}
            aria-pressed={viewMode === 'cards'}
            aria-label="Switch to card view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
            </svg>
            Cards
          </button>
        </div>
      </div>
      {/* Conditional rendering based on view mode */}
      {viewMode === 'table' ? (
        <DataTable<Vehicle>
          data={vehicles}
          columns={columns}
          searchable={true}
          searchPlaceholder="Filter by make or model..."
          searchFields={['make', 'model']}
          sortable={true}
          paginated={true}
          pageSize={10}
          paginationStyle="full"
          loading={loading}
          error={error}
          emptyMessage="No vehicles found."
          zebra={true}
        />
      ) : (
        <VehicleCardGrid
          vehicles={vehicles}
          loading={loading}
          error={error}
          emptyMessage="No vehicles found."
          onEdit={userRole === 'ADMIN' ? handleShowModal : undefined}
          onView={handleViewVehicle}
          onProposeUpdate={handleProposeUpdate}
          onProposeVariant={handleProposeVariant}
          userRole={userRole || undefined}
          pendingContributions={pendingContributions}
          isAuthenticated={!!token}
          searchQuery={searchQuery}
          searchFields={['make', 'model']}
        />
      )}


      {showModal && (
        <div className="modal modal-open">
          <div className={`modal-box w-11/12 ${modalMode === 'view' ? 'max-w-4xl' : 'max-w-2xl'}`}>
            {modalMode === 'view' && currentVehicle ? (
              <VehicleDetailsView
                vehicle={currentVehicle}
                onClose={handleCloseModal}
              />
            ) : (
              <>
                <h3 className="font-bold text-lg mb-4">
                  {contributeMode ? (
                    contributeMode === 'ADD' ? 'Propose New Vehicle' :
                    contributeMode === 'UPDATE' ? 'Propose Update to Vehicle' :
                    contributeMode === 'VARIANT' ? `Propose Variant of ${currentVehicle?.year} ${currentVehicle?.make} ${currentVehicle?.model}` :
                    'Propose Vehicle'
                  ) : (
                    currentVehicle ? 'Edit' : 'Add'
                  )} Vehicle
                </h3>

            {/* Display duplicate error if present */}
            {duplicateError && (
              <div className="alert alert-warning mb-4">
                <div className="flex-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-6 h-6 mx-2 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                  <div>
                    <h3 className="font-bold">Duplicate Vehicle Detected</h3>
                    <div className="text-sm">{duplicateError.message}</div>
                    {duplicateError.existingVehicle && (
                      <div className="text-sm mt-2">
                        <strong>Existing vehicle:</strong> {duplicateError.existingVehicle.year} {duplicateError.existingVehicle.make} {duplicateError.existingVehicle.model}
                        {duplicateError.existingVehicle.batteryCapacity && ` (${duplicateError.existingVehicle.batteryCapacity} kWh)`}
                      </div>
                    )}
                    {duplicateError.suggestions && duplicateError.suggestions.length > 0 && (
                      <div className="text-sm mt-2">
                        <strong>Suggestions:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {duplicateError.suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setDuplicateError(null)}
                >
                  ✕
                </button>
              </div>
            )}

                <div className="modal-action flex-col items-stretch">
                  {contributeMode ? (
                    <ContributionForm
                      onSubmit={async (vehicleData, changeType, targetVehicleId) => {
                        try {
                          await submitContribution(vehicleData, changeType, targetVehicleId);
                          setError(null);
                          setDuplicateError(null);
                          setShowModal(false);
                          setContributeMode(null);
                          loadData();
                        } catch (err) {
                          const error = err as Error & DuplicateError;
                          if (error.suggestions) {
                            // This is a duplicate error
                            setDuplicateError(error);
                            setError(null);
                          } else {
                            // Regular error
                            setError(error.message || 'Failed to submit proposal');
                            setDuplicateError(null);
                          }
                        }
                      }}
                      onCancel={handleCloseModal}
                      initialChangeType={contributeMode === 'ADD' ? 'NEW' : contributeMode === 'VARIANT' ? 'NEW' : 'UPDATE'}
                      initialTargetVehicleId={contributeMode === 'UPDATE' ? currentVehicle?.id : undefined}
                      initialData={contributeMode === 'VARIANT' ? currentVehicle || undefined : currentVehicle || undefined}
                      isVariantMode={contributeMode === 'VARIANT'}
                    />
                  ) : (
                    <MultiStepContributionForm
                      onSubmit={handleAdminSubmit}
                      onCancel={handleCloseModal}
                      initialData={currentVehicle || undefined}
                      initialChangeType={currentVehicle ? 'UPDATE' : 'NEW'}
                      isAdmin={true}
                    />
                  )}
                  <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={handleCloseModal}>✕</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



export default VehiclesPage;
