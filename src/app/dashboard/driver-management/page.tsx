"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import {
  Car,
  CheckCircle,
  XCircle,
  UserPlus,
  X,
  Loader2,
  User,
  MapPin,
  FileText,
  FileCheck,
  HeartPulse,
  Key,
  Upload,
  RefreshCw,
  Search,
  Mail,
  Phone,
  Clock,
} from "lucide-react";
import { notify } from "@/lib/notify";
import TablePagination from "@/components/TablePagination";
import { supabase } from "@/lib/supabase";

type AssignableDriver = {
  uuid: string;
  first_name: string;
  last_name: string;
  phone_num: string;
  email: string;
  profile_img: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  location_lat: number | null;
  location_lng: number | null;
  is_online: boolean;
  admin_verify: boolean;
};

type VehicleAssignment = {
  id: string;
  vehicle_type: string | null;
  vehicle_model: string | null;
  vehicle_num: string | null;
  assigned: string | null;
  assigned_date: string | null;
  access: string | null;
  access_duration: string | null;
  created_at: string;
  driver: AssignableDriver | null;
};

type VehicleOption = string;

type HealthStatus = "no" | "yes";

type NewDriverForm = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  experience: string;
  nin: string;
  licenseUpload: string;
  healthStatus: HealthStatus;
  healthYes: string;
};

const nigerianStates = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT (Abuja)",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

const sanitizeDigits = (value: string, maxLength: number) =>
  value.replace(/\D/g, "").slice(0, maxLength);

const emptyDriverForm: NewDriverForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  address: "",
  city: "",
  state: "",
  experience: "",
  nin: "",
  licenseUpload: "",
  healthStatus: "no",
  healthYes: "",
};

const VEHICLES_PAGE_SIZE = 10;

const accessOptions = [
  { value: "open", label: "Open" },
  { value: "rented", label: "Rented" },
] as const;

const geoKey = (lat: number, lng: number) =>
  `${lat.toFixed(3)},${lng.toFixed(3)}`;

const initials = (first: string, last: string) =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

// Same palette/hash approach used on the User Management page, so a given
// driver's fallback avatar color is stable and consistent across both pages.
const avatarPalette = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
];

const getAvatarColor = (name: string) => {
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  return avatarPalette[Math.abs(hash) % avatarPalette.length];
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

// --- Shared form building blocks -----------------------------------------

function RequiredMark() {
  return <span className="text-red-500">*</span>;
}

function FormSectionCard({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: typeof User;
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

// --- Shared modal chrome ---------------------------------------------------
// CreateDriverModal, AssignDriverModal, and VehicleDetailsModal all share
// this icon-badge header / Cancel-Submit-or-Close footer, matching the
// modal chrome used on the User Management page.

function ModalHeader({
  icon: Icon,
  eyebrow,
  title,
  onClose,
  disabled,
}: {
  icon: typeof User;
  eyebrow: string;
  title: string;
  onClose: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300">
          <Icon size={20} />
        </div>
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
  submitIcon: typeof UserPlus;
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

function DocumentUploadField({
  label,
  value,
  onUploaded,
  disabled,
}: {
  label: string;
  value: string;
  onUploaded: (url: string) => void;
  disabled?: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notify.error("File is too large. Maximum size is 10MB.");
      return;
    }

    setIsUploading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      notify.error("Your session expired. Please sign in again");
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/upload-document", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    const result = (await response.json()) as { url?: string; error?: string };

    setIsUploading(false);

    if (!response.ok || !result.url) {
      notify.error(result.error || "Could not upload file");
      return;
    }

    onUploaded(result.url);
    notify.success("Document uploaded");
  };

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 ${
            disabled || isUploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {isUploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {isUploading
            ? "Uploading..."
            : value
              ? "Replace file"
              : "Upload file"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            disabled={disabled || isUploading}
            onChange={handleFileChange}
          />
        </label>
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
          >
            <FileCheck size={14} /> View uploaded file
          </a>
        )}
      </div>
    </div>
  );
}

function CreateDriverModal({
  onClose,
}: {
  onClose: (created: boolean) => void;
}) {
  const [form, setForm] = useState<NewDriverForm>(emptyDriverForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <Key extends keyof NewDriverForm>(
    field: Key,
    value: NewDriverForm[Key],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim().toLowerCase();
    const phoneNumber = form.phoneNumber.trim();

    if (!firstName || !lastName) {
      notify.error("First name and last name are required");
      return;
    }

    if (!email || !email.includes("@")) {
      notify.error("Please enter a valid email address");
      return;
    }

    if (!phoneNumber) {
      notify.error("Phone number is required");
      return;
    }

    if (!/^\d{11}$/.test(phoneNumber)) {
      notify.error("Phone number must be exactly 11 digits");
      return;
    }

    if (form.nin && !/^\d{11}$/.test(form.nin)) {
      notify.error("NIN must be exactly 11 digits");
      return;
    }

    if (form.healthStatus === "yes" && !form.healthYes.trim()) {
      notify.error("Please describe the health condition");
      return;
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

    const response = await fetch("/api/admin/create-driver", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        firstName,
        lastName,
        phoneNumber,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        experience: form.experience.trim() || null,
        nin: form.nin.trim() || null,
        licenseUpload: form.licenseUpload.trim() || null,
        healthStatus: form.healthStatus,
        healthYes: form.healthYes.trim() || null,
      }),
    });

    const result = (await response.json()) as {
      driver?: { uuid: string };
      invitationMessage?: string;
      emailSent?: boolean;
      emailError?: string | null;
      inviteUrl?: string | null;
      error?: string;
    };

    setIsSubmitting(false);

    if (!response.ok || !result.driver) {
      notify.error(result.error || "Could not create driver");
      return;
    }

    if (result.invitationMessage) {
      console.info(result.invitationMessage);
    }

    if (result.emailSent) {
      notify.success(`Driver created. Invite email sent to ${email}.`);
    } else {
      if (result.inviteUrl) {
        console.info("Driver invite URL:", result.inviteUrl);
      }
      notify.success(
        `Driver created, but the invite email failed${
          result.emailError ? ` (${result.emailError})` : ""
        }. The invite link is in the console.`,
      );
    }

    onClose(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-6">
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-800 sm:h-auto sm:max-h-[92vh] sm:rounded-xl">
        <ModalHeader
          icon={UserPlus}
          eyebrow="Driver Management"
          title="Create Driver"
          onClose={() => onClose(false)}
          disabled={isSubmitting}
        />

        <form
          id="create-driver-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5"
        >
          <div className="space-y-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Fields marked <RequiredMark /> are required. The driver will
              receive an email invitation to set up their account.
            </p>

            <FormSectionCard icon={User} label="Personal Details">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel required>First Name</FieldLabel>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(event) =>
                      updateField("firstName", event.target.value)
                    }
                    placeholder="First name"
                    disabled={isSubmitting}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <FieldLabel required>Last Name</FieldLabel>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(event) =>
                      updateField("lastName", event.target.value)
                    }
                    placeholder="Last name"
                    disabled={isSubmitting}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <FieldLabel required>Email Address</FieldLabel>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="driver@example.com"
                    disabled={isSubmitting}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <FieldLabel required>Phone Number</FieldLabel>
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(event) =>
                      updateField(
                        "phoneNumber",
                        sanitizeDigits(event.target.value, 11),
                      )
                    }
                    placeholder="08012345678"
                    maxLength={11}
                    disabled={isSubmitting}
                    className={inputClasses}
                  />
                </div>
              </div>
            </FormSectionCard>

            <FormSectionCard icon={MapPin} label="Location">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <FieldLabel>Address</FieldLabel>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    placeholder="Street address"
                    disabled={isSubmitting}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <FieldLabel>City</FieldLabel>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(event) =>
                      updateField("city", event.target.value)
                    }
                    placeholder="City"
                    disabled={isSubmitting}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <FieldLabel>State</FieldLabel>
                  <select
                    value={form.state}
                    onChange={(event) =>
                      updateField("state", event.target.value)
                    }
                    disabled={isSubmitting}
                    className={inputClasses}
                  >
                    <option value="">Select state</option>
                    {nigerianStates.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </FormSectionCard>

            <FormSectionCard icon={FileText} label="Experience & Documents">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <FieldLabel>Years of Experience</FieldLabel>
                  <input
                    type="text"
                    value={form.experience}
                    onChange={(event) =>
                      updateField("experience", event.target.value)
                    }
                    placeholder="e.g. 5"
                    disabled={isSubmitting}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <FieldLabel>National ID Number (NIN)</FieldLabel>
                  <input
                    type="text"
                    value={form.nin}
                    onChange={(event) =>
                      updateField("nin", sanitizeDigits(event.target.value, 11))
                    }
                    placeholder="12345678901"
                    maxLength={11}
                    disabled={isSubmitting}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <DocumentUploadField
                    label="Driver's License Document"
                    value={form.licenseUpload}
                    onUploaded={(url) => updateField("licenseUpload", url)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={HeartPulse}
              label="Health"
              description="Does the driver have any health condition we should be aware of?"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Health Status</FieldLabel>
                  <select
                    value={form.healthStatus}
                    onChange={(event) =>
                      updateField(
                        "healthStatus",
                        event.target.value as HealthStatus,
                      )
                    }
                    disabled={isSubmitting}
                    className={inputClasses}
                  >
                    <option value="no">No known condition</option>
                    <option value="yes">Has a condition</option>
                  </select>
                </div>
              </div>

              {form.healthStatus === "yes" && (
                <div>
                  <FieldLabel required>
                    Please describe the health condition
                  </FieldLabel>
                  <textarea
                    value={form.healthYes}
                    onChange={(event) =>
                      updateField("healthYes", event.target.value)
                    }
                    rows={3}
                    placeholder="Describe the condition"
                    disabled={isSubmitting}
                    className={inputClasses}
                  />
                </div>
              )}
            </FormSectionCard>
          </div>
        </form>

        <ModalFooter
          onCancel={() => onClose(false)}
          formId="create-driver-form"
          isSubmitting={isSubmitting}
          submitLabel="Create Driver"
          submitIcon={UserPlus}
        />
      </div>
    </div>
  );
}

// --- Stat card ------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Car;
  label: string;
  value: number;
  tone: "blue" | "emerald" | "red";
}) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    red: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  }[tone];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full ${toneClasses}`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function UnassignedBadge() {
  return (
    <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800">
      Unassigned
    </span>
  );
}

// Same badge and presence-dot styling as the User Management page, so
// verification / online state reads identically across both screens.

function StatusBadge({
  active,
  trueLabel,
  falseLabel,
}: {
  active: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800"
          : "bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600"
      }`}
    >
      {active ? trueLabel : falseLabel}
    </span>
  );
}

function PresenceDot({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
      <span
        className={`h-2 w-2 rounded-full ${
          online ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
        }`}
        aria-hidden="true"
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}

// --- Assign driver modal --------------------------------------------------

type AssignForm = {
  vehicleType: string;
  vehicleModel: string;
  vehicleNumber: string;
  assignedDriver: string;
  access: string;
};

function AssignDriverModal({
  drivers,
  vehicleOptions,
  onClose,
}: {
  drivers: AssignableDriver[];
  vehicleOptions: VehicleOption[];
  onClose: (didAssign: boolean) => void;
}) {
  const [form, setForm] = useState<AssignForm>({
    vehicleType: vehicleOptions[0] ?? "",
    vehicleModel: "",
    vehicleNumber: "",
    assignedDriver: "",
    access: "open",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <Field extends keyof AssignForm>(
    field: Field,
    value: AssignForm[Field],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectedDriver = drivers.find(
    (driver) => driver.uuid === form.assignedDriver,
  );
  const requiresDuration = form.access === "rented";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.vehicleType || !form.vehicleModel || !form.vehicleNumber.trim()) {
      notify.error("Vehicle type, model and number are required");
      return;
    }

    if (!form.assignedDriver) {
      notify.error("Select a driver to assign");
      return;
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

    const response = await fetch("/api/admin/vehicles", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vehicleType: form.vehicleType,
        vehicleModel: form.vehicleModel.trim(),
        vehicleNumber: form.vehicleNumber.trim(),
        assignedDriver: form.assignedDriver,
        access: form.access,
      }),
    });

    const result = (await response.json()) as { error?: string };

    setIsSubmitting(false);

    if (!response.ok) {
      notify.error(result.error || "Could not assign the vehicle");
      return;
    }

    notify.success("Vehicle assigned successfully");
    onClose(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-6">
      <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-800 sm:h-auto sm:max-h-[92vh] sm:rounded-xl">
        <ModalHeader
          icon={Car}
          eyebrow="Driver Management"
          title="Assign Driver"
          onClose={() => onClose(false)}
          disabled={isSubmitting}
        />

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <form
            id="assign-driver-form"
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <FormSectionCard icon={Car} label="Vehicle">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <FieldLabel required>Vehicle Type</FieldLabel>
                  <select
                    value={form.vehicleType}
                    onChange={(event) =>
                      updateField("vehicleType", event.target.value)
                    }
                    disabled={isSubmitting || vehicleOptions.length === 0}
                    className={inputClasses}
                  >
                    {vehicleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel required>Vehicle Model</FieldLabel>
                  <input
                    type="text"
                    value={form.vehicleModel}
                    onChange={(event) =>
                      updateField("vehicleModel", event.target.value)
                    }
                    placeholder="Wuling"
                    disabled={isSubmitting}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <FieldLabel required>Vehicle Number</FieldLabel>
                  <input
                    type="text"
                    value={form.vehicleNumber}
                    onChange={(event) =>
                      updateField(
                        "vehicleNumber",
                        event.target.value.toUpperCase(),
                      )
                    }
                    placeholder="LAG-123-XY"
                    disabled={isSubmitting}
                    className={inputClasses}
                  />
                </div>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={User}
              label="Assigned Driver"
              description="Only verified drivers without a vehicle appear here."
            >
              {drivers.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                  No verified, unassigned drivers are available right now.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {drivers.map((driver) => {
                      const isSelected = form.assignedDriver === driver.uuid;

                      return (
                        <button
                          key={driver.uuid}
                          type="button"
                          onClick={() =>
                            updateField("assignedDriver", driver.uuid)
                          }
                          disabled={isSubmitting}
                          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                            isSelected
                              ? "border-orange-500 bg-orange-50 dark:border-orange-500 dark:bg-orange-950/30"
                              : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                          }`}
                        >
                          <DriverAvatar driver={driver} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {driver.first_name} {driver.last_name}
                            </span>
                            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                              {driver.phone_num}
                            </span>
                          </span>
                          {isSelected ? (
                            <CheckCircle
                              size={18}
                              className="shrink-0 text-orange-600 dark:text-orange-400"
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {selectedDriver ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Assigning to {selectedDriver.first_name}{" "}
                      {selectedDriver.last_name}
                    </p>
                  ) : null}
                </div>
              )}
            </FormSectionCard>

            <FormSectionCard icon={Key} label="Access">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Access</FieldLabel>
                  <select
                    value={form.access}
                    onChange={(event) =>
                      updateField("access", event.target.value)
                    }
                    disabled={isSubmitting}
                    className={inputClasses}
                  >
                    {accessOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {requiresDuration ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Rented access grants exactly 7 days.
                </p>
              ) : null}
            </FormSectionCard>
          </form>
        </div>

        <ModalFooter
          onCancel={() => onClose(false)}
          formId="assign-driver-form"
          isSubmitting={isSubmitting}
          submitLabel="Assign Driver"
          submitIcon={Car}
          submitDisabled={drivers.length === 0 || vehicleOptions.length === 0}
        />
      </div>
    </div>
  );
}

function DriverAvatar({
  driver,
  size = "sm",
}: {
  driver: AssignableDriver;
  size?: "sm" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const src = driver.profile_img?.startsWith("http")
    ? driver.profile_img
    : null;
  const fullName = `${driver.first_name} ${driver.last_name}`.trim();
  const pixels = size === "lg" ? 64 : 40;
  const dimensionClasses =
    size === "lg" ? "h-16 w-16 text-lg" : "h-10 w-10 text-xs";

  if (src && !failed) {
    return (
      <Image
        src={src}
        alt={fullName}
        width={pixels}
        height={pixels}
        className={`${dimensionClasses} shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm dark:ring-gray-800`}
        onError={() => setFailed(true)}
        unoptimized
      />
    );
  }

  return (
    <span
      className={`flex ${dimensionClasses} shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-800 ${getAvatarColor(
        fullName || "?",
      )}`}
    >
      {initials(driver.first_name, driver.last_name)}
    </span>
  );
}

// --- Vehicle assignment details modal --------------------------------
// Mirrors the identity-panel + grouped-sections layout used by the User
// Management page's details modal, scoped to a single vehicle assignment.

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">
        {value || "Not set"}
      </p>
    </div>
  );
}

function DetailSection({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Car;
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
      <div className="grid grid-cols-1 gap-4 bg-white p-4 sm:grid-cols-2 dark:bg-gray-800">
        {children}
      </div>
    </div>
  );
}

function VehicleDetailsModal({
  vehicle,
  locationLabel,
  onClose,
}: {
  vehicle: VehicleAssignment;
  locationLabel: string;
  onClose: () => void;
}) {
  const driver = vehicle.driver;
  const fullName = driver
    ? `${driver.first_name} ${driver.last_name}`.trim()
    : "Unassigned";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        <ModalHeader
          icon={Car}
          eyebrow="Driver Management"
          title="Assignment Details"
          onClose={onClose}
        />

        <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[280px_1fr]">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-700/30 lg:items-start lg:text-left">
            {driver ? (
              <DriverAvatar driver={driver} size="lg" />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-500 shadow-sm ring-2 ring-white dark:bg-gray-600 dark:text-gray-300 dark:ring-gray-800">
                ?
              </span>
            )}

            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {fullName}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Driver
              </p>
            </div>

            {driver ? (
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  active={driver.admin_verify}
                  trueLabel="Admin Verified"
                  falseLabel="Not Verified"
                />
                <PresenceDot online={driver.is_online} />
              </div>
            ) : (
              <UnassignedBadge />
            )}

            <div className="w-full space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Mail size={14} className="shrink-0 text-gray-400" />
                <span className="break-all">{driver?.email ?? "Not set"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Phone size={14} className="shrink-0 text-gray-400" />
                <span>{driver?.phone_num ?? "Not set"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <DetailSection label="Vehicle" icon={Car}>
              <DetailField
                label="Vehicle Type"
                value={vehicle.vehicle_type ?? ""}
              />
              <DetailField
                label="Vehicle Model"
                value={vehicle.vehicle_model ?? ""}
              />
              <DetailField
                label="Vehicle Number"
                value={vehicle.vehicle_num ?? ""}
              />
              <DetailField
                label="Access"
                value={
                  vehicle.access
                    ? vehicle.access.charAt(0).toUpperCase() +
                      vehicle.access.slice(1)
                    : ""
                }
              />
              <DetailField
                label="Access Duration"
                value={vehicle.access_duration ?? ""}
              />
              <DetailField
                label="Assigned Date"
                value={
                  vehicle.assigned_date ? formatDate(vehicle.assigned_date) : ""
                }
              />
            </DetailSection>

            <DetailSection label="Location" icon={MapPin}>
              <DetailField label="Vehicle Location" value={locationLabel} />
              <DetailField label="Address" value={driver?.address ?? ""} />
              <DetailField label="City" value={driver?.city ?? ""} />
              <DetailField label="State" value={driver?.state ?? ""} />
            </DetailSection>

            <DetailSection label="System" icon={Clock}>
              <DetailField
                label="Created"
                value={formatDate(vehicle.created_at)}
              />
              <DetailField
                label="Driver Reference"
                value={driver ? driver.uuid.slice(-5) : ""}
              />
            </DetailSection>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Page ------------------------------------------------------------

export default function DriverManagementPage() {
  const [vehicles, setVehicles] = useState<VehicleAssignment[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<AssignableDriver[]>(
    [],
  );
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([]);
  const [areaNames, setAreaNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("");
  const [accessFilter, setAccessFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleAssignment | null>(null);

  const loadVehicles = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      notify.error("Your session expired. Please sign in again");
      setIsLoading(false);
      return;
    }

    const response = await fetch("/api/admin/vehicles", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const result = (await response.json()) as {
      vehicles?: VehicleAssignment[];
      availableDrivers?: AssignableDriver[];
      vehicleTypeOptions?: VehicleOption[];
      error?: string;
    };

    setIsLoading(false);

    if (!response.ok || !result.vehicles) {
      notify.error(result.error || "Could not load vehicle assignments");
      return;
    }

    setVehicles(result.vehicles);
    setAvailableDrivers(result.availableDrivers ?? []);
    setVehicleOptions(result.vehicleTypeOptions ?? []);
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  // The vehicle sits with its driver, so the driver's coordinates give the area name.
  useEffect(() => {
    const points: { lat: number; lng: number }[] = [];

    for (const vehicle of vehicles) {
      const lat = vehicle.driver?.location_lat;
      const lng = vehicle.driver?.location_lng;

      if (typeof lat === "number" && typeof lng === "number") {
        points.push({ lat, lng });
      }
    }

    if (points.length === 0) {
      return;
    }

    let cancelled = false;

    const resolveAreas = async () => {
      const response = await fetch("/api/admin/reverse-geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      });

      if (!response.ok || cancelled) {
        return;
      }

      const result = (await response.json()) as {
        results?: Record<string, string>;
      };

      if (!cancelled && result.results) {
        setAreaNames((current) => ({ ...current, ...result.results }));
      }
    };

    resolveAreas();

    return () => {
      cancelled = true;
    };
  }, [vehicles]);

  const totalVehicles = vehicles.length;
  const vehiclesAssigned = useMemo(
    () => vehicles.filter((vehicle) => Boolean(vehicle.assigned)).length,
    [vehicles],
  );
  const vehiclesUnassigned = totalVehicles - vehiclesAssigned;

  const describeLocation = useCallback(
    (driver: AssignableDriver | null) => {
      if (!driver) {
        return "—";
      }

      const { location_lat: lat, location_lng: lng } = driver;

      if (typeof lat !== "number" || typeof lng !== "number") {
        return "No location shared";
      }

      return (
        areaNames[geoKey(lat, lng)] ?? `${lat.toFixed(3)}, ${lng.toFixed(3)}`
      );
    },
    [areaNames],
  );

  const vehicleTypeChoices = useMemo(() => {
    const types = new Set<string>();

    for (const vehicle of vehicles) {
      if (vehicle.vehicle_type) {
        types.add(vehicle.vehicle_type);
      }
    }

    return Array.from(types.values()).sort();
  }, [vehicles]);

  const visibleVehicles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return vehicles.filter((vehicle) => {
      const driver = vehicle.driver;

      if (vehicleTypeFilter && vehicle.vehicle_type !== vehicleTypeFilter) {
        return false;
      }

      if (accessFilter && vehicle.access !== accessFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        vehicle.vehicle_type,
        vehicle.vehicle_model,
        vehicle.vehicle_num,
        vehicle.access,
        driver?.first_name,
        driver?.last_name,
        driver?.phone_num,
        driver?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [vehicles, searchTerm, vehicleTypeFilter, accessFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, vehicleTypeFilter, accessFilter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(visibleVehicles.length / VEHICLES_PAGE_SIZE));

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, visibleVehicles.length]);

  const pageStartIndex = (currentPage - 1) * VEHICLES_PAGE_SIZE;
  const paginatedVehicles = visibleVehicles.slice(
    pageStartIndex,
    pageStartIndex + VEHICLES_PAGE_SIZE,
  );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Car size={28} className="text-orange-600 dark:text-orange-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Driver Management
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {visibleVehicles.length} vehicles in current view
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search vehicle, driver, phone"
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-orange-600 px-4 py-2.5 text-sm font-semibold text-orange-600 transition hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30"
            >
              <Car size={16} />
              Assign Driver
            </button>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              <UserPlus size={16} />
              Create Driver
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <select
            value={vehicleTypeFilter}
            onChange={(event) => setVehicleTypeFilter(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All Vehicle Types</option>
            {vehicleTypeChoices.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={accessFilter}
            onChange={(event) => setAccessFilter(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All Access Types</option>
            {accessOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {(vehicleTypeFilter || accessFilter) && (
            <button
              type="button"
              onClick={() => {
                setVehicleTypeFilter("");
                setAccessFilter("");
              }}
              className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={Car}
            label="Total Vehicles"
            value={totalVehicles}
            tone="blue"
          />
          <StatCard
            icon={CheckCircle}
            label="Vehicles Assigned"
            value={vehiclesAssigned}
            tone="emerald"
          />
          <StatCard
            icon={XCircle}
            label="Vehicles Unassigned"
            value={vehiclesUnassigned}
            tone="red"
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {[
                    "SN",
                    "Photo",
                    "Driver",
                    "Vehicle",
                    "Access",
                    "Assigned Date",
                    "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap"
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
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : visibleVehicles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      {vehicles.length === 0
                        ? "No vehicles have been assigned yet."
                        : "No vehicles match your search."}
                    </td>
                  </tr>
                ) : (
                  paginatedVehicles.map((vehicle, index) => (
                    <tr
                      key={vehicle.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {pageStartIndex + index + 1}
                      </td>
                      <td className="px-4 py-3">
                        {vehicle.driver ? (
                          <DriverAvatar driver={vehicle.driver} />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                            ?
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {vehicle.driver ? (
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-gray-900 dark:text-white">
                              {vehicle.driver.first_name}{" "}
                              {vehicle.driver.last_name}
                            </span>
                            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                              {vehicle.driver.phone_num}
                            </span>
                          </span>
                        ) : (
                          <UnassignedBadge />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span className="block font-medium text-gray-900 dark:text-white">
                          {vehicle.vehicle_num ?? "—"}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {vehicle.vehicle_type}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {vehicle.vehicle_model}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            vehicle.access === "rented"
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                              : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          }`}
                        >
                          {vehicle.access ?? "—"}
                        </span>
                        {vehicle.access_duration ? (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            {vehicle.access_duration}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {vehicle.assigned_date
                          ? new Date(vehicle.assigned_date).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedVehicle(vehicle)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-orange-600 hover:text-orange-600 dark:border-gray-600 dark:text-gray-300 dark:hover:border-orange-400 dark:hover:text-orange-400"
                        >
                          View Details
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
            pageSize={VEHICLES_PAGE_SIZE}
            totalItems={visibleVehicles.length}
            itemLabel="vehicles"
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateDriverModal
          onClose={(didCreate) => {
            setIsCreateModalOpen(false);

            if (didCreate) {
              loadVehicles();
            }
          }}
        />
      )}

      {isAssignModalOpen && (
        <AssignDriverModal
          drivers={availableDrivers}
          vehicleOptions={vehicleOptions}
          onClose={(didAssign) => {
            setIsAssignModalOpen(false);

            if (didAssign) {
              loadVehicles();
            }
          }}
        />
      )}

      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          locationLabel={describeLocation(selectedVehicle.driver)}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}
