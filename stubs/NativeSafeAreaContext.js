// Stub de react-native-safe-area-context/src/specs/NativeSafeAreaContext.ts.
// El spec original es un TurboModule; en arquitectura clásica se resuelve
// vía NativeModules. Si el módulo no está registrado en la plataforma
// actual (por ejemplo web), devolvemos null y la librería usa su fallback.
const { NativeModules } = require('react-native');

module.exports = {
  __esModule: true,
  default: NativeModules.RNCSafeAreaContext || null,
};
