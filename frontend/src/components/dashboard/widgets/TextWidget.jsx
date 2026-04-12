import PropTypes from 'prop-types'

const ALIGN_MAP = {
  left:   'flex-start',
  center: 'center',
  right:  'flex-end',
}

const FONT_SIZE_MAP = {
  small:  12,
  medium: 14,
  large:  18,
  xl:     24,
}

export default function TextWidget({ config = {}, isPreview = false }) {
  const {
    text          = 'Enter your text here',
    fontSize      = 'medium',
    fontWeight    = 'normal',
    color         = '#e2e8f0',
    align         = 'left',
    showBorder    = false,
    italic        = false,
    bgColor       = '',
  } = config

  const fs = isPreview ? 10 : (FONT_SIZE_MAP[fontSize] ?? 14)

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
        fontSize: fs,
        fontWeight: fontWeight === 'bold' ? 700 : fontWeight === 'semibold' ? 600 : 400,
        fontStyle: italic ? 'italic' : 'normal',
        color: color,
        lineHeight: 1.6,
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        textAlign: align,
        width: '100%',
        fontFamily: "'Inter', sans-serif",
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
