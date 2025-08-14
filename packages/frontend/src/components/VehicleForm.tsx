import React, { useState, useEffect } from 'react';
import { Vehicle } from '../services/api';

interface VehicleFormProps {
  initialData?: Vehicle;
  onSubmit: (vehicle: Vehicle) => void;
  onCancel: () => void;
}

const VehicleForm: React.FC<VehicleFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [make, setMake] = useState(initialData?.make || '');
  const [model, setModel] = useState(initialData?.model || '');
  const [year, setYear] = useState(initialData?.year || new Date().getFullYear());
  const [batteryCapacity, setBatteryCapacity] = useState(initialData?.batteryCapacity || 0);
  const [range, setRange] = useState(initialData?.range || 0);
  const [chargingSpeed, setChargingSpeed] = useState(initialData?.chargingSpeed || 0);

  useEffect(() => {
    if (initialData) {
      setMake(initialData.make || '');
      setModel(initialData.model || '');
      setYear(initialData.year || new Date().getFullYear());
      setBatteryCapacity(initialData.batteryCapacity || 0);
      setRange(initialData.range || 0);
      setChargingSpeed(initialData.chargingSpeed || 0);
    }
  }, [initialData]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      id: initialData?.id,
      make,
      model,
      year,
      batteryCapacity: batteryCapacity || undefined,
      range: range || undefined,
      chargingSpeed: chargingSpeed || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Make</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={make}
          onChange={(e) => setMake(e.target.value)}
          required
        />
      </div>
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Model</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          required
        />
      </div>
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Year</span>
        </label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
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
        />
      </div>
      <div className="flex gap-2 mt-6">
        <button type="submit" className="btn btn-primary">
          {initialData ? 'Update' : 'Create'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default VehicleForm;
