import PropTypes from 'prop-types'

// Pre-load the 5 curated dashboard fonts from Google Fonts
const GOOGLE_FONT_LINK = `https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Rajdhani:wght@400;600;700&family=Roboto+Mono:ital,wght@0,400;0,600;0,700;1,400&family=Orbitron:wght@400;600;700;800&family=IBM+Plex+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap`

// Inject Google Fonts link once
if (typeof document !== 'undefined' && !document.getElementById('tw-google-fonts')) {
  const link = document.createElement('link')
  link.id   = 'tw-google-fonts'
  link.rel  = 'stylesheet'
  link.href = GOOGLE_FONT_LINK
  document.head.appendChild(link)
}

const ALIGN_MAP = {
  left:    'flex-start',
  center:  'center',
  right:   'flex-end',
  justify: 'flex-start', // justification is text-align, not flexbox
}

const FONT_SIZE_PRESET_MAP = {
  small:  12,
  medium: 14,
  large:  18,
  xl:     24,
  xxl:    32,
  xxxl:   48,
}

const FONT_WEIGHT_MAP = {
  normal:    400,
  semibold:  600,
  bold:      700,
  extrabold: 800,
}

const LETTER_SPACING_MAP = {
  tight:   '-0.02em',
  normal:  '0em',
  wide:    '0.06em',
  widest:  '0.12em',
}

export default function TextWidget({ config = {}, isPreview = false }) {
  const {
    text           = 'Enter your text here',
    // Font family
    fontFamily      = 'Inter',
    // Font size: prefer custom px over preset
    fontSizePreset  = 'medium',
    fontSizePx      = null,
    // legacy support: old configs used `fontSize` key
    fontSize        = 'medium',
    fontWeight      = 'normal',
    color           = '#e2e8f0',
    align           = 'left',
    showBorder      = false,
    italic          = false,
    underline       = false,
    bgColor         = '',
    letterSpacing   = 'normal',
    lineHeight      = '1.6',
  } = config

  // Resolve font size: custom px > preset > legacy
  const resolvedFontSize = isPreview
    ? 10
    : fontSizePx != null && fontSizePreset === 'custom'
      ? fontSizePx
      : FONT_SIZE_PRESET_MAP[fontSizePreset] ?? FONT_SIZE_PRESET_MAP[fontSize] ?? 14

  const resolvedFontWeight = FONT_WEIGHT_MAP[fontWeight] ?? 400
  const resolvedLetterSpacing = LETTER_SPACING_MAP[letterSpacing] ?? '0em'

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: ALIGN_MAP[align] || 'flex-start',
      padding: isPreview ? '6px 8px' : '14px 18px',
      background: bgColor || 'transparent',
      borderRadius: 10,
      border: showBorder ? '1px solid var(--border-light)' : '1px solid transparent',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      <p style={{
        margin: 0,
        fontSize: resolvedFontSize,
        fontWeight: resolvedFontWeight,
        fontStyle: italic ? 'italic' : 'normal',
        textDecoration: underline ? 'underline' : 'none',
        color: color,
        lineHeight: lineHeight,
        letterSpacing: resolvedLetterSpacing,
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        textAlign: align,
        width: '100%',
        fontFamily: `'${fontFamily}', sans-serif`,
      }}>
        {text || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Empty text…</span>}
      </p>
    </div>
  )
}

TextWidget.propTypes = {
  config: PropTypes.object,
  isPreview: PropTypes.bool,
}
