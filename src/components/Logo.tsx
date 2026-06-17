/**
 * Logo CONCEPT LOFT recréé en code (wordmark vectoriel).
 * Utilise currentColor, donc s'inverse automatiquement en mode sombre.
 *  - variant "stack"      : "LOFT" au-dessus de "CONCEPT" (barre latérale).
 *  - variant "horizontal" : "LOFT  CONCEPT" sur une seule ligne (bandeaux fins).
 */
export function Logo({
  size = 30,
  className,
  variant = 'stack',
}: {
  size?: number;
  className?: string;
  variant?: 'stack' | 'horizontal';
}) {
  if (variant === 'horizontal') {
    return (
      <div
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: size * 0.42,
          color: 'var(--text)',
          userSelect: 'none',
        }}
        aria-label="CONCEPT LOFT"
      >
        <span style={{ fontSize: size, fontWeight: 800, letterSpacing: '0.04em', lineHeight: 1 }}>
          LOFT
        </span>
        <span style={{ fontSize: size, fontWeight: 800, letterSpacing: '0.04em', lineHeight: 1 }}>
          CONCEPT
        </span>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        lineHeight: 0.92,
        color: 'var(--text)',
        userSelect: 'none',
      }}
      aria-label="CONCEPT LOFT"
    >
      <span
        style={{
          fontSize: size,
          fontWeight: 800,
          letterSpacing: '0.04em',
        }}
      >
        LOFT
      </span>
      <span
        style={{
          fontSize: size * 0.34,
          fontWeight: 400,
          letterSpacing: `${size * 0.022}px`,
          marginTop: size * 0.08,
          paddingLeft: '0.12em',
        }}
      >
        CONCEPT
      </span>
    </div>
  );
}
