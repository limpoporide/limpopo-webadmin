"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Car,
  Check,
  Clock,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TablePagination from "@/components/TablePagination";
import { notify } from "@/lib/notify";
import { Tables } from "@/types/database.types";

type DriverProfile = Tables<"driver_profile">;
type RiderProfile = Tables<"rider_profile">;
type ProfileTab = "drivers" | "riders";
type SelectedProfile =
  | { type: "driver"; row: DriverProfile }
  | { type: "rider"; row: RiderProfile };

const hiddenDetailFields = new Set(["check1", "check2", "health_yes"]);
const sensitiveFieldPattern =
  /(token|transfer_pin|pin_hash|reset_token|fcm_token|push_token)/i;
const dateFieldPattern = /(^|_)(date|at)$/i;
const uuidFieldPattern = /(^uuid$|_uuid$)/i;
const imageFieldNames = new Set(["profile_img", "profile_photo", "avatar_url"]);
const fileFieldNames = new Set(["license_upload"]);

const USER_PAGE_SIZE = 10;

// Fields shown in the modal's identity panel rather than the grouped grid below.
const identityFieldNames = new Set([
  "first_name",
  "last_name",
  "email",
  "phone_num",
  "profile_img",
  "phone_verified",
  "is_online",
  "rating",
]);

// Everything else is bucketed into a labeled section, in this display order.
// The first matching pattern wins, so more specific groups should sit above
// more general ones.
const GROUP_DEFS: {
  key: string;
  label: string;
  icon: LucideIcon;
  test: RegExp;
}[] = [
  {
    key: "location",
    label: "Location",
    icon: MapPin,
    test: /^(address|city|state|country|zip|postal_code|zone)$/i,
  },
  {
    key: "vehicle",
    label: "Vehicle",
    icon: Car,
    test: /vehicle|plate|license/i,
  },
  {
    key: "financial",
    label: "Banking & Payouts",
    icon: Wallet,
    test: /wallet|bank|payout|budpay/i,
  },
  {
    key: "preferences",
    label: "Preferences",
    icon: Bell,
    test: /push_notification|notify|marketing_opt/i,
  },
  {
    key: "system",
    label: "System",
    icon: Clock,
    test: /uuid|created_at|updated_at|^id$/i,
  },
];

function isSensitiveField(fieldName: string) {
  return (
    hiddenDetailFields.has(fieldName) || sensitiveFieldPattern.test(fieldName)
  );
}

function formatLabel(fieldName: string) {
  return fieldName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatUuid(value: string) {
  return value.length > 5 ? value.slice(-5) : value;
}

function isWebUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isLocalFileReference(value: string) {
  return (
    value.startsWith("file://") ||
    value.startsWith("/data/") ||
    value.includes(":\\")
  );
}

function getPublicStorageUrl(value: string) {
  if (isWebUrl(value) || isLocalFileReference(value)) {
    return isWebUrl(value) ? value : null;
  }

  const [bucketName, ...pathParts] = value.split("/").filter(Boolean);

  if (!bucketName || pathParts.length === 0) {
    return null;
  }

  return supabase.storage.from(bucketName).getPublicUrl(pathParts.join("/"))
    .data.publicUrl;
}

function getOptionalString(row: Record<string, unknown>, fieldName: string) {
  const value = row[fieldName];

  return typeof value === "string" && value.trim() ? value : null;
}

// --- Avatar -----------------------------------------------------------

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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";

  return (first + last).toUpperCase() || "?";
}

function getAvatarColor(name: string) {
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  return avatarPalette[Math.abs(hash) % avatarPalette.length];
}

function ProfileAvatar({
  src,
  name,
  size = "sm",
}: {
  src: string | null;
  name: string;
  size?: "sm" | "lg";
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const pixels = size === "lg" ? 64 : 40;
  const dimensionClasses =
    size === "lg" ? "h-16 w-16 text-lg" : "h-10 w-10 text-xs";

  // Reset the failure flag whenever the source itself changes (e.g. list
  // re-fetches, or the same component gets reused for a different row).
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setImageFailed(false);
  }

  if (src && !imageFailed) {
    return (
      <Image
        src={src}
        alt={name}
        width={pixels}
        height={pixels}
        className={`${dimensionClasses} rounded-full object-cover ring-2 ring-white shadow-sm dark:ring-gray-800`}
        onError={() => setImageFailed(true)}
        unoptimized
      />
    );
  }

  return (
    <div
      className={`flex ${dimensionClasses} shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-800 ${getAvatarColor(
        name || "?",
      )}`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}

// --- Shared detail rendering -------------------------------------------

function UnavailableUploadMessage({ fieldName }: { fieldName: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
      {formatLabel(fieldName)} is saved as a local device file, not an uploaded
      web file.
    </div>
  );
}

function DetailValue({
  fieldName,
  value,
}: {
  fieldName: string;
  value: unknown;
}) {
  if (value === null || value === undefined || value === "") {
    return (
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        Not set
      </p>
    );
  }

  if (typeof value === "string" && imageFieldNames.has(fieldName)) {
    const imageUrl = getPublicStorageUrl(value);

    if (!imageUrl) {
      return <UnavailableUploadMessage fieldName={fieldName} />;
    }

    return (
      <a
        href={imageUrl}
        target="_blank"
        rel="noreferrer"
        className="group block max-w-40"
      >
        <Image
          src={imageUrl}
          alt={formatLabel(fieldName)}
          width={220}
          height={160}
          className="h-28 w-40 rounded-lg object-cover ring-1 ring-gray-200 transition group-hover:opacity-90 dark:ring-gray-600"
          unoptimized
        />
      </a>
    );
  }

  if (typeof value === "string" && fileFieldNames.has(fieldName)) {
    const fileUrl = getPublicStorageUrl(value);

    if (!fileUrl) {
      return <UnavailableUploadMessage fieldName={fieldName} />;
    }

    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
      >
        <FileText size={14} />
        View Uploaded File
        <ExternalLink size={12} />
      </a>
    );
  }

  if (typeof value === "string" && uuidFieldPattern.test(fieldName)) {
    return (
      <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">
        {formatUuid(value)}
      </p>
    );
  }

  if (typeof value === "string" && dateFieldPattern.test(fieldName)) {
    return (
      <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">
        {formatDate(value)}
      </p>
    );
  }

  return (
    <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">
      {formatValue(value)}
    </p>
  );
}

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

function VerifyToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Toggle admin verification"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// --- Modal ---------------------------------------------------------------

function ConfirmVerifyModal({
  nextValue,
  isSaving,
  onConfirm,
  onCancel,
}: {
  nextValue: boolean;
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-800 sm:p-6">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              nextValue
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
            }`}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {nextValue ? "Verify this driver?" : "Remove admin verification?"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {nextValue
                ? "This marks the driver as manually verified by an admin. This is separate from phone verification."
                : "The driver will no longer be marked as admin-verified."}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function IdentityPanel({
  selectedProfile,
  onVerifyChange,
}: {
  selectedProfile: SelectedProfile;
  onVerifyChange?: (nextValue: boolean) => Promise<void>;
}) {
  const [isVerifySaving, setIsVerifySaving] = useState(false);
  const [pendingVerify, setPendingVerify] = useState<boolean | null>(null);
  const row = selectedProfile.row as unknown as Record<string, unknown>;
  const firstName = getOptionalString(row, "first_name") ?? "";
  const lastName = getOptionalString(row, "last_name") ?? "";
  const fullName = `${firstName} ${lastName}`.trim() || "Unnamed profile";
  const email = getOptionalString(row, "email");
  const phone = getOptionalString(row, "phone_num");
  const profileImgValue = getOptionalString(row, "profile_img");
  const avatarUrl = profileImgValue
    ? getPublicStorageUrl(profileImgValue)
    : null;
  const phoneVerified =
    typeof row.phone_verified === "boolean" ? row.phone_verified : null;
  const isOnline = typeof row.is_online === "boolean" ? row.is_online : null;
  const rating = typeof row.rating === "number" ? row.rating : null;
  const adminVerified =
    selectedProfile.type === "driver" && typeof row.admin_verify === "boolean"
      ? row.admin_verify
      : null;

  const handleToggleVerify = () => {
    if (adminVerified === null) {
      return;
    }

    setPendingVerify(!adminVerified);
  };

  const handleConfirmVerify = async () => {
    if (pendingVerify === null || !onVerifyChange) {
      return;
    }

    setIsVerifySaving(true);
    await onVerifyChange(pendingVerify);
    setIsVerifySaving(false);
    setPendingVerify(null);
  };

  const handleCancelVerify = () => setPendingVerify(null);

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-700/30 lg:items-start lg:text-left">
      <ProfileAvatar src={avatarUrl} name={fullName} size="lg" />

      <div>
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {fullName}
        </p>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {selectedProfile.type === "driver" ? "Driver" : "Rider"}
        </p>
      </div>

      {(phoneVerified !== null || isOnline !== null || rating !== null) && (
        <div className="flex flex-wrap gap-2">
          {phoneVerified !== null && (
            <StatusBadge
              active={phoneVerified}
              trueLabel="Phone Verified"
              falseLabel="Phone Unverified"
            />
          )}
          {isOnline !== null && (
            <StatusBadge
              active={isOnline}
              trueLabel="Online"
              falseLabel="Offline"
            />
          )}
          {rating !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800">
              <Star size={12} className="fill-current" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {adminVerified !== null && (
        <div className="w-full rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <ShieldCheck
                size={15}
                className={`mt-0.5 shrink-0 ${
                  adminVerified
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-400"
                }`}
              />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Admin Verification
                </p>
              </div>
            </div>
            <VerifyToggle
              checked={adminVerified}
              onChange={handleToggleVerify}
              disabled={isVerifySaving || !onVerifyChange}
            />
          </div>
        </div>
      )}

      {pendingVerify !== null && (
        <ConfirmVerifyModal
          nextValue={pendingVerify}
          isSaving={isVerifySaving}
          onConfirm={handleConfirmVerify}
          onCancel={handleCancelVerify}
        />
      )}

      <div className="w-full space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <Mail size={14} className="shrink-0 text-gray-400" />
          <span className="break-all">{email ?? "Not set"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <Phone size={14} className="shrink-0 text-gray-400" />
          <span>{phone ?? "Not set"}</span>
        </div>
      </div>
    </div>
  );
}

function DetailSection({
  label,
  icon: Icon,
  fields,
}: {
  label: string;
  icon: LucideIcon;
  fields: [string, unknown][];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-700/40">
        <Icon size={15} className="text-blue-600 dark:text-blue-400" />
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {label}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 bg-white p-4 sm:grid-cols-2 dark:bg-gray-800">
        {fields.map(([fieldName, value]) => (
          <div key={fieldName}>
            <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              {formatLabel(fieldName)}
            </p>
            <DetailValue fieldName={fieldName} value={value} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailsModal({
  selectedProfile,
  onClose,
  onVerifyChange,
}: {
  selectedProfile: SelectedProfile;
  onClose: () => void;
  onVerifyChange?: (nextValue: boolean) => Promise<void>;
}) {
  const row = selectedProfile.row as unknown as Record<string, unknown>;
  const title =
    selectedProfile.type === "driver"
      ? "Driver Profile Details"
      : "Rider Profile Details";

  const remainingEntries = Object.entries(row).filter(
    ([fieldName]) =>
      !isSensitiveField(fieldName) && !identityFieldNames.has(fieldName),
  );

  const groupedSections = GROUP_DEFS.map((group) => ({
    ...group,
    fields: remainingEntries.filter(([fieldName]) =>
      group.test.test(fieldName),
    ),
  })).filter((group) => group.fields.length > 0);

  const groupedFieldNames = new Set(
    groupedSections.flatMap((group) =>
      group.fields.map(([fieldName]) => fieldName),
    ),
  );
  const otherFields = remainingEntries.filter(
    ([fieldName]) => !groupedFieldNames.has(fieldName),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              User Management
            </p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            title="Close details"
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <X size={22} />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[280px_1fr]">
          <IdentityPanel
            selectedProfile={selectedProfile}
            onVerifyChange={onVerifyChange}
          />

          <div className="space-y-4">
            {groupedSections.map((group) => (
              <DetailSection
                key={group.key}
                label={group.label}
                icon={group.icon}
                fields={group.fields}
              />
            ))}
            {otherFields.length > 0 && (
              <DetailSection
                label="Other Details"
                icon={Info}
                fields={otherFields}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Page ------------------------------------------------------------

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("drivers");
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [riders, setRiders] = useState<RiderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] =
    useState<SelectedProfile | null>(null);
  const [driverPage, setDriverPage] = useState(1);
  const [riderPage, setRiderPage] = useState(1);

  useEffect(() => {
    let ignoreResult = false;

    async function loadProfiles() {
      setLoading(true);

      const [driverResult, riderResult] = await Promise.all([
        supabase
          .from("driver_profile")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("rider_profile")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (ignoreResult) {
        return;
      }

      if (driverResult.error || riderResult.error) {
        notify.error(
          driverResult.error?.message ||
            riderResult.error?.message ||
            "Could not load user profiles.",
        );
        setLoading(false);
        return;
      }

      setDrivers(driverResult.data ?? []);
      setRiders(riderResult.data ?? []);
      setLoading(false);
    }

    loadProfiles();

    return () => {
      ignoreResult = true;
    };
  }, []);

  const handleDriverVerifyChange = async (nextValue: boolean) => {
    if (!selectedProfile || selectedProfile.type !== "driver") {
      return;
    }

    const driverUuid = selectedProfile.row.uuid;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      notify.error("Your session expired. Please sign in again");
      return;
    }

    const response = await fetch("/api/admin/verify-driver", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ driverUuid, verified: nextValue }),
    });

    const result = (await response.json()) as {
      driver?: DriverProfile;
      error?: string;
    };

    if (!response.ok || !result.driver) {
      notify.error(result.error || "Could not update driver verification");
      return;
    }

    setDrivers((current) =>
      current.map((driver) =>
        driver.uuid === driverUuid ? (result.driver as DriverProfile) : driver,
      ),
    );
    setSelectedProfile({ type: "driver", row: result.driver });

    notify.success(
      nextValue ? "Driver verified" : "Driver verification removed",
    );
  };

  const visibleDrivers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return drivers;
    }

    return drivers.filter((driver) =>
      `${driver.first_name} ${driver.last_name} ${driver.email} ${driver.phone_num}`
        .toLowerCase()
        .includes(query),
    );
  }, [drivers, searchTerm]);

  const visibleRiders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return riders;
    }

    return riders.filter((rider) =>
      `${rider.first_name} ${rider.last_name} ${rider.email} ${rider.phone_num}`
        .toLowerCase()
        .includes(query),
    );
  }, [riders, searchTerm]);

  useEffect(() => {
    setDriverPage(1);
    setRiderPage(1);
  }, [searchTerm, activeTab]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(visibleDrivers.length / USER_PAGE_SIZE));

    if (driverPage > totalPages) {
      setDriverPage(totalPages);
    }
  }, [driverPage, visibleDrivers.length]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(visibleRiders.length / USER_PAGE_SIZE));

    if (riderPage > totalPages) {
      setRiderPage(totalPages);
    }
  }, [riderPage, visibleRiders.length]);

  const driverPageStartIndex = (driverPage - 1) * USER_PAGE_SIZE;
  const paginatedDrivers = visibleDrivers.slice(
    driverPageStartIndex,
    driverPageStartIndex + USER_PAGE_SIZE,
  );

  const riderPageStartIndex = (riderPage - 1) * USER_PAGE_SIZE;
  const paginatedRiders = visibleRiders.slice(
    riderPageStartIndex,
    riderPageStartIndex + USER_PAGE_SIZE,
  );

  const currentCount =
    activeTab === "drivers" ? visibleDrivers.length : visibleRiders.length;

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Users size={28} className="text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                User Management
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentCount} profiles in current view
              </p>
            </div>
          </div>

          <div className="relative w-full lg:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, email, or phone"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        </div>

        <div className="mb-6 inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab("drivers")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
              activeTab === "drivers"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <Car size={16} />
            Drivers Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("riders")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
              activeTab === "riders"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <Users size={16} />
            Riders Profile
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading profiles...
            </div>
          ) : activeTab === "drivers" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {[
                      "SN",
                      "Profile",
                      "Email",
                      "Phone",
                      "Phone Verified",
                      "Admin Verified",
                      "Online",
                      "Vehicle Type",
                      "Actions",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedDrivers.map((driver, index) => {
                    const vehicleType =
                      getOptionalString(
                        driver as Record<string, unknown>,
                        "vehicle_type",
                      ) ?? "Not set";
                    const fullName =
                      `${driver.first_name} ${driver.last_name}`.trim();

                    return (
                      <tr
                        key={driver.uuid}
                        className="transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {driverPageStartIndex + index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <ProfileAvatar
                              src={
                                driver.profile_img
                                  ? getPublicStorageUrl(driver.profile_img)
                                  : null
                              }
                              name={fullName}
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {fullName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {driver.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {driver.phone_num}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            active={driver.phone_verified}
                            trueLabel="Verified"
                            falseLabel="Unverified"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            active={driver.admin_verify}
                            trueLabel="Verified"
                            falseLabel="Unverified"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <PresenceDot online={driver.is_online} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {vehicleType}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedProfile({
                                type: "driver",
                                row: driver,
                              })
                            }
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-blue-600 hover:text-blue-600 dark:border-gray-600 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-blue-400"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <TablePagination
                currentPage={driverPage}
                pageSize={USER_PAGE_SIZE}
                totalItems={visibleDrivers.length}
                itemLabel="drivers"
                onPageChange={setDriverPage}
              />
              {visibleDrivers.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No driver profiles found.
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {[
                      "SN",
                      "Profile",
                      "Email",
                      "Phone",
                      "Phone Verified",
                      "Wallet Balance",
                      "Actions",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedRiders.map((rider, index) => {
                    const fullName =
                      `${rider.first_name} ${rider.last_name}`.trim();

                    return (
                      <tr
                        key={rider.uuid}
                        className="transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {riderPageStartIndex + index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <ProfileAvatar
                              src={
                                rider.profile_img
                                  ? getPublicStorageUrl(rider.profile_img)
                                  : null
                              }
                              name={fullName}
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {fullName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {rider.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {rider.phone_num}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            active={rider.phone_verified}
                            trueLabel="Verified"
                            falseLabel="Unverified"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            ₦{rider.wallet_balance.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedProfile({ type: "rider", row: rider })
                            }
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-blue-600 hover:text-blue-600 dark:border-gray-600 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-blue-400"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <TablePagination
                currentPage={riderPage}
                pageSize={USER_PAGE_SIZE}
                totalItems={visibleRiders.length}
                itemLabel="riders"
                onPageChange={setRiderPage}
              />
              {visibleRiders.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No rider profiles found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedProfile && (
        <DetailsModal
          selectedProfile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onVerifyChange={
            selectedProfile.type === "driver"
              ? handleDriverVerifyChange
              : undefined
          }
        />
      )}
    </div>
  );
}
