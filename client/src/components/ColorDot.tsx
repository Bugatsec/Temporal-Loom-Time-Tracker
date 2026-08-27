interface ColorDotProps {
  color?: string | null;
  size?: number;
}

export function ColorDot({ color, size = 8 }: ColorDotProps) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color || "var(--ink-faint)",
        flexShrink: 0,
      }}
    />
  );
}
