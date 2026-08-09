// Plain Language — Acode plugin
//
// Registers a CodeMirror 6 language for `.pln` files through Acode's modern
// `editorLanguages` API. The highlighting rules live in stream-spec.js (pure
// CommonJS, no CodeMirror dependency) so they can be tested by the Plain test
// suite (tests/compiler.test.js) with the exact same code the editor runs.

const PlainStreamSpec = require('./stream-spec.js');

const PLUGIN_ID = 'dev.ayoxx.plain-language';
const LANGUAGE_NAME = 'Plain';
const EXTENSIONS = ['pln'];

class PlainLanguagePlugin {
  constructor() {
    this.editorLanguages = null;
  }

  init() {
    this.editorLanguages = acode.require('editorLanguages');

    this.editorLanguages.register(LANGUAGE_NAME, EXTENSIONS, LANGUAGE_NAME, async () => {
      // Acode exposes the CodeMirror 6 module graph through acode.require.
      const { StreamLanguage } = acode.require('@codemirror/language');
      const { tags } = acode.require('@lezer/highlight');

      // Explicitly map the legacy token names this spec emits so highlighting
      // does not depend on StreamLanguage's built-in default table.
      return [
        StreamLanguage.define({
          ...PlainStreamSpec,
          tokenTable: {
            function: tags.function(tags.variableName),
            builtin: tags.standard(tags.variableName),
            'string-2': tags.special(tags.string),
            'string-3': tags.special(tags.special(tags.string)),
            property: tags.propertyName,
            meta: tags.meta,
            atom: tags.atom,
            invalid: tags.invalid,
          },
          languageData: {
            commentTokens: { line: '//' },
          },
        }),
      ];
    });
  }

  destroy() {
    if (this.editorLanguages) {
      try {
        this.editorLanguages.unregister(LANGUAGE_NAME);
      } catch (_) {
        // Already unregistered — nothing to clean up.
      }
      this.editorLanguages = null;
    }
  }
}

const plainLanguagePlugin = new PlainLanguagePlugin();

acode.setPluginInit(PLUGIN_ID, () => {
  plainLanguagePlugin.init();
});

acode.setPluginUnmount(PLUGIN_ID, () => {
  plainLanguagePlugin.destroy();
});
