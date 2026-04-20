import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import FormData from 'form-data';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME', '');
    this.apiKey = this.configService.get<string>('CLOUDINARY_API_KEY', '');
    this.apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET', '');
  }

  async uploadBuffer(buffer: Buffer, folder: string, filename: string): Promise<{ url: string }> {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new InternalServerErrorException('Cloudinary not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await this.sign(`folder=${folder}&timestamp=${timestamp}`);

    const form = new FormData();
    form.append('file', buffer, { filename });
    form.append('folder', folder);
    form.append('timestamp', String(timestamp));
    form.append('api_key', this.apiKey);
    form.append('signature', signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`,
      { method: 'POST', body: form },
    );

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new InternalServerErrorException(`Cloudinary upload error: ${res.status} ${err}`);
    }

    const data: any = await res.json();
    return { url: data.secure_url };
  }

  private async sign(params: string): Promise<string> {
    const { createHmac } = await import('crypto');
    return createHmac('sha256', this.apiSecret).update(params).digest('hex');
  }
}
