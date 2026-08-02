const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env if present
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

if (!process.env.GH_TOKEN) {
  console.error('\n❌ ERROR: GH_TOKEN is missing!');
  console.error('To automate publishing, paste your GitHub Token into a .env file in the project root:');
  console.error('GH_TOKEN=ghp_your_github_token_here\n');
  process.exit(1);
}

// Clean old build files in dist folder
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  console.log('🧹 Cleaning old build files in dist/ folder...');
  try {
    fs.rmSync(distPath, { recursive: true, force: true });
  } catch (err) {
    console.log('Notice: dist folder clean warning:', err.message);
  }
}

console.log('🚀 Building and automatically publishing release to GitHub Releases...');
try {
  execSync('npx electron-builder --win -p always', { stdio: 'inherit' });
  console.log('\n🎉 SUCCESS: Release published to GitHub Releases automatically!');
} catch (err) {
  console.error('\n❌ Build/Publish failed:', err.message);
  process.exit(1);
}
