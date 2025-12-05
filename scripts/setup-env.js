#!/usr/bin/env node

/**
 * Helper script to set up environment variables for Supabase
 * This script helps you get the necessary keys from Supabase CLI or prompts you to enter them
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env');
const envExamplePath = join(rootDir, '.env.example');

function readEnvFile() {
  if (!existsSync(envPath)) {
    // Create from example if it doesn't exist
    if (existsSync(envExamplePath)) {
      const example = readFileSync(envExamplePath, 'utf-8');
      writeFileSync(envPath, example);
      return example;
    }
    return '';
  }
  return readFileSync(envPath, 'utf-8');
}

function writeEnvFile(content) {
  writeFileSync(envPath, content, 'utf-8');
}

function updateEnvVar(key, value) {
  let envContent = readEnvFile();
  const lines = envContent.split('\n');
  let found = false;

  const updatedLines = lines.map(line => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}="${value}"`;
    }
    return line;
  });

  if (!found) {
    // Add new line if it doesn't exist
    updatedLines.push(`${key}="${value}"`);
  }

  writeEnvFile(updatedLines.join('\n'));
}

function tryGetFromSupabaseCLI() {
  try {
    console.log('🔍 Attempting to get values from Supabase CLI...\n');
    
    // Check if supabase is linked
    try {
      const statusOutput = execSync('supabase status', { encoding: 'utf-8', stdio: 'pipe' });
      console.log('✅ Supabase project is linked!\n');
      console.log(statusOutput);
      
      // Try to extract URL and keys from status
      // Note: supabase status doesn't always show keys, so we'll still need manual input
      return true;
    } catch (error) {
      console.log('⚠️  Supabase project not linked or CLI not available\n');
      return false;
    }
  } catch (error) {
    console.log('⚠️  Supabase CLI not found. Please install it first.\n');
    return false;
  }
}

async function promptForValues() {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log('\n📝 Please provide the following values from your Supabase project:\n');
  console.log('You can find these in: Supabase Dashboard → Settings → API\n');

  const url = await question('NEXT_PUBLIC_SUPABASE_URL: ');
  const anonKey = await question('NEXT_PUBLIC_SUPABASE_ANON_KEY: ');
  const serviceRoleKey = await question('SUPABASE_SERVICE_ROLE_KEY (required for API routes): ');
  const dbUrl = await question('SUPABASE_DB_URL (optional, for migrations): ');

  rl.close();

  return { url, anonKey, serviceRoleKey, dbUrl };
}

async function main() {
  console.log('🚀 Supabase Environment Setup\n');
  console.log('This script will help you configure your .env file with Supabase credentials.\n');

  // Try to get from CLI first
  const cliAvailable = tryGetFromSupabaseCLI();

  // Always prompt for manual input (CLI status doesn't always show keys)
  const values = await promptForValues();

  if (values.url) {
    updateEnvVar('NEXT_PUBLIC_SUPABASE_URL', values.url);
    console.log('✅ Updated NEXT_PUBLIC_SUPABASE_URL');
  }

  if (values.anonKey) {
    updateEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', values.anonKey);
    console.log('✅ Updated NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (values.serviceRoleKey) {
    updateEnvVar('SUPABASE_SERVICE_ROLE_KEY', values.serviceRoleKey);
    console.log('✅ Updated SUPABASE_SERVICE_ROLE_KEY');
  }

  if (values.dbUrl) {
    updateEnvVar('SUPABASE_DB_URL', values.dbUrl);
    console.log('✅ Updated SUPABASE_DB_URL');
  }

  console.log('\n✨ Environment setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Run migrations: npm run supabase:migrate');
  console.log('2. Create an admin user (see SUPABASE_SETUP.md)');
  console.log('3. Start dev server: npm run dev');
}

main().catch(console.error);

