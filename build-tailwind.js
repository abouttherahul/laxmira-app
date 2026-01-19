#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const inputFile = path.join(__dirname, 'public', 'input.css');
const outputFile = path.join(__dirname, 'public', 'styles.css');

try {
  console.log('Building Tailwind CSS...');
  execSync(`npx tailwindcss -i ${inputFile} -o ${outputFile} --minify`, {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('✅ Tailwind CSS built successfully!');
} catch (error) {
  console.error('❌ Error building Tailwind CSS:', error.message);
  process.exit(1);
}

