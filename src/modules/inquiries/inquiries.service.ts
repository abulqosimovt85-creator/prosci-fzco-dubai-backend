import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../../entities/inquiry.entity';

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(
    @InjectRepository(Inquiry)
    private inquiryRepo: Repository<Inquiry>,
  ) {}

  async findAll(): Promise<Inquiry[]> {
    return this.inquiryRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Inquiry> {
    const inquiry = await this.inquiryRepo.findOne({ where: { id } });
    if (!inquiry) {
      throw new NotFoundException(`Inquiry with ID "${id}" not found`);
    }
    return inquiry;
  }

  async create(dto: Partial<Inquiry>): Promise<Inquiry> {
    const inquiry = this.inquiryRepo.create({
      name: dto.name,
      company: dto.company || 'Scientific Partner',
      email: dto.email,
      phone: dto.phone,
      message: dto.message || '',
      productId: dto.productId,
      industry: dto.industry || 'General Science',
      budget: dto.budget || 'AED 50k - 150k',
      status: 'pending',
    });
    const saved = await this.inquiryRepo.save(inquiry);

    this.sendEmailAsync(saved).catch(err =>
      this.logger.error('Email notification failed', err),
    );

    return saved;
  }

  private async sendEmailAsync(inquiry: Inquiry): Promise<void> {
    this.logger.log('Attempting to send inquiry email...');

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'ProScient Website <noreply@psci-sol.com>';
    const toEmail = process.env.NOTIFY_EMAIL || 'info@psci-sol.com';

    this.logger.log(`Resend config: apiKey=${apiKey ? '***' : 'MISSING'}, from=${fromEmail}, to=${toEmail}`);

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured — skipping email');
      return;
    }

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(apiKey);

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [toEmail],
        replyTo: inquiry.email,
        subject: `New Inquiry from ${inquiry.name} - ${inquiry.industry || 'General'}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#041632;">New Inquiry Received</h2>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
              <tr><td style="padding:8px;font-weight:bold;color:#444;">Name</td><td style="padding:8px;">${inquiry.name}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#444;">Company</td><td style="padding:8px;">${inquiry.company}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#444;">Email</td><td style="padding:8px;">${inquiry.email}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#444;">Phone</td><td style="padding:8px;">${inquiry.phone || 'N/A'}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#444;">Industry</td><td style="padding:8px;">${inquiry.industry}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#444;">Budget</td><td style="padding:8px;">${inquiry.budget}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#444;">Message</td><td style="padding:8px;">${inquiry.message}</td></tr>
            </table>
          </div>
        `,
      });

      if (error) {
        this.logger.error('Resend API error', error);
        return;
      }

      this.logger.log(`Email sent successfully! ID: ${data?.id}`);
    } catch (err) {
      this.logger.error('Email send failed', err);
    }
  }

  async updateStatus(
    id: string,
    status: 'pending' | 'in-contact' | 'archived',
  ): Promise<Inquiry> {
    const inquiry = await this.findOne(id);
    inquiry.status = status;
    return this.inquiryRepo.save(inquiry);
  }
}
