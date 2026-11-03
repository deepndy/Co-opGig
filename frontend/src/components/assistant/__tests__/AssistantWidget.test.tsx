import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AssistantWidget } from '../AssistantWidget';

function renderWidget() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AssistantWidget />
    </MemoryRouter>,
  );
}

describe('AssistantWidget', () => {
  it('renders one bubble, opens one panel and keeps the conversation in it', async () => {
    const user = userEvent.setup();
    const { container } = renderWidget();

    const openButton = screen.getByRole('button', { name: 'Open Co-opGig assistant' });
    expect(container.querySelectorAll('.cg-assistant__launcher')).toHaveLength(1);
    await user.click(openButton);

    const panel = screen.getByRole('dialog', { name: 'Co-opGig assistant chat' });
    expect(panel).toHaveAttribute('id', 'coopgig-assistant-panel');

    await user.type(screen.getByLabelText('Message to the Co-opGig assistant'), 'Water is leaking under the kitchen sink');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText(/This sounds like plumber work/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review in booking form/i })).toBeInTheDocument();
    expect(container.querySelectorAll('.cg-assistant__launcher')).toHaveLength(1);
  });

  it('closes with Escape and returns focus to the single bubble', async () => {
    const user = userEvent.setup();
    const { container } = renderWidget();
    await user.click(screen.getByRole('button', { name: 'Open Co-opGig assistant' }));

    const panel = screen.getByRole('dialog', { name: 'Co-opGig assistant chat' });
    fireEvent.keyDown(panel, { key: 'Escape' });

    const bubble = screen.getByRole('button', { name: 'Open Co-opGig assistant' });
    expect(panel).not.toBeInTheDocument();
    expect(bubble).toHaveFocus();
    expect(container.querySelectorAll('.cg-assistant__launcher')).toHaveLength(1);
  });

  it('never shows two floating bubble controls when opened', async () => {
    const user = userEvent.setup();
    const { container } = renderWidget();
    await user.click(screen.getByRole('button', { name: 'Open Co-opGig assistant' }));
    expect(screen.getAllByRole('button', { name: /Co-opGig assistant/ })).toHaveLength(1);
    expect(container.querySelectorAll('.cg-assistant__launcher')).toHaveLength(1);
  });
});
