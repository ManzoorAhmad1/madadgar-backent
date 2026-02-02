import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const uploadPath = process.env.UPLOAD_PATH || 'uploads/';
const uploadUrl = process.env.UPLOAD_URL || 'http://localhost:5000/upload';

console.log('\n📸 Uploaded Images Report\n');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`📁 Upload Directory: ${uploadPath}`);
console.log(`🌐 Base URL: ${uploadUrl}`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (!fs.existsSync(uploadPath)) {
  console.log('❌ Upload directory does not exist!\n');
  process.exit(1);
}

const files = fs.readdirSync(uploadPath).filter(f => !f.startsWith('.'));

if (files.length === 0) {
  console.log('📭 No images found in upload directory.\n');
  process.exit(0);
}

console.log(`📊 Total Files: ${files.length}\n`);

// Group files by type
const cnicFront = files.filter(f => f.startsWith('cnicFront-'));
const cnicBack = files.filter(f => f.startsWith('cnicBack-'));
const chatImages = files.filter(f => f.startsWith('chat-'));
const otherFiles = files.filter(f => 
  !f.startsWith('cnicFront-') && 
  !f.startsWith('cnicBack-') && 
  !f.startsWith('chat-')
);

console.log('📋 File Categories:\n');
console.log(`   • CNIC Front Images: ${cnicFront.length}`);
console.log(`   • CNIC Back Images: ${cnicBack.length}`);
console.log(`   • Chat Images: ${chatImages.length}`);
console.log(`   • Other Files: ${otherFiles.length}`);
console.log('\n');

// Function to display file info
const displayFiles = (fileList, category) => {
  if (fileList.length === 0) return;
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`${category} (${fileList.length} files)`);
  console.log('═'.repeat(70));
  
  fileList.forEach((file, index) => {
    const filePath = path.join(uploadPath, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const publicUrl = `${uploadUrl}/${file}`;
    
    console.log(`\n${index + 1}. ${file}`);
    console.log(`   📏 Size: ${sizeKB} KB`);
    console.log(`   📅 Created: ${stats.birthtime.toLocaleString()}`);
    console.log(`   🔗 URL: ${publicUrl}`);
  });
};

// Display all files by category
displayFiles(cnicFront, '🪪 CNIC Front Images');
displayFiles(cnicBack, '🪪 CNIC Back Images');
displayFiles(chatImages, '💬 Chat Images');
displayFiles(otherFiles, '📄 Other Files');

console.log('\n' + '═'.repeat(70));
console.log('📊 Storage Summary');
console.log('═'.repeat(70));

const totalSize = files.reduce((sum, file) => {
  const filePath = path.join(uploadPath, file);
  return sum + fs.statSync(filePath).size;
}, 0);

const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

console.log(`\n   Total Files: ${files.length}`);
console.log(`   Total Size: ${totalSizeMB} MB`);
console.log(`   Directory: ${uploadPath}`);
console.log('');

// Show recent files
const sortedByDate = files.map(file => ({
  name: file,
  time: fs.statSync(path.join(uploadPath, file)).mtime
})).sort((a, b) => b.time - a.time);

console.log('\n📅 Most Recent Uploads (Last 5):\n');
sortedByDate.slice(0, 5).forEach((file, index) => {
  console.log(`   ${index + 1}. ${file.name}`);
  console.log(`      🕒 ${file.time.toLocaleString()}`);
  console.log(`      🔗 ${uploadUrl}/${file.name}\n`);
});

console.log('═'.repeat(70));
console.log('💡 To test image access, copy any URL above and open in browser');
console.log('═'.repeat(70));
console.log('');
