// Stub de react-native-safe-area-context/src/specs/NativeSafeAreaProvider.ts.
//
// Motivo: babel-plugin-codegen@0.79.4 falla al procesar el spec original con
//   "throwIfArgumentPropsAreNull is not a function"
// (incompatibilidad entre @react-native/codegen@0.79.4 y este archivo TS).
//
// Este stub devuelve el mismo componente nativo usando requireNativeComponent,
// que es lo que codegenNativeComponent termina haciendo en la arquitectura
// clásica. La librería lo consume como componente React sin cambios.
const { requireNativeComponent } = require('react-native');

module.exports = {
  __esModule: true,
  default: requireNativeComponent('RNCSafeAreaProvider'),
};
