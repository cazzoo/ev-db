import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import RejectionHistory from './RejectionHistory';
import * as api from '../services/api';

vi.mock('../services/api');

describe('RejectionHistory', () => {
  it('renders logs returned from API', async () => {
    (api.fetchModerationLogs as unknown as vi.Mock).mockResolvedValueOnce([
      {
        id: 1,
        action: 'REJECT',
        moderatorId: 2,
        moderatorEmail: 'mod@example.com',
        comment: 'Please correct your data',
        createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
      },
    ]);

    render(<RejectionHistory contributionId={123} />);

    await waitFor(() => {
      expect(screen.getByText(/Rejection history/i)).toBeInTheDocument();
      expect(screen.getByText(/Please correct your data/i)).toBeInTheDocument();
      expect(screen.getByText(/mod@example.com/i)).toBeInTheDocument();
    });
  });

  it('handles empty logs', async () => {
    (api.fetchModerationLogs as unknown as vi.Mock).mockResolvedValueOnce([]);
    render(<RejectionHistory contributionId={456} />);
    await waitFor(() => {
      // No header means component rendered null
      expect(screen.queryByText(/Rejection history/i)).toBeNull();
    });
  });
});

