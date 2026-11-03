import { Eye, EyeOff } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder,
  disabled = false,
  invalid = false,
  describedBy,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="cg-password">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        className="cg-password__toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        disabled={disabled}
      >
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </div>
  );
}
