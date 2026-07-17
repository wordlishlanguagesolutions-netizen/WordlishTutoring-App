// stubs/hermes-parser-plugin.js
//
// Este archivo es requerido por la versión parcheada de
// babel-plugin-syntax-hermes-parser@0.79.x que trae el toolchain actual de
// React Native / Expo. La ruta absoluta a este stub quedó embebida en el
// dist/ de ese plugin durante un paso previo del setup, por lo que su
// ausencia rompe la compilación con:
//
//   Cannot find module 'stubs/hermes-parser-plugin.js'
//   at babel-plugin-syntax-hermes-parser/dist/index.js
//
// El plugin original inyecta un parserOverride que llama a hermes-parser.
// En este runtime NO queremos parseo Flow-first (produjo errores previos
// sobre Animated y generics), así que devolvemos un plugin Babel neutro:
// un visitor vacío que no altera el AST y no registra parserOverride.
// Babel seguirá usando su parser por defecto (@babel/parser), que es lo
// que ya venía funcionando en el bundle congelado.
//
// IMPORTANTE: No modificar Metro, Babel, Hermes ni ninguna otra pieza de
// build. Este archivo existe únicamente para satisfacer un require con
// ruta absoluta hacia el proyecto y así desbloquear el bundle.

'use strict';

function hermesParserPluginStub() {
  return {
    name: 'hermes-parser-plugin-stub',
    visitor: {},
  };
}

module.exports = hermesParserPluginStub;
module.exports.default = hermesParserPluginStub;
module.exports.__esModule = true;
