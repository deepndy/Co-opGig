import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../../auth/AuthContext';
import { BookPage } from '../BookPage';

function renderBooking() {
  return render(
    <MemoryRouter initialEntries={['/book']}>
      <AuthProvider>
        <BookPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('booking flow', () => {
  it('requires an explicit confirmation before posting a request', async () => {
    const user = userEvent.setup();
    renderBooking();

    const categorySelect = screen.getByLabelText('Service category');
    await waitFor(() => expect(categorySelect.querySelectorAll('option').length).toBeGreaterThan(1));

    await user.type(
      screen.getByLabelText('What needs to be done?'),
      'Water is leaking under the kitchen sink and the cabinet is damp.',
    );
    await user.selectOptions(categorySelect, 'plumber');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.type(screen.getByLabelText('Locality or service address'), 'Kothrud, Pune');
    await user.click(screen.getByRole('button', { name: 'Review request' }));

    const submit = screen.getByRole('button', { name: /Confirm & post request/i });
    expect(submit).toBeDisabled();

    const confirmation = screen.getByLabelText(/I have reviewed the description/i);
    await user.click(confirmation);
    await waitFor(() => expect(submit).toBeEnabled());

    await user.click(submit);
    expect(await screen.findByRole('heading', { name: /Your service request has been created/i })).toBeInTheDocument();
    expect(screen.getByText('No payment taken')).toBeInTheDocument();
    expect(screen.queryByText(/Payment successful/i)).not.toBeInTheDocument();
  });

  it('will not submit without a confirmation checkbox even if fields are valid', async () => {
    const user = userEvent.setup();
    renderBooking();

    const categorySelect = screen.getByLabelText('Service category');
    await waitFor(() => expect(categorySelect.querySelectorAll('option').length).toBeGreaterThan(1));
    await user.type(
      screen.getByLabelText('What needs to be done?'),
      'The bedroom ceiling fan makes a rattling noise at high speed.',
    );
    await user.selectOptions(categorySelect, 'electrician');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText('Locality or service address'), 'Karve Nagar');
    await user.click(screen.getByRole('button', { name: 'Review request' }));

    expect(screen.getByRole('button', { name: /Confirm & post request/i })).toBeDisabled();
  });
});
