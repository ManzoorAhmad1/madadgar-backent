import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('\n🔍 Verifying Upload Configuration...\n');

const uploadPath = process.env.UPLOAD_PATH || 'uploads/';
const uploadUrl = process.env.UPLOAD_URL || 'http://localhost:5000/upload';

let hasErrors = false;

// 1. Check environment variables
console.log('📋 Environment Variables:');
console.log(`   UPLOAD_PATH: ${uploadPath}`);
console.log(`   UPLOAD_URL: ${uploadUrl}`);

if (!process.env.UPLOAD_PATH) {
  console.log('   ⚠️  UPLOAD_PATH not set in .env, using default: uploads/');
}

if (!process.env.UPLOAD_URL) {
  console.log('   ⚠️  UPLOAD_URL not set in .env, using default: http://localhost:5000/upload');
}

console.log('');

// 2. Check if upload directory exists
console.log('📁 Directory Status:');
if (fs.existsSync(uploadPath)) {
  console.log(`   ✅ Upload directory exists: ${uploadPath}`);
  
  // Get directory stats
  try {
    const stats = fs.statSync(uploadPath);
    console.log(`   📊 Created: ${stats.birthtime}`);
    console.log(`   📊 Modified: ${stats.mtime}`);
    
    // Count files
    const files = fs.readdirSync(uploadPath);
    console.log(`   📊 Files in directory: ${files.length}`);
    
    if (files.length > 0) {
      console.log(`   📄 Recent files:`);
      files.slice(0, 5).forEach(file => {
        const filePath = path.join(uploadPath, file);
        const fileStats = fs.statSync(filePath);
        const sizeKB = (fileStats.size / 1024).toFixed(2);
        console.log(`      - ${file} (${sizeKB} KB)`);
      });
    }
  } catch (error) {
    console.log(`   ⚠️  Could not read directory stats: ${error.message}`);
  }
} else {
  console.log(`   ❌ Upload directory does NOT exist: ${uploadPath}`);
  console.log(`   💡 Creating directory...`);
  
  try {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`   ✅ Directory created successfully!`);
  } catch (error) {
    console.log(`   ❌ Failed to create directory: ${error.message}`);
    hasErrors = true;
  }
}

console.log('');

// 3. Check write permissions
console.log('✍️  Write Permission Test:');
const testFileName = `test-${Date.now()}.txt`;
const testFilePath = path.join(uploadPath, testFileName);

try {
  fs.writeFileSync(testFilePath, 'This is a test file for upload verification.');
  console.log(`   ✅ Can write to directory`);
  
  // Verify file exists
  if (fs.existsSync(testFilePath)) {
    console.log(`   ✅ Test file created successfully`);
    
    // Clean up
    fs.unlinkSync(testFilePath);
    console.log(`   ✅ Test file deleted successfully`);
  } else {
    console.log(`   ❌ Test file was not created`);
    hasErrors = true;
  }
} catch (error) {
  console.log(`   ❌ Cannot write to directory: ${error.message}`);
  console.log(`   💡 Check directory permissions (should be 755 or 777)`);
  hasErrors = true;
}

console.log('');

// 4. Check URL configuration
console.log('🌐 URL Configuration:');
if (uploadUrl.includes('localhost')) {
  console.log(`   ⚠️  Using localhost URL: ${uploadUrl}`);
  console.log(`   💡 For production, update UPLOAD_URL in .env to your domain`);
} else {
  console.log(`   ✅ Using production URL: ${uploadUrl}`);
}

// Check if URL matches expected pattern
if (uploadUrl.includes('madadgar360.com') || uploadUrl.includes('sub.madadgar360.com')) {
  console.log(`   ✅ URL appears to be configured for Hostinger`);
} else if (!uploadUrl.includes('localhost')) {
  console.log(`   ⚠️  URL doesn't match expected Hostinger domain`);
}

console.log('');

// 5. Check if running on Hostinger
console.log('🖥️  Environment Detection:');
const isHostinger = uploadPath.includes('/home/u313862463') || uploadPath.includes('madadgar360.com');
const isLocal = uploadPath === 'uploads/' || uploadPath.includes('uploads/');

if (isHostinger) {
  console.log(`   🌐 Detected Hostinger environment`);
  console.log(`   💡 Make sure the uploads directory exists on the server:`);
  console.log(`      mkdir -p ${uploadPath}`);
  console.log(`      chmod 755 ${uploadPath}`);
} else if (isLocal) {
  console.log(`   💻 Detected local development environment`);
} else {
  console.log(`   ❓ Unknown environment`);
}

console.log('');

// 6. Summary
console.log('📊 Summary:');
if (hasErrors) {
  console.log(`   ❌ Configuration has issues that need to be fixed`);
  console.log(`   💡 See errors above for details`);
  process.exit(1);
} else {
  console.log(`   ✅ Upload configuration appears to be correct!`);
  console.log(`   💡 Next steps:`);
  
  if (isHostinger) {
    console.log(`      1. Ensure the directory exists on Hostinger server`);
    console.log(`      2. Set proper permissions (755 or 777)`);
    console.log(`      3. Test file upload through the application`);
    console.log(`      4. Verify files are accessible via URL`);
  } else {
    console.log(`      1. Test file upload through the application`);
    console.log(`      2. Verify files are accessible via URL`);
    console.log(`      3. For production, update .env with Hostinger paths`);
  }
}

console.log('');
console.log('📚 For detailed setup instructions, see: HOSTINGER_UPLOAD_SETUP.md');
console.log('');
