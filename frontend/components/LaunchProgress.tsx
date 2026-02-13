"use client";

import { Check, Loader2, Circle } from "lucide-react";

export type LaunchStep =
  | "idle"
  | "preparing"
  | "configuring"
  | "signing"
  | "broadcasting"
  | "confirming"
  | "done"
  | "error";

const STEPS = [
  { key: "preparing", label: "Creating token info" },
  { key: "configuring", label: "Configuring fee share" },
  { key: "signing", label: "Sign transaction" },
  { key: "broadcasting", label: "Broadcasting" },
  { key: "confirming", label: "Confirming on-chain" },
] as const;

interface Props {
  currentStep: LaunchStep;
  error?: string;
}

export function LaunchProgress({ currentStep, error }: Props) {
  if (currentStep === "idle") return null;

  const stepOrder = STEPS.map((s) => s.key);
  const currentIndex = stepOrder.indexOf(
    currentStep as (typeof stepOrder)[number]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          let status: "done" | "active" | "pending" = "pending";
          if (currentStep === "done") {
            status = "done";
          } else if (currentStep === "error") {
            status =
              i < currentIndex
                ? "done"
                : i === currentIndex
                  ? "active"
                  : "pending";
          } else if (i < currentIndex) {
            status = "done";
          } else if (i === currentIndex) {
            status = "active";
          }

          return (
            <div key={step.key} className="flex items-center gap-3">
              {status === "done" ? (
                <Check className="w-5 h-5 text-brand-400" />
              ) : status === "active" ? (
                <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
              ) : (
                <Circle className="w-5 h-5 text-gray-600" />
              )}
              <span
                className={
                  status === "done"
                    ? "text-brand-400"
                    : status === "active"
                      ? "text-white"
                      : "text-gray-500"
                }
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {currentStep === "done" && (
        <div className="bg-brand-500/10 border border-brand-500/30 rounded-lg p-4 text-brand-300 text-sm">
          Agent token launched successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
