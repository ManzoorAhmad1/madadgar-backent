import fs from 'fs';
import path from 'path';

/**
 * Ensure upload directory exists
 */
export const ensureUploadDir = () => {
  const uploadPath = process.env.UPLOAD_PATH || 'uploads/';
  
  try {
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log(`✅ Upload directory created: ${uploadPath}`);
    } else {
      console.log(`✅ Upload directory exists: ${uploadPath}`);
    }
  } catch (error) {
    console.error(`❌ Failed to create upload directory: ${error.message}`);
    // Don't throw error, let it fail gracefully
  }
};

/**
 * Get full file URL for uploaded files
 */
export const getFileUrl = (filename) => {
  const baseUrl = process.env.UPLOAD_URL || 'http://localhost:5000/uploads';
  return `${baseUrl}/${filename}`;
};

/**
 * Delete file from upload directory
 */
export const deleteFile = (filename) => {
  try {
    const uploadPath = process.env.UPLOAD_PATH || 'uploads/';
    const filePath = path.join(uploadPath, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ File deleted: ${filename}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Failed to delete file: ${error.message}`);
    return false;
  }
};
