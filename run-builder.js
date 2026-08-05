process.env.ELECTRON_RUN_AS_NODE = '1';
const { spawn } = require('child_process');
const path = require('path');

const electronExe = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
const cliJs = path.join(__dirname, 'node_modules', 'electron-builder', 'cli.js');

console.log('🚀 Rebuilding fresh Expense OS .exe files with electron-builder...');

const env = Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: '1' });
const child = spawn(electronExe, [cliJs, '--win'], {
  stdio: 'inherit',
  env: env
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('🎉 BUILD SUCCESS: Executables updated in dist/ folder!');
  } else {
    console.error('❌ Build exited with code:', code);
  }
  process.exit(code || 0);
});
