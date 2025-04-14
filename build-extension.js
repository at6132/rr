import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory paths
const distDir = path.join(__dirname, 'dist');
const extensionDir = path.join(distDir, 'extension');
const clientDir = path.join(__dirname, 'client');
const assetsDir = path.join(__dirname, 'attached_assets');

// Create extension directory
if (!fs.existsSync(extensionDir)) {
  fs.mkdirSync(extensionDir, { recursive: true });
}

// Copy manifest.json
fs.copyFileSync(
  path.join(clientDir, 'manifest.json'),
  path.join(extensionDir, 'manifest.json')
);

// Copy assets
const assetFiles = fs.readdirSync(assetsDir);
const extensionAssetsDir = path.join(extensionDir, 'assets');
if (!fs.existsSync(extensionAssetsDir)) {
  fs.mkdirSync(extensionAssetsDir, { recursive: true });
}

assetFiles.forEach(file => {
  if (file.endsWith('.png')) {
    fs.copyFileSync(
      path.join(assetsDir, file),
      path.join(extensionAssetsDir, file)
    );
  }
});

// Build TypeScript files using esbuild
console.log('Building background and content scripts...');
exec(
  `npx esbuild client/src/background.ts client/src/content-script.ts --bundle --outdir=${extensionDir}/src --format=esm`,
  (error, stdout, stderr) => {
    if (error) {
      console.error(`Error building extension scripts: ${error}`);
      return;
    }
    
    console.log(stdout);
    
    // Copy built app files
    console.log('Copying app files...');
    fs.copyFileSync(
      path.join(distDir, 'public', 'index.html'),
      path.join(extensionDir, 'index.html')
    );
    
    const publicAssetsDir = path.join(distDir, 'public', 'assets');
    const extensionAppAssetsDir = path.join(extensionDir, 'assets');
    
    fs.readdirSync(publicAssetsDir).forEach(file => {
      fs.copyFileSync(
        path.join(publicAssetsDir, file),
        path.join(extensionAppAssetsDir, file)
      );
    });
    
    // Update paths in the copied files if needed
    const manifestPath = path.join(extensionDir, 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const updatedManifest = manifestContent.replace(
      /\/assets\//g, 
      '/assets/'
    );
    fs.writeFileSync(manifestPath, updatedManifest);
    
    console.log('Extension build complete!');
    console.log(`Chrome extension files are in: ${extensionDir}`);
  }
);