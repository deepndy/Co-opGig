import { Languages } from 'lucide-react';
import { useState } from 'react';

/**
 * Only English is implemented. Other labels are disabled rather than pretending
 * a translation exists.
 */
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const [language, setLanguage] = useState('en');
  return (
    <label className={compact ? 'cg-language cg-language--compact' : 'cg-language'}>
      <Languages size={16} aria-hidden="true" />
      <span className="visually-hidden">Language</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        aria-label="Language"
        className="cg-language__select"
      >
        <option value="en">English</option>
        <option value="hi" disabled>
          हिन्दी (coming soon)
        </option>
        <option value="mr" disabled>
          मराठी (coming soon)
        </option>
      </select>
    </label>
  );
}
