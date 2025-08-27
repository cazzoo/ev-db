import { describe, it, expect } from 'vitest';

// Example test to demonstrate the backend testing setup
// This can be removed once actual service/utility tests are written

describe('Example Backend Tests', () => {
  describe('String utilities', () => {
    it('should handle string transformations', () => {
      const input = 'Electric Vehicle Database';
      expect(input.toLowerCase()).toBe('electric vehicle database');
      expect(input.replace(/\s+/g, '-').toLowerCase()).toBe('electric-vehicle-database');
    });

    it('should validate email format', () => {
      const validEmail = 'user@example.com';
      const invalidEmail = 'invalid-email';
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(validEmail)).toBe(true);
      expect(emailRegex.test(invalidEmail)).toBe(false);
    });
  });

  describe('Array utilities', () => {
    it('should handle array operations', () => {
      const vehicles = [
        { id: 1, make: 'Tesla', model: 'Model 3' },
        { id: 2, make: 'BMW', model: 'i3' },
        { id: 3, make: 'Nissan', model: 'Leaf' }
      ];

      expect(vehicles.length).toBe(3);
      expect(vehicles.find(v => v.make === 'Tesla')).toBeDefined();
      expect(vehicles.filter(v => v.make.startsWith('B'))).toHaveLength(1);
    });

    it('should handle data transformations', () => {
      const data = [1, 2, 3, 4, 5];
      const doubled = data.map(n => n * 2);
      const sum = data.reduce((acc, n) => acc + n, 0);

      expect(doubled).toEqual([2, 4, 6, 8, 10]);
      expect(sum).toBe(15);
    });
  });

  describe('Object utilities', () => {
    it('should handle object operations', () => {
      const vehicle = {
        id: 1,
        make: 'Tesla',
        model: 'Model 3',
        year: 2023,
        electric: true
      };

      expect(Object.keys(vehicle)).toHaveLength(5);
      expect(vehicle.electric).toBe(true);
      expect(vehicle.make).toBe('Tesla');
    });

    it('should handle object merging', () => {
      const base = { id: 1, make: 'Tesla' };
      const update = { model: 'Model 3', year: 2023 };
      const merged = { ...base, ...update };

      expect(merged).toEqual({
        id: 1,
        make: 'Tesla',
        model: 'Model 3',
        year: 2023
      });
    });
  });

  describe('Date utilities', () => {
    it('should handle date operations', () => {
      const now = new Date();
      const timestamp = now.getTime();
      const isoString = now.toISOString();

      expect(typeof timestamp).toBe('number');
      expect(typeof isoString).toBe('string');
      expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
