import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('app shell', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('keeps exactly one floating assistant bubble across route navigation', async () => {
    const user = userEvent.setup();
    render(<App />);

    const bubble = await screen.findByRole('button', { name: 'Open Co-opGig assistant' });
    expect(bubble).toBeInTheDocument();

    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    await user.click(within(primaryNav).getByRole('link', { name: 'Services' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Everyday help, from local cooperative workers/i })).toBeInTheDocument(),
    );

    expect(screen.getAllByRole('button', { name: 'Open Co-opGig assistant' })).toHaveLength(1);
  });
});
