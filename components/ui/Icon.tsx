// @ts-nocheck
import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';

// ============================================================================
// Ionicons drop-in replacement.
//
// Problema real:
//   El runtime móvil de OnSpace NO expone ExpoFontLoader.isLoadedNative,
//   por lo que <Icon /> de @expo/vector-icons revienta con
//   "TypeError: undefined is not a function" al renderizarse
//   (stack: isLoadedNative -> isLoaded -> Icon).
//   Esto ocurre en CADA render de CADA icono, no solo en la precarga,
//   por eso ni el timeout de Font.loadAsync ni el ErrorBoundary detienen
//   el crash: el error se repite en cuanto se monta cualquier pantalla.
//
// Solución permanente:
//   Sustituir @expo/vector-icons por un componente que no dependa de
//   expo-font. Este archivo expone Ionicons (y alias comunes) con la
//   misma API (name, size, color, style) y renderiza un glifo Unicode
//   dentro de <Text>. Es un drop-in transparente para los ~200 usos
//   que ya existen en el proyecto.
// ============================================================================

const ICON_MAP: Record<string, string> = {
  // Navegación
  'chevron-back': '‹', 'chevron-back-outline': '‹',
  'chevron-forward': '›', 'chevron-forward-outline': '›',
  'chevron-up': '˄', 'chevron-up-outline': '˄',
  'chevron-down': '˅', 'chevron-down-outline': '˅',
  'arrow-forward': '→', 'arrow-forward-outline': '→',
  'arrow-back': '←', 'arrow-back-outline': '←',
  'arrow-up': '↑', 'arrow-up-outline': '↑',
  'arrow-down': '↓', 'arrow-down-outline': '↓',
  'return-down-back': '↩',
  'caret-back': '‹', 'caret-forward': '›',
  'caret-up': '˄', 'caret-down': '˅',

  // Acciones
  'add': '＋', 'add-outline': '＋',
  'remove': '−', 'remove-outline': '−',
  'close': '×', 'close-outline': '×',
  'close-circle': '⊗', 'close-circle-outline': '⊗',
  'checkmark': '✓', 'checkmark-outline': '✓',
  'checkmark-circle': '✓', 'checkmark-circle-outline': '✓',
  'checkmark-done': '✓', 'checkmark-done-outline': '✓',
  'checkmark-done-circle': '✓', 'checkmark-done-circle-outline': '✓',
  'add-circle': '⊕', 'add-circle-outline': '⊕',
  'ellipse': '●', 'ellipse-outline': '○',
  'radio-button-on': '⦿', 'radio-button-off': '○',
  'square': '■', 'square-outline': '□',

  // Alertas
  'warning': '⚠', 'warning-outline': '⚠',
  'alert': '⚠', 'alert-outline': '⚠',
  'alert-circle': 'ⓘ', 'alert-circle-outline': 'ⓘ',
  'information': 'ⓘ', 'information-outline': 'ⓘ',
  'information-circle': 'ⓘ', 'information-circle-outline': 'ⓘ',
  'help-circle': '?', 'help-circle-outline': '?',
  'ban': '⊘', 'ban-outline': '⊘',

  // Star / heart / thumbs
  'star': '★', 'star-outline': '☆', 'star-half': '★',
  'heart': '♥', 'heart-outline': '♡',
  'thumbs-up': '👍', 'thumbs-up-outline': '👍',
  'thumbs-down': '👎', 'thumbs-down-outline': '👎',

  // Auth
  'lock-closed': '🔒', 'lock-closed-outline': '🔒',
  'lock-open': '🔓', 'lock-open-outline': '🔓',
  'log-out': '⎋', 'log-out-outline': '⎋',
  'log-in': '⎋', 'log-in-outline': '⎋',
  'key': '🔑', 'key-outline': '🔑',
  'shield': '🛡', 'shield-outline': '🛡',
  'shield-checkmark': '🛡', 'shield-checkmark-outline': '🛡',
  'finger-print': '☝', 'finger-print-outline': '☝',

  // Personas
  'person': '👤', 'person-outline': '👤',
  'person-circle': '👤', 'person-circle-outline': '👤',
  'person-add': '👤', 'person-add-outline': '👤',
  'person-remove': '👤', 'person-remove-outline': '👤',
  'people': '👥', 'people-outline': '👥',
  'people-circle': '👥', 'people-circle-outline': '👥',

  // Calendario / tiempo
  'calendar': '📅', 'calendar-outline': '📅',
  'calendar-clear': '📅', 'calendar-clear-outline': '📅',
  'calendar-number': '📅', 'calendar-number-outline': '📅',
  'time': '⏱', 'time-outline': '⏱',
  'timer': '⏱', 'timer-outline': '⏱',
  'hourglass': '⏳', 'hourglass-outline': '⏳',
  'stopwatch': '⏱', 'stopwatch-outline': '⏱',
  'alarm': '⏰', 'alarm-outline': '⏰',

  // Home / apps
  'home': '⌂', 'home-outline': '⌂',
  'grid': '⚏', 'grid-outline': '⚏',
  'apps': '⚏', 'apps-outline': '⚏',
  'menu': '☰', 'menu-outline': '☰',
  'settings': '⚙', 'settings-outline': '⚙',
  'options': '⚙', 'options-outline': '⚙',
  'cube': '⬒', 'cube-outline': '⬒',
  'pulse': '⇌', 'pulse-outline': '⇌',
  'stats-chart': '📊', 'stats-chart-outline': '📊',
  'analytics': '📊', 'analytics-outline': '📊',
  'bar-chart': '📊', 'bar-chart-outline': '📊',
  'pie-chart': '◐', 'pie-chart-outline': '◐',

  // Financiero
  'card': '▭', 'card-outline': '▭',
  'cash': '$', 'cash-outline': '$',
  'wallet': '💰', 'wallet-outline': '💰',
  'cart': '🛒', 'cart-outline': '🛒',
  'bag': '👜', 'bag-outline': '👜',
  'receipt': '🧾', 'receipt-outline': '🧾',
  'pricetag': '🏷', 'pricetag-outline': '🏷',
  'gift': '🎁', 'gift-outline': '🎁',

  // Medios
  'videocam': '🎥', 'videocam-outline': '🎥',
  'videocam-off': '🎥', 'videocam-off-outline': '🎥',
  'camera': '📷', 'camera-outline': '📷',
  'camera-reverse': '📷', 'camera-reverse-outline': '📷',
  'image': '🖼', 'image-outline': '🖼',
  'images': '🖼', 'images-outline': '🖼',
  'film': '🎞', 'film-outline': '🎞',
  'mic': '🎤', 'mic-outline': '🎤',
  'mic-off': '🎤', 'mic-off-outline': '🎤',
  'headset': '🎧', 'headset-outline': '🎧',
  'musical-note': '♪', 'musical-note-outline': '♪',
  'musical-notes': '♫', 'musical-notes-outline': '♫',
  'play': '▶', 'play-outline': '▶',
  'play-circle': '▶', 'play-circle-outline': '▶',
  'pause': '⏸', 'pause-outline': '⏸',
  'pause-circle': '⏸', 'pause-circle-outline': '⏸',
  'stop': '■', 'stop-outline': '■',
  'stop-circle': '■', 'stop-circle-outline': '■',
  'volume-high': '🔊', 'volume-high-outline': '🔊',
  'volume-low': '🔈', 'volume-low-outline': '🔈',
  'volume-mute': '🔇', 'volume-mute-outline': '🔇',
  'volume-off': '🔇', 'volume-off-outline': '🔇',

  // Progreso
  'trending-up': '↗', 'trending-up-outline': '↗',
  'trending-down': '↘', 'trending-down-outline': '↘',

  // Documentos
  'document': '📄', 'document-outline': '📄',
  'document-text': '📄', 'document-text-outline': '📄',
  'document-attach': '📎', 'document-attach-outline': '📎',
  'documents': '📄', 'documents-outline': '📄',
  'attach': '📎', 'attach-outline': '📎',
  'folder': '📁', 'folder-outline': '📁',
  'folder-open': '📂', 'folder-open-outline': '📂',
  'file-tray': '📥', 'file-tray-outline': '📥',
  'book': '📖', 'book-outline': '📖',
  'library': '📚', 'library-outline': '📚',
  'newspaper': '📰', 'newspaper-outline': '📰',
  'clipboard': '📋', 'clipboard-outline': '📋',
  'reader': '📃', 'reader-outline': '📃',
  'print': '🖨', 'print-outline': '🖨',
  'pencil': '✎', 'pencil-outline': '✎',

  // Comunicación
  'chatbubble': '💬', 'chatbubble-outline': '💬',
  'chatbubbles': '💬', 'chatbubbles-outline': '💬',
  'chatbubble-ellipses': '💬', 'chatbubble-ellipses-outline': '💬',
  'chatbox': '💬', 'chatbox-outline': '💬',
  'call': '📞', 'call-outline': '📞',
  'phone-portrait': '📱', 'phone-portrait-outline': '📱',
  'mail': '✉', 'mail-outline': '✉',
  'mail-open': '✉', 'mail-open-outline': '✉',
  'mail-unread': '✉', 'mail-unread-outline': '✉',
  'send': '➤', 'send-outline': '➤',
  'paper-plane': '➤', 'paper-plane-outline': '➤',
  'notifications': '🔔', 'notifications-outline': '🔔',
  'notifications-off': '🔕', 'notifications-off-outline': '🔕',
  'megaphone': '📣', 'megaphone-outline': '📣',
  'logo-whatsapp': '💬',

  // Refresh / editar
  'refresh': '↻', 'refresh-outline': '↻',
  'refresh-circle': '↻', 'refresh-circle-outline': '↻',
  'reload': '↻', 'reload-outline': '↻',
  'sync': '↻', 'sync-outline': '↻',
  'create': '✎', 'create-outline': '✎',
  'save': '💾', 'save-outline': '💾',
  'trash': '🗑', 'trash-outline': '🗑',
  'trash-bin': '🗑', 'trash-bin-outline': '🗑',
  'copy': '⧉', 'copy-outline': '⧉',
  'cut': '✂', 'cut-outline': '✂',
  'eye': '👁', 'eye-outline': '👁',
  'eye-off': '👁', 'eye-off-outline': '👁',
  'search': '🔍', 'search-outline': '🔍',
  'filter': '⌫', 'filter-outline': '⌫',
  'funnel': '⌫', 'funnel-outline': '⌫',

  // Decoración
  'sparkles': '✨', 'sparkles-outline': '✨',
  'flash': '⚡', 'flash-outline': '⚡',
  'flash-off': '⚡', 'flash-off-outline': '⚡',
  'moon': '☾', 'moon-outline': '☾',
  'sunny': '☀', 'sunny-outline': '☀',
  'cloudy': '☁', 'cloudy-outline': '☁',

  // Lugares / roles
  'briefcase': '💼', 'briefcase-outline': '💼',
  'school': '🎓', 'school-outline': '🎓',
  'business': '🏢', 'business-outline': '🏢',
  'storefront': '🏪', 'storefront-outline': '🏪',
  'location': '📍', 'location-outline': '📍',
  'pin': '📌', 'pin-outline': '📌',
  'map': '🗺', 'map-outline': '🗺',
  'navigate': '➤', 'navigate-outline': '➤',
  'compass': '🧭', 'compass-outline': '🧭',
  'globe': '🌐', 'globe-outline': '🌐',
  'earth': '🌍', 'earth-outline': '🌍',
  'flag': '⚑', 'flag-outline': '⚑',
  'bookmark': '⚑', 'bookmark-outline': '⚑',
  'ribbon': '🎗', 'ribbon-outline': '🎗',
  'medal': '🏅', 'medal-outline': '🏅',
  'trophy': '🏆', 'trophy-outline': '🏆',

  // Cloud / listas / share
  'cloud': '☁', 'cloud-outline': '☁',
  'cloud-upload': '⬆', 'cloud-upload-outline': '⬆',
  'cloud-download': '⬇', 'cloud-download-outline': '⬇',
  'cloud-done': '☁', 'cloud-done-outline': '☁',
  'cloud-offline': '☁', 'cloud-offline-outline': '☁',
  'list': '☰', 'list-outline': '☰',
  'download': '⬇', 'download-outline': '⬇',
  'upload': '⬆', 'upload-outline': '⬆',
  'share': '⇗', 'share-outline': '⇗',
  'share-social': '⇗', 'share-social-outline': '⇗',
  'link': '🔗', 'link-outline': '🔗',
  'unlink': '🔗', 'unlink-outline': '🔗',
  'open': '⇗', 'open-outline': '⇗',
  'exit': '⎋', 'exit-outline': '⎋',
  'enter': '⏎', 'enter-outline': '⏎',

  // Utilitarios
  'ellipsis-horizontal': '⋯', 'ellipsis-horizontal-outline': '⋯',
  'ellipsis-vertical': '⋮', 'ellipsis-vertical-outline': '⋮',
  'reorder-two': '☰', 'reorder-two-outline': '☰',
  'reorder-three': '☰', 'reorder-three-outline': '☰',
  'reorder-four': '☰', 'reorder-four-outline': '☰',
  'toggle': '◐', 'toggle-outline': '◐',
  'construct': '🔧', 'construct-outline': '🔧',
  'hammer': '🔨', 'hammer-outline': '🔨',
  'build': '🔨', 'build-outline': '🔨',
  'code': '⌨', 'code-outline': '⌨',
  'code-slash': '⌨', 'code-slash-outline': '⌨',
  'terminal': '⌨', 'terminal-outline': '⌨',
  'bug': '🐛', 'bug-outline': '🐛',
};

interface IoniconsProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function Ionicons({ name, size = 20, color, style }: IoniconsProps) {
  const glyph = ICON_MAP[String(name)] ?? '•';
  const safeSize = Math.max(1, Number(size) || 20);
  return (
    <Text
      allowFontScaling={false}
      style={[
        {
          fontSize: safeSize,
          lineHeight: Math.round(safeSize * 1.15),
          color: color ?? '#111',
          includeFontPadding: false,
          textAlign: 'center',
        },
        style,
      ]}
    >
      {glyph}
    </Text>
  );
}

// Alias comunes por si algún componente futuro los usa por costumbre.
export const MaterialIcons = Ionicons;
export const MaterialCommunityIcons = Ionicons;
export const FontAwesome = Ionicons;
export const FontAwesome5 = Ionicons;
export const AntDesign = Ionicons;
export const Feather = Ionicons;
export const Entypo = Ionicons;
export const EvilIcons = Ionicons;
export const Foundation = Ionicons;
export const Octicons = Ionicons;
export const SimpleLineIcons = Ionicons;
export const Zocial = Ionicons;

export default Ionicons;
