import { IconClose } from "@geotab/zenith";
import { AnimatedDrawerContent } from "./Animated";

const zenith = {
  neutral100: "var(--zenith-neutral-100, #EDEBE9)",
  neutral900: "var(--zenith-neutral-900, #201F1E)",
  spacing: "var(--zenith-spacing-md, 16px)",
  fontFamily: "var(--zenith-font-family, 'Segoe UI', sans-serif)",
};

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number | string;
}

export function DetailDrawer({ open, onClose, title, children, width = 400 }: DetailDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          zIndex: 1200,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: typeof width === "number" ? width : width,
          maxWidth: "100%",
          backgroundColor: "white",
          boxShadow: "-4px 0 16px rgba(0,0,0,0.12)",
          zIndex: 1201,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: zenith.spacing,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${zenith.neutral100}`,
          }}
        >
          <h2
            id="drawer-title"
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              fontFamily: zenith.fontFamily,
              color: zenith.neutral900,
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              padding: 8,
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconClose />
          </button>
        </div>
        <div style={{ padding: zenith.spacing, overflow: "auto", flex: 1 }}>
          <AnimatedDrawerContent>{children}</AnimatedDrawerContent>
        </div>
      </div>
    </>
  );
}
