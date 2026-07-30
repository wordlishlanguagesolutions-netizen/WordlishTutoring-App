// ============================================================================
// Wordlish · NotificationsHUD.
//
// Overlay unico (mount-once en app/_layout.tsx) que aporta la parte web
// de la estrategia hibrida de notificaciones:
//   1. Campana flotante (solo web) con badge de no leidas. Tap → abre
//      /notifications. Cambia a rojo si hay 'requires_action' pendientes.
//   2. Toast en tiempo real (todas las plataformas) cuando llega una
//      notificacion nueva mientras la sesion esta abierta. Tap → navega
//      al actionRoute y marca como leida. Auto-dismiss a 5s.
//   3. Beep opcional (solo web · Web Audio API) para prioridades
//      requires_action / important. `info` es silenciosa.
//
// Reutiliza NotificationsContext + notificationService (subscribe cache,
// sin realtime propio). El polling vive en NotificationsContext.
// En rutas de auth (login, signup, reset-password, verify-email) el HUD
// se oculta. Si no hay usuario, tampoco se muestra.
// ============================================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from './Icon';
import { colors, radius, spacing, shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import {
  subscribeNotifications,
  listNotifications,
  getNotificationPriority,
} from '@/services/notificationService';
import type { Notification } from '@/types';

const HIDE_ON_ROUTES = new Set<string>([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/notifications',
]);

function keyOf(n: Notification): string {
  // Clave estable entre optimista local y fila Cloud (mismo type/refId/
  // titulo/mensaje) para que un mismo evento no dispare toast dos veces.
  return `${n.type}|${n.refId ?? ''}|${n.title}|${n.message}`;
}

function playBeep(): void {
  if (Platform.OS !== 'web') return;
  try {
    const w: any = typeof window !== 'undefined' ? window : null;
    if (!w) return;
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    o.type = 'sine';
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.45);
  } catch {
    // no-op: el audio no debe romper el HUD
  }
}

interface ToastItem {
  key: string;
  notification: Notification;
  fade: Animated.Value;
}

const USE_NATIVE_ANIM = Platform.OS !== 'web';
const TOAST_TTL_MS = 5000;
const RECENT_WINDOW_MS = 60_000;

export function NotificationsHUD() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount, requiresActionCount, markAsRead } = useNotifications();

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenKeysRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef<boolean>(false);
  const timersRef = useRef<Map<string, any>>(new Map());
  const currentUidRef = useRef<string | null>(null);

  // Reset baseline cuando cambia el usuario.
  useEffect(() => {
    const uid = user?.id ?? null;
    if (currentUidRef.current === uid) return;
    currentUidRef.current = uid;
    initializedRef.current = false;
    seenKeysRef.current = new Set();
    // Limpiar timers pendientes
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    setToasts([]);
  }, [user?.id]);

  // Suscripcion al cache del service.
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;

    const baseline = () => {
      if (initializedRef.current) return;
      const cur = listNotifications(uid);
      cur.forEach((n) => seenKeysRef.current.add(keyOf(n)));
      initializedRef.current = true;
    };
    // Damos un margen para que hydrate corra al montar la sesion.
    const baselineTimer = setTimeout(baseline, 1500);

    const unsub = subscribeNotifications(() => {
      // Antes de la baseline no emitimos toasts para evitar spam al
      // hidratar el historial existente.
      if (!initializedRef.current) return;
      const cur = listNotifications(uid);
      const nowMs = Date.now();
      const fresh: Notification[] = [];
      for (const n of cur) {
        const k = keyOf(n);
        if (seenKeysRef.current.has(k)) continue;
        seenKeysRef.current.add(k);
        if (n.read) continue;
        const ageMs = nowMs - new Date(n.createdAt).getTime();
        if (!Number.isFinite(ageMs) || ageMs > RECENT_WINDOW_MS) continue;
        fresh.push(n);
      }
      if (fresh.length === 0) return;

      const shouldBeep = fresh.some(
        (n) => getNotificationPriority(n.type) !== 'info',
      );
      if (shouldBeep) playBeep();

      const created: ToastItem[] = fresh.map((n) => ({
        key: `${n.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        notification: n,
        fade: new Animated.Value(0),
      }));

      setToasts((prev) => [...prev, ...created]);

      created.forEach((t) => {
        Animated.timing(t.fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: USE_NATIVE_ANIM,
        }).start();
        const timer = setTimeout(() => {
          Animated.timing(t.fade, {
            toValue: 0,
            duration: 220,
            useNativeDriver: USE_NATIVE_ANIM,
          }).start(() => {
            setToasts((prev) => prev.filter((x) => x.key !== t.key));
          });
          timersRef.current.delete(t.key);
        }, TOAST_TTL_MS);
        timersRef.current.set(t.key, timer);
      });
    });

    return () => {
      clearTimeout(baselineTimer);
      unsub();
    };
  }, [user?.id]);

  // Cleanup de timers al desmontar.
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const handleToastPress = useCallback(
    (t: ToastItem) => {
      const n = t.notification;
      if (!n.read) markAsRead(n.id);
      if (n.actionRoute) {
        try {
          router.push(n.actionRoute as any);
        } catch {
          // no-op
        }
      }
      const timer = timersRef.current.get(t.key);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(t.key);
      }
      setToasts((prev) => prev.filter((x) => x.key !== t.key));
    },
    [markAsRead, router],
  );

  const handleDismiss = useCallback((t: ToastItem) => {
    const timer = timersRef.current.get(t.key);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(t.key);
    }
    Animated.timing(t.fade, {
      toValue: 0,
      duration: 180,
      useNativeDriver: USE_NATIVE_ANIM,
    }).start(() => {
      setToasts((prev) => prev.filter((x) => x.key !== t.key));
    });
  }, []);

  const handleBellPress = useCallback(() => {
    try {
      router.push('/notifications' as any);
    } catch {
      // no-op
    }
  }, [router]);

  if (!user) return null;
  if (pathname && HIDE_ON_ROUTES.has(pathname)) return null;

  // Campana flotante solo en web: el header nativo en Android/iOS ya
  // tiene su lugar y el push cubre el caso off-screen. En web es donde
  // realmente hace falta un anclaje siempre-visible.
  const showFloatingBell = Platform.OS === 'web';
  const hasCritical = requiresActionCount > 0;

  return (
    <View pointerEvents="box-none" style={styles.hud}>
      {showFloatingBell ? (
        <Pressable
          onPress={handleBellPress}
          hitSlop={8}
          accessibilityLabel="Centro de Actividad"
          style={({ pressed }) => [
            styles.bell,
            hasCritical && styles.bellCritical,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Ionicons
            name="notifications-outline"
            size={18}
            color={hasCritical ? colors.danger : colors.primaryDark}
          />
          {unreadCount > 0 ? (
            <View
              style={[
                styles.badge,
                hasCritical
                  ? { backgroundColor: colors.danger }
                  : { backgroundColor: colors.primary },
              ]}
            >
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : String(unreadCount)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}

      <View pointerEvents="box-none" style={styles.toastCol}>
        {toasts.map((t) => {
          const priority = getNotificationPriority(t.notification.type);
          const accent =
            priority === 'requires_action'
              ? colors.danger
              : priority === 'important'
              ? colors.warning
              : colors.info;
          return (
            <Animated.View
              key={t.key}
              style={[
                styles.toast,
                {
                  opacity: t.fade,
                  transform: [
                    {
                      translateY: t.fade.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-12, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.toastAccent, { backgroundColor: accent }]} />
              <Pressable
                onPress={() => handleToastPress(t)}
                style={({ pressed }) => [
                  styles.toastInner,
                  pressed && { opacity: 0.95 },
                ]}
              >
                <View
                  style={[
                    styles.toastIcon,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <Ionicons
                    name={(t.notification.icon as any) ?? 'notifications'}
                    size={16}
                    color={colors.primaryDark}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toastTitle} numberOfLines={1}>
                    {t.notification.title}
                  </Text>
                  <Text style={styles.toastMsg} numberOfLines={2}>
                    {t.notification.message}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDismiss(t)}
                  hitSlop={8}
                  accessibilityLabel="Descartar"
                  style={styles.dismissBtn}
                >
                  <Ionicons name="close" size={14} color={colors.textMuted} />
                </Pressable>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 56,
    right: 16,
    alignItems: 'flex-end',
    gap: 10,
    zIndex: 9999,
    ...(Platform.OS === 'web'
      ? ({ position: 'fixed' as any } as any)
      : null),
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  bellCritical: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textOnPrimary,
  },
  toastCol: {
    gap: 8,
    alignItems: 'flex-end',
    width: Platform.OS === 'web' ? 340 : 300,
    maxWidth: '90%' as any,
  },
  toast: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.md,
  },
  toastAccent: {
    height: 3,
    width: '100%',
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textStrong,
  },
  toastMsg: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
    lineHeight: 16,
  },
  dismissBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
});
