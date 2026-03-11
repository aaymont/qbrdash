import { zenith } from "@/lib/theme";

interface SectionTitleProps {
  children: React.ReactNode;
}

export function SectionTitle({ children }: SectionTitleProps) {
  return (
    <h3
      style={{
        marginTop: zenith.spacingLg,
        marginBottom: zenith.spacing,
        fontSize: 16,
        fontWeight: 600,
        fontFamily: zenith.fontFamily,
        color: zenith.neutral900,
      }}
    >
      {children}
    </h3>
  );
}
