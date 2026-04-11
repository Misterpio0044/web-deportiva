/* eslint-disable */
module.exports = {
  /* Usamos la configuración convencional como base, la de feat, docs... */
  extends: ['@commitlint/config-conventional'],
  
  /* Aquí van las reglas personalizadas */
  rules: {
    'type-enum': [
      2, 
      'always', 
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'repo']
    ],
    'subject-case': [2, 'always', 'sentence-case'],
  },
};
