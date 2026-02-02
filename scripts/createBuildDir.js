import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directories robustly across environments (local vs Hostinger CI)
const cwd = process.cwd();
const scriptFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptFile);
const backendDir = path.resolve(scriptDir, '..'); // madadgar_backend
// If CI cwd is repo root, we want root build; locally cwd may be backend
const repoRootDir = path.resolve(backendDir, '..');

const backendBuildDir = path.join(backendDir, 'build');
const rootBuildDir = path.join(repoRootDir, 'build');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.cpSync(srcDir, destDir, { recursive: true, force: true });
}

function build() {
  try {
    // 1) Ensure both build directories exist (backend and repo root)
    ensureDir(backendBuildDir);
    ensureDir(rootBuildDir);

    // 2) Copy runtime files and folders
    const itemsToCopy = [
      'server.js',
      'routes',
      'controllers',
      'models',
      'config',
      'middleware',
      'utils',
      'services',
      'uploads'
    ];

    itemsToCopy.forEach((item) => {
      const src = path.join(backendDir, item);
      // Copy to backend/build
      const destBackend = path.join(backendBuildDir, item);
      // Copy to repoRoot/build
      const destRoot = path.join(rootBuildDir, item);
      if (!fs.existsSync(src)) return;
      const stat = fs.statSync(src);
      if (stat.isDirectory()) {
        copyDir(src, destBackend);
        copyDir(src, destRoot);
      } else {
        copyFile(src, destBackend);
        copyFile(src, destRoot);
      }
    });

    // 3) Write a marker file
    const markerBackend = path.join(backendBuildDir, 'BUILD_INFO.txt');
    const markerRoot = path.join(rootBuildDir, 'BUILD_INFO.txt');
    const contents = `Build prepared at ${new Date().toISOString()}\nBackend source: ${backendDir}\nCWD: ${cwd}\n`;
    fs.writeFileSync(markerBackend, contents, 'utf8');
    fs.writeFileSync(markerRoot, contents, 'utf8');

    console.log('✅ Build directories ready at:', backendBuildDir, 'and', rootBuildDir);
  } catch (err) {
    console.error('❌ Failed to prepare build directory:', err);
    process.exit(1);
  }
}

build();
