// Load only the pure dental domain. Never load backend config, connections or data.
const fs = require('node:fs');
const path = require('node:path');
const roots = [process.env.CO26_BACKEND_ROOT,
  path.resolve(__dirname, '../../../hemia-assistance-back-legacy'),
  path.resolve(__dirname, '../../../medsync-back-legacy')].filter(Boolean);
const modulePath = roots.map(root => path.join(root, 'src/domain/odontogram/operations.js')).find(file => fs.existsSync(file));
if (!modulePath) throw Error('CO26 QA requires the backend checkout. Set CO26_BACKEND_ROOT to its path.');
module.exports = require(modulePath);
