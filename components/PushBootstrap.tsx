// ============================================================================
// Wordlish · PushBootstrap.
//
// Componente sin UI que:
//   1. Instala el handler de foreground + tap y el canal Android.
//   2. Registra el Expo Push Token cuando hay un usuario real logueado.
//   3. Al tocar una notificacion, navega al `actionRoute` recibido en
//      el payload data.
//
// Se monta una unica vez dentro de AuthProvider en app/_layout.tsx.
// En plataformas distintas a Android es un no-op silencioso.
// ============================================================================

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { pushService } from '@/services/pushService';

export function PushBootstrap() {
  const { user } = useAuth();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  // Handler + tap listener (una sola vez).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    pushService
      .setup((route) => {
        if (!route) return;
        try {
          routerRef.current.push(route as any);
        } catch (err) {
          console.warn('[PushBootstrap] navigate error', err);
        }
      })
      .catch(() => undefined);
  }, []);

  // Registro por usuario.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const uid = user?.id;
    if (!uid) return;
    pushService.registerForUser(uid).catch(() => undefined);
  }, [user?.id]);

  return null;
}
