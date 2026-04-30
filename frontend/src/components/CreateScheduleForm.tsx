import React, { useState } from 'react';
import type { CreateScheduleForm as FormData } from '../types';

interface Props {
  onSubmit: (data: FormData) => Promise<void>;
}

const DEFAULT_FORM: FormData = {
  beneficiary: '',
  startDate: new Date().toISOString().split('T')[0],
  cliffMonths: 3,
  totalMonths: 12,
  totalAmount: '',
  revocable: true,
};

/**
 * Form for creating a new vesting schedule.
 * Validates inputs before calling onSubmit.
 */
export function CreateScheduleForm({ onSubmit }: Props) {
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const update = (field: keyof FormData, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!form.beneficiary.trim()) {
      newErrors.beneficiary = 'Beneficiary address is required';
    } else if (!/^G[A-Z2-7]{55}$/.test(form.beneficiary.trim())) {
      newErrors.beneficiary = 'Invalid Stellar address format';
    }

    if (!form.totalAmount || isNaN(Number(form.totalAmount)) || Number(form.totalAmount) <= 0) {
      newErrors.totalAmount = 'Amount must be a positive number';
    }

    if (form.cliffMonths < 0) {
      newErrors.cliffMonths = 'Cliff cannot be negative';
    }

    if (form.totalMonths <= 0) {
      newErrors.totalMonths = 'Total duration must be positive';
    }

    if (form.cliffMonths > form.totalMonths) {
      newErrors.cliffMonths = 'Cliff cannot exceed total duration';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(form);
      setForm(DEFAULT_FORM);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <h2>Create Vesting Schedule</h2>

      <Field
        label="Beneficiary Address"
        error={errors.beneficiary}
        hint="The Stellar address that will receive the vested tokens"
      >
        <input
          type="text"
          placeholder="G..."
          value={form.beneficiary}
          onChange={(e) => update('beneficiary', e.target.value)}
        />
      </Field>

      <Field
        label="Total Amount (tokens)"
        error={errors.totalAmount}
        hint="Total number of tokens to vest"
      >
        <input
          type="number"
          min="1"
          placeholder="e.g. 12000"
          value={form.totalAmount}
          onChange={(e) => update('totalAmount', e.target.value)}
        />
      </Field>

      <Field label="Vesting Start Date" error={errors.startDate}>
        <input
          type="date"
          value={form.startDate}
          onChange={(e) => update('startDate', e.target.value)}
        />
      </Field>

      <div className="form-row">
        <Field
          label="Cliff (months)"
          error={errors.cliffMonths}
          hint="Months before any tokens unlock"
        >
          <input
            type="number"
            min="0"
            max={form.totalMonths}
            value={form.cliffMonths}
            onChange={(e) => update('cliffMonths', Number(e.target.value))}
          />
        </Field>

        <Field
          label="Total Duration (months)"
          error={errors.totalMonths}
          hint="Total vesting period"
        >
          <input
            type="number"
            min="1"
            value={form.totalMonths}
            onChange={(e) => update('totalMonths', Number(e.target.value))}
          />
        </Field>
      </div>

      <Field label="Revocable">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.revocable}
            onChange={(e) => update('revocable', e.target.checked)}
          />
          Allow owner to revoke unvested tokens
        </label>
      </Field>

      {/* Preview */}
      <div className="schedule-preview">
        <p>
          <strong>{form.totalAmount || '0'}</strong> tokens vest over{' '}
          <strong>{form.totalMonths}</strong> months with a{' '}
          <strong>{form.cliffMonths}</strong>-month cliff.
        </p>
      </div>

      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
        {loading ? 'Creating...' : 'Create Schedule'}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`form-field ${error ? 'form-field--error' : ''}`}>
      <label className="form-label">{label}</label>
      {children}
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
