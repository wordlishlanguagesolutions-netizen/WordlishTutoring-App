// Metro config: intercepta el resolver para esquivar el bug de
// babel-plugin-codegen@0.79.4, que revienta parseando specs nativos
// tanto en react-native-safe-area-context como en la propia react-native
// (specs / specs_DEPRECATED). Los síntomas observados fueron:
//
//   * throwIfArgumentPropsAreNull is not a function
//     -> react-native-safe-area-context/src/specs/NativeSafeArea*.ts
//   * Cannot read properties of undefined (reading 'filter')
//     -> react-native/src/private/specs_DEPRECATED/components/*NativeComponent.js
//
// Ambos apuntan al mismo bug de compatibilidad entre babel-plugin-codegen
// y @react-native/codegen@0.79.4. En vez de tocar transformer.hermesParser
// (lo cual produjo bundles con "main has not been registered"), reemplazamos
// esos specs por stubs equivalentes que llaman a requireNativeComponent con
// el nombre correcto.
//
// IMPORTANTE: los stubs autogenerados se escriben SÍNCRONAMENTE al cargar
// este archivo, antes de que Metro construya su Haste map. Si se generan
// on-demand dentro del resolveRequest, Metro falla con:
//   "Failed to get the SHA-1 for: .../stubs/generated/X.js"
// porque el watcher no los conoce todavía. Al pregenerarlos aquí, quedan
// dentro del projectRoot desde el primer escaneo.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// ---- Stubs escritos a mano (react-native-safe-area-context) ------------
const SAFE_AREA_STUBS = {
  NativeSafeAreaProvider: path.resolve(__dirname, 'stubs/NativeSafeAreaProvider.js'),
  NativeSafeAreaView: path.resolve(__dirname, 'stubs/NativeSafeAreaView.js'),
  NativeSafeAreaContext: path.resolve(__dirname, 'stubs/NativeSafeAreaContext.js'),
};

// ---- Stubs autogenerados para react-native/src/private/specs* -----------
const GENERATED_DIR = path.resolve(__dirname, 'stubs/generated');
if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

function writeStub(originalFilePath) {
  const ext = path.extname(originalFilePath);
  const base = path.basename(originalFilePath, ext);
  // "RCTInputAccessoryViewNativeComponent" -> "RCTInputAccessoryView"
  const componentName = base.replace(/NativeComponent$/, '');
  const stubPath = path.join(GENERATED_DIR, base + '.js');
  const content =
    '// Auto-generated stub for ' + base + '.\n' +
    '// Evita el crash de babel-plugin-codegen@0.79.4 sobre este spec.\n' +
    '// Reproduce el comportamiento clásico: pide al UIManager el componente\n' +
    '// nativo con el mismo nombre que usaba codegenNativeComponent.\n' +
    "const RN = require('react-native');\n" +
    'let component;\n' +
    'try {\n' +
    '  component = RN.requireNativeComponent(' + JSON.stringify(componentName) + ');\n' +
    '} catch (e) {\n' +
    '  component = RN.View;\n' +
    '}\n' +
    'module.exports = { __esModule: true, default: component };\n';
  // Escribe siempre para mantener el contenido determinista aunque cambie
  // la versión de react-native o el conjunto de specs.
  fs.writeFileSync(stubPath, content, 'utf8');
  return stubPath;
}

// Descubre react-native de forma robusta (funciona con pnpm porque
// require.resolve sigue el enlace real).
let RN_ROOT = null;
try {
  RN_ROOT = path.dirname(require.resolve('react-native/package.json'));
} catch (e) {
  RN_ROOT = null;
}

const stubMap = Object.create(null); // absolutePath -> stubPath

function scanAndStub(dirAbs) {
  if (!dirAbs || !fs.existsSync(dirAbs)) return;
  const entries = fs.readdirSync(dirAbs);
  for (const name of entries) {
    if (!/NativeComponent\.(js|ts)$/.test(name)) continue;
    const abs = path.join(dirAbs, name);
    const stub = writeStub(abs);
    stubMap[abs.replace(/\\/g, '/')] = stub;
  }
}

if (RN_ROOT) {
  scanAndStub(path.join(RN_ROOT, 'src', 'private', 'specs', 'components'));
  scanAndStub(path.join(RN_ROOT, 'src', 'private', 'specs_DEPRECATED', 'components'));
}

// ---- Resolver -----------------------------------------------------------
const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolveDefault = () =>
    previousResolveRequest
      ? previousResolveRequest(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);

  const resolved = resolveDefault();

  if (
    resolved &&
    resolved.type === 'sourceFile' &&
    typeof resolved.filePath === 'string'
  ) {
    const normalized = resolved.filePath.replace(/\\/g, '/');

    // 1) Specs de react-native-safe-area-context
    if (
      normalized.includes('/react-native-safe-area-context/') &&
      normalized.includes('/specs/')
    ) {
      const base = path.basename(normalized, path.extname(normalized));
      const stub = SAFE_AREA_STUBS[base];
      if (stub) {
        return { type: 'sourceFile', filePath: stub };
      }
    }

    // 2) Specs de la propia react-native: usa el mapa pregenerado
    const preStub = stubMap[normalized];
    if (preStub) {
      return { type: 'sourceFile', filePath: preStub };
    }
  }

  return resolved;
};

module.exports = config;
