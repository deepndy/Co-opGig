import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Worker } from '../../../types/domain';
import { VerificationBadge } from '../WorkerBadges';

const worker: Worker = {
  id: 'w1',
  displayName: 'Demo Person',
  serviceCategories: ['plumber'],
  serviceAreaText: 'Kothrud',
  availabilityStatus: 'AVAILABLE',
  verificationStatus: 'VERIFIED',
  isDemo: true,
};

describe('VerificationBadge', () => {
  it('never presents a demo profile as verified even if the mock record says VERIFIED', () => {
    render(<VerificationBadge worker={worker} />);
    expect(screen.getByText('Demo profile')).toBeInTheDocument();
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });
});
