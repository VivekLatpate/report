import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export class CloudinaryService {
  private isConfigured: boolean = false;
  
  constructor() {
    // Check if Cloudinary is properly configured
    this.isConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name_here' &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
    
    console.log('🔍 Cloudinary config check:', {
      isConfigured: this.isConfigured,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      hasSecret: !!process.env.CLOUDINARY_API_SECRET
    });
    
    if (this.isConfigured) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
  }
  // Upload image to Cloudinary
  async uploadImage(file: File, folder: string = 'crime-reports'): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured. Using fallback storage.');
    }
    
    try {
      // Convert File to buffer
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const dataURI = `data:${file.type};base64,${base64}`;

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: folder,
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto' }
        ]
      });

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes
      };
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new Error('Failed to upload image to Cloudinary');
    }
  }

  // Upload multiple images
  async uploadMultipleImages(files: File[], folder: string = 'crime-reports'): Promise<CloudinaryUploadResult[]> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured. Using fallback storage.');
    }
    
    try {
      const uploadPromises = files.map(file => this.uploadImage(file, folder));
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error('Error uploading multiple images:', error);
      throw new Error('Failed to upload images to Cloudinary');
    }
  }

  // Delete image from Cloudinary
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      throw new Error('Failed to delete image from Cloudinary');
    }
  }

  // Get image URL with transformations
  getImageUrl(publicId: string, transformations?: any): string {
    return cloudinary.url(publicId, {
      ...transformations,
      secure: true
    });
  }

  // Generate thumbnail URL
  getThumbnailUrl(publicId: string, width: number = 300, height: number = 300): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto',
      secure: true
    });
  }
}
