import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {
    sgMail.setApiKey(this.configService.getOrThrow<string>('SENDGRID_API_KEY'));
  }

  async sendDynamicTemplateEmail(to: string, templateId: string, dynamicData: Record<string, any>) {
    const msg = {
      to,
      from: this.configService.getOrThrow<string>('SENDGRID_SENDER_EMAIL'),
      templateId,
      dynamic_template_data: dynamicData,
    };

    try {
      await sgMail.send(msg);
      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}
