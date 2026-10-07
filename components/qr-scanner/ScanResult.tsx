"use client";

import { Button } from "@/components/ui/button";
import type { Participant, Event, ScannerMode } from "@/lib/qr-scanner/data";
import { MODE_CONFIG } from "@/lib/qr-scanner/data";
import { cn } from "@/lib/utils";

interface ScanResultProps {
  status: "idle" | "scanning" | "success" | "error";
  participant: Participant | null;
  error: string | null;
  mode: ScannerMode;
  selectedEvent: Event | null;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ScanResult({
  status,
  participant,
  error,
  mode,
  selectedEvent,
  isProcessing,
  onConfirm,
  onCancel,
}: ScanResultProps) {
  const config = MODE_CONFIG[mode];

  // Idle state
  if (status === "idle") {
    return (
      <div className="text-center p-6 bg-white rounded-lg shadow">
        <p className="text-gray-600">
          {mode === "checkin"
            ? "Scan a participant's QR code to check them in"
            : `Select a ${mode} above, then scan a QR code`}
        </p>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 font-medium mb-3">❌ {error}</p>
        <Button onClick={onCancel} variant="outline" className="w-full">
          Try Again
        </Button>
      </div>
    );
  }

  // Success state
  if (status === "success" && participant) {
    return (
      <div className="p-6 bg-green-50 border-2 border-green-500 rounded-lg text-center">
        <h2 className="text-xl font-bold text-green-800 mb-1">
          {mode === "checkin" ? "Checked In!" : "Registered!"}
        </h2>
        <p className="text-green-700 text-lg">
          {participant.firstName} {participant.lastName}
        </p>
        {selectedEvent && <p className="text-green-600 text-sm mt-1">{selectedEvent.name}</p>}
        <Button
          onClick={onCancel}
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
        >
          Scan Next
        </Button>
      </div>
    );
  }

  // Scanning state - show participant info and confirm button
  if (status === "scanning" && participant) {
    const isBlocked =
      mode === "checkin" && (participant.status !== "CONFIRMED" || participant.checkedIn);
    const needsEvent = (mode === "workshop" || mode === "food") && !selectedEvent;

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Participant info */}
        <div className={cn("p-4", `bg-${config.color}-50`)}>
          <h2 className="text-xl font-bold text-gray-800">
            {participant.firstName} {participant.lastName}
          </h2>
          <p className="text-sm text-gray-600">{participant.email}</p>
          <div className="flex gap-2 mt-2">
            <span
              className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                participant.status === "CONFIRMED"
                  ? "bg-green-100 text-green-800"
                  : participant.status === "WAITLISTED"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800",
              )}
            >
              {participant.status || "REGISTERED"}
            </span>
            {participant.checkedIn && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Checked In
              </span>
            )}
          </div>
        </div>

        {/* Event info for workshop/food */}
        {selectedEvent && (
          <div className="px-4 py-3 bg-gray-50 border-y text-sm">
            <span className="font-medium">{mode}:</span> {selectedEvent.name}
          </div>
        )}

        {/* Additional info */}
        {(participant.shirtSize || participant.dietRestrictions) && (
          <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
            {participant.shirtSize && <p>Shirt: {participant.shirtSize}</p>}
            {participant.dietRestrictions && <p>Diet: {participant.dietRestrictions}</p>}
          </div>
        )}

        {/* Action buttons */}
        <div className="p-4 space-y-2">
          {isBlocked && (
            <p className="text-yellow-700 bg-yellow-50 p-3 rounded text-center text-sm">
              ⚠️{" "}
              {participant.checkedIn
                ? "Already checked in"
                : "Attendance must be confirmed before check-in"}
            </p>
          )}

          {needsEvent && (
            <p className="text-yellow-700 bg-yellow-50 p-3 rounded text-center text-sm">
              ⚠️ Select a {mode} first
            </p>
          )}

          {!isBlocked && !needsEvent && (
            <Button
              onClick={onConfirm}
              disabled={isProcessing}
              className={cn("w-full text-white", config.bgClass)}
            >
              {isProcessing
                ? "Processing..."
                : mode === "checkin"
                  ? "Check In"
                  : `Register for ${mode}`}
            </Button>
          )}

          <Button onClick={onCancel} variant="outline" className="w-full" disabled={isProcessing}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
