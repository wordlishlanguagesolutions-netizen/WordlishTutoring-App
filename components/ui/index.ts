// ============================================================================
// Wordlish · Design System v1.0
// Barrel de componentes UI. Toda pantalla debe consumir sus primitivas desde
// aquí. No se permite duplicar Button, Input, Card, Modal, Skeleton, etc.
// ============================================================================

// Layout
export { Screen } from './Screen';
export { PageContainer } from './PageContainer';
export { WebSidebar } from './WebSidebar';
export type { SidebarItem } from './WebSidebar';
export { WebTwoColumn } from './WebTwoColumn';
export { Header } from './Header';

// Superficies
export { Card } from './Card';
export { GlassCard } from './GlassCard';
export { StatCard } from './StatCard';
export { KnowCard } from './KnowCard';
export { NotificationBanner } from './NotificationBanner';

// Controles
export { Button } from './Button';
export type { ButtonVariant, ButtonSize } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';
export { Skeleton, SkeletonCard } from './Skeleton';

// Marca
export { WordlishLogo } from './WordlishLogo';

// Piezas atómicas
export { Avatar } from './Avatar';
export { StatusBadge } from './StatusBadge';
export type { BadgeTone } from './StatusBadge';
export { ZoomButton } from './ZoomButton';
export { SupportRow } from './SupportRow';
