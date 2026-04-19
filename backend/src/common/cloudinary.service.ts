import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    folder: string,
    originalName: string,
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const publicId = `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error || !result) {
              this.logger.error(`Error subiendo a Cloudinary: ${error?.message}`);
              return reject(error);
            }
            resolve({ url: result.secure_url, publicId: result.public_id });
          },
        )
        .end(buffer);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
    } catch (err) {
      this.logger.warn(`No se pudo eliminar de Cloudinary: ${publicId}`);
    }
  }
}
