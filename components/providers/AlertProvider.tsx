"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";

type AlertType = "error" | "success" | "info";

interface AlertState {
  open: boolean;
  message: string;
  type: AlertType;
  resolve?: () => void;
}

interface AlertContextValue {
  showAlert: (message: string, type?: AlertType) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AlertState>({ open: false, message: "", type: "error" });

  const showAlert = useCallback((message: string, type: AlertType = "error") => {
    setState({ open: true, message, type });
  }, []);

  const close = () => setState((s) => ({ ...s, open: false }));

  const iconMap = {
    error: <AlertCircle size={22} className="shrink-0" style={{ color: "var(--error-color)" }} />,
    success: <CheckCircle size={22} className="shrink-0" style={{ color: "var(--success-color)" }} />,
    info: <Info size={22} className="shrink-0" style={{ color: "var(--primary-brand)" }} />,
  };

  const accentMap = {
    error: "var(--error-color)",
    success: "var(--success-color)",
    info: "var(--primary-brand)",
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}

      {state.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={close}
          />

          {/* Dialog Box */}
          <div
            className="relative z-10 flex flex-col gap-4 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
            style={{
              backgroundColor: "var(--card-bg)",
              border: `1.5px solid ${accentMap[state.type]}30`,
            }}
          >
            {/* Close button */}
            <button
              onClick={close}
              className="absolute top-4 right-4 flex items-center justify-center w-7 h-7 rounded-full transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-soft)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              aria-label="Close"
            >
              <X size={16} strokeWidth={2.5} />
            </button>

            {/* Content */}
            <div className="flex items-start gap-3 pr-6">
              {iconMap[state.type]}
              <div>
                <p
                  className="text-[13px] font-semibold mb-0.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {state.type === "error" ? "Something went wrong" : state.type === "success" ? "Success" : "Info"}
                </p>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {state.message}
                </p>
              </div>
            </div>

            {/* OK Button */}
            <div className="flex justify-end">
              <button
                onClick={close}
                className="px-5 py-2 rounded-[10px] text-[13px] font-semibold transition-all duration-150"
                style={{
                  backgroundColor: accentMap[state.type] + "18",
                  color: accentMap[state.type],
                  border: `1px solid ${accentMap[state.type]}40`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = accentMap[state.type] + "30";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = accentMap[state.type] + "18";
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used within AlertProvider");
  return ctx;
}
