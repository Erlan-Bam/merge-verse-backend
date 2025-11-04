import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from 'src/shared/services/prisma.service';
import { CreateNowpaymentInvoice } from '../dto/nowpayment.dto';
import * as crypto from 'crypto';

@Injectable()
export class NowpaymentService {
  private readonly IPN_KEY: string;
  private nowpayment: AxiosInstance;
  constructor(
    private prisma: PrismaService,
    configService: ConfigService,
  ) {
    const API_KEY = configService.get<string>('NOWPAYMENTS_API_KEY');
    this.IPN_KEY = configService.get<string>('NOWPAYMENT_IPN_KEY');
    this.nowpayment = axios.create({
      baseURL: 'https://api.nowpayments.io/v1',
      headers: {
        'x-api-key': API_KEY,
      },
    });
  }

  async createInvoice(data: CreateNowpaymentInvoice) {
    try {
      const response = await this.nowpayment.post('/invoice', data);

      return { url: response.data.invoice_url };
    } catch (error) {
      throw new HttpException('Failed to create invoice', 500);
    }
  }

  async verifySignature(params: any, signature: string): Promise<boolean> {
    const sortedParams = this.sortObject(params);
    const hmac = crypto.createHmac('sha512', this.IPN_KEY);
    hmac.update(JSON.stringify(sortedParams));
    const expectedSignature = hmac.digest('hex');

    return expectedSignature === signature;
  }

  private sortObject(obj: any): any {
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] =
          obj[key] && typeof obj[key] === 'object'
            ? this.sortObject(obj[key])
            : obj[key];
        return result;
      }, {} as any);
  }
}
