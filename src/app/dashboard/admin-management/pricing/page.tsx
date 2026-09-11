"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Car,
  Clock,
  Coins,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  ToggleLeft,
  X,
} from "lucide-react";
import TablePagination from "@/components/TablePagination";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";

type VehiclePricing = Tables<"vehicle_pricing">;
const PRICING_PAGE_SIZE = 10;

// --- Shared form building blocks -----------------------------------------
// (Kept local to this file on purpose — see driver-management/page.tsx for
// the identical set of helpers used by the Create Driver / Assign Driver
// modals. If you'd rather not maintain two copies, pull these into a shared
// component file later and import from there instead.)

function RequiredMark() {
  return <span className="text-red-500">*</span>;
}

function FieldLabel({
  required,
  children,
}: {
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {children} {required && <RequiredMark />}
    </label>
  );
}

const inputClasses =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

function FormSectionCard({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: typeof Banknote;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-700/40">
        <Icon size={15} className="text-orange-600 dark:text-orange-400" />
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {label}
        </p>
      </div>

      <div className="space-y-4 bg-white p-4 dark:bg-gray-800">
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  icon: Icon,
  eyebrow,
  title,
  onClose,
  disabled,
}: {
  icon?: typeof Banknote;
  eyebrow: string;
  title: string;
  onClose: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300">
            <Icon size={20} />
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
            {eyebrow}
          </p>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        aria-label="Close"
        title="Close"
        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <X size={22} />
      </button>
    </div>
  );
}

function ModalFooter({
  onCancel,
  formId,
  isSubmitting,
  submitLabel,
  submitIcon: SubmitIcon,
  submitDisabled,
}: {
  onCancel: () => void;
  formId: string;
  isSubmitting: boolean;
  submitLabel: string;
  submitIcon: typeof Banknote;
  submitDisabled?: boolean;
}) {
  return (
    <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Cancel
      </button>

      <button
        type="submit"
        form={formId}
        disabled={isSubmitting || submitDisabled}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <SubmitIcon size={16} />
        )}

        {submitLabel}
      </button>
    </div>
  );
}

type PricingForm = {
  id: string | null;
  vehicleType: string;
  baseFare: string;
  pricePerKm: string;
  pricePerMin: string;
  delayPricePerMin: string;
  freeDelayMins: string;
  maxDelayMins: string;
  stateLevy: string;
  vatPercentage: string;
  isActive: boolean;
};

const emptyForm: PricingForm = {
  id: null,
  vehicleType: "",
  baseFare: "",
  pricePerKm: "",
  pricePerMin: "",
  delayPricePerMin: "",
  freeDelayMins: "0",
  maxDelayMins: "0",
  stateLevy: "0",
  vatPercentage: "0",
  isActive: true,
};

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

function toFormValues(row: VehiclePricing): PricingForm {
  return {
    id: row.id,
    vehicleType: row.vehicle_type,
    baseFare: String(row.base_fare),
    pricePerKm: String(row.price_per_km),
    pricePerMin: String(row.price_per_min),
    delayPricePerMin: String(row.delay_price_per_min),
    freeDelayMins: String(row.free_delay_mins),
    maxDelayMins: String(row.max_delay_mins),
    stateLevy: String(row.state_levy),
    vatPercentage: String(row.vat_percentage),
    isActive: row.is_active,
  };
}

function NumberField({
  label,
  required,
  value,
  onChange,
  disabled,
  step = "0.01",
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  step?: string;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>

      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={inputClasses}
      />
    </div>
  );
}

function PricingModal({
  initialValues,
  onClose,
}: {
  initialValues: PricingForm;
  onClose: (didSave: boolean) => void;
}) {
  const [form, setForm] = useState<PricingForm>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(form.id);

  const updateField = <Field extends keyof PricingForm>(
    field: Field,
    value: PricingForm[Field],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.vehicleType.trim()) {
      notify.error("Vehicle type is required");
      return;
    }

    const numericFields: [keyof PricingForm, string][] = [
      ["baseFare", "Base fare"],
      ["pricePerKm", "Price per km"],
      ["pricePerMin", "Price per min"],
      ["delayPricePerMin", "Delay price per min"],
      ["freeDelayMins", "Free delay minutes"],
      ["maxDelayMins", "Max delay minutes"],
      ["stateLevy", "State levy"],
      ["vatPercentage", "VAT percentage"],
    ];

    for (const [field, label] of numericFields) {
      const value = Number(form[field]);

      if (!Number.isFinite(value) || value < 0) {
        notify.error(`${label} must be a valid non-negative number`);
        return;
      }
    }

    setIsSubmitting(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      notify.error("Your session expired. Please sign in again");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      id: form.id ?? undefined,
      vehicleType: form.vehicleType.trim(),
      baseFare: Number(form.baseFare),
      pricePerKm: Number(form.pricePerKm),
      pricePerMin: Number(form.pricePerMin),
      delayPricePerMin: Number(form.delayPricePerMin),
      freeDelayMins: Number(form.freeDelayMins),
      maxDelayMins: Number(form.maxDelayMins),
      stateLevy: Number(form.stateLevy),
      vatPercentage: Number(form.vatPercentage),
      isActive: form.isActive,
    };

    const response = await fetch("/api/admin/pricing", {
      method: isEditing ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { error?: string };

    setIsSubmitting(false);

    if (!response.ok) {
      notify.error(result.error || "Could not save the pricing plan");
      return;
    }

    notify.success(isEditing ? "Pricing plan updated" : "Pricing plan created");

    onClose(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-6">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-800 sm:h-auto sm:max-h-[92vh] sm:rounded-xl">
        <ModalHeader
          eyebrow="Admin Management"
          title={isEditing ? "Edit Pricing Plan" : "New Pricing Plan"}
          onClose={() => onClose(false)}
          disabled={isSubmitting}
        />

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <form id="pricing-form" onSubmit={handleSubmit} className="space-y-5">
            <FormSectionCard icon={Car} label="Vehicle">
              <div>
                <FieldLabel required>Vehicle Type</FieldLabel>

                <input
                  type="text"
                  value={form.vehicleType}
                  onChange={(event) =>
                    updateField("vehicleType", event.target.value)
                  }
                  placeholder="e.g. Limpopo Pro"
                  disabled={isSubmitting || isEditing}
                  className={inputClasses}
                />

                {isEditing && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Vehicle type can&apos;t be changed once a plan exists —
                    create a new plan instead.
                  </p>
                )}
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Coins}
              label="Fare Rates"
              description="What the rider is charged for the base trip."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberField
                  label="Base Fare"
                  required
                  value={form.baseFare}
                  onChange={(value) => updateField("baseFare", value)}
                  disabled={isSubmitting}
                />

                <NumberField
                  label="Price / KM"
                  required
                  value={form.pricePerKm}
                  onChange={(value) => updateField("pricePerKm", value)}
                  disabled={isSubmitting}
                />

                <NumberField
                  label="Price / Min"
                  required
                  value={form.pricePerMin}
                  onChange={(value) => updateField("pricePerMin", value)}
                  disabled={isSubmitting}
                />

                <NumberField
                  label="Delay Price / Min"
                  required
                  value={form.delayPricePerMin}
                  onChange={(value) => updateField("delayPricePerMin", value)}
                  disabled={isSubmitting}
                />
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Clock}
              label="Delay Rules"
              description="How long a driver can wait before delay pricing kicks in, and its cap."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberField
                  label="Free Delay (mins)"
                  value={form.freeDelayMins}
                  onChange={(value) => updateField("freeDelayMins", value)}
                  disabled={isSubmitting}
                  step="1"
                />

                <NumberField
                  label="Max Delay (mins)"
                  value={form.maxDelayMins}
                  onChange={(value) => updateField("maxDelayMins", value)}
                  disabled={isSubmitting}
                  step="1"
                />
              </div>
            </FormSectionCard>

            <FormSectionCard icon={Receipt} label="Charges">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberField
                  label="State Levy"
                  value={form.stateLevy}
                  onChange={(value) => updateField("stateLevy", value)}
                  disabled={isSubmitting}
                />

                <NumberField
                  label="VAT (%)"
                  value={form.vatPercentage}
                  onChange={(value) => updateField("vatPercentage", value)}
                  disabled={isSubmitting}
                />
              </div>
            </FormSectionCard>

            <FormSectionCard icon={ToggleLeft} label="Status">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    updateField("isActive", event.target.checked)
                  }
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                Active — visible to riders and used for new trip quotes
              </label>
            </FormSectionCard>
          </form>
        </div>

        <ModalFooter
          onCancel={() => onClose(false)}
          formId="pricing-form"
          isSubmitting={isSubmitting}
          submitLabel={isEditing ? "Save Changes" : "Create Plan"}
          submitIcon={Banknote}
        />
      </div>
    </div>
  );
}

export default function ManagePricingPage() {
  const [pricing, setPricing] = useState<VehiclePricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalState, setModalState] = useState<PricingForm | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadPricing = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      notify.error("Your session expired. Please sign in again");
      setIsLoading(false);
      return;
    }

    const response = await fetch("/api/admin/pricing", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const result = (await response.json()) as {
      pricing?: VehiclePricing[];
      error?: string;
    };

    setIsLoading(false);

    if (!response.ok || !result.pricing) {
      notify.error(result.error || "Could not load pricing plans");
      return;
    }

    setPricing(result.pricing);
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pricing.length]);

  const sortedPricing = useMemo(
    () =>
      [...pricing].sort((a, b) => a.vehicle_type.localeCompare(b.vehicle_type)),
    [pricing],
  );

  const pageStartIndex = (currentPage - 1) * PRICING_PAGE_SIZE;
  const paginatedPricing = sortedPricing.slice(
    pageStartIndex,
    pageStartIndex + PRICING_PAGE_SIZE,
  );

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Manage Pricing
              </h1>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Fare rates applied per vehicle type across the platform.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalState(emptyForm)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              <Plus size={16} />
              New Pricing Plan
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {[
                    "Vehicle Type",
                    "Base Fare",
                    "Per KM",
                    "Per Min",
                    "Delay/Min",
                    "VAT",
                    "Status",
                    "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : sortedPricing.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No pricing plans yet.
                    </td>
                  </tr>
                ) : (
                  paginatedPricing.map((row) => (
                    <tr
                      key={row.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {row.vehicle_type}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {currency.format(row.base_fare)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {currency.format(row.price_per_km)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {currency.format(row.price_per_min)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {currency.format(row.delay_price_per_min)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {row.vat_percentage}%
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            row.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {row.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <button
                          type="button"
                          onClick={() => setModalState(toFormValues(row))}
                          className="rounded-lg border border-gray-300 p-2 text-gray-600 transition hover:border-orange-600 hover:text-orange-600 dark:border-gray-600 dark:text-gray-300 dark:hover:border-orange-400 dark:hover:text-orange-400"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            pageSize={PRICING_PAGE_SIZE}
            totalItems={sortedPricing.length}
            itemLabel="pricing plans"
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {modalState && (
        <PricingModal
          initialValues={modalState}
          onClose={(didSave) => {
            setModalState(null);

            if (didSave) {
              loadPricing();
            }
          }}
        />
      )}
    </div>
  );
}
