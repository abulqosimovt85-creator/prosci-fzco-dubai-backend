import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../../entities/inquiry.entity';
import * as nodemailer from 'nodemailer';

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(Inquiry)
    private inquiryRepo: Repository<Inquiry>,
  ) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '465'),
        secure: parseInt(smtpPort || '465') === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log('Email transporter configured');
    } else {
      this.logger.warn('SMTP not configured — emails will not be sent');
    }
  }

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

    // Send email notification
    await this.sendInquiryEmail(saved);

    return saved;
  }

  private async sendInquiryEmail(inquiry: Inquiry): Promise<void> {
    if (!this.transporter) return;

    const toEmail = process.env.NOTIFY_EMAIL || 'info@psci-sol.com';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #041632;">New Inquiry Received</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px; font-weight: bold; color: #444;">Name</td><td style="padding: 8px;">${inquiry.name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #444;">Company</td><td style="padding: 8px;">${inquiry.company}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #444;">Email</td><td style="padding: 8px;">${inquiry.email}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #444;">Phone</td><td style="padding: 8px;">${inquiry.phone || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #444;">Industry</td><td style="padding: 8px;">${inquiry.industry}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #444;">Budget</td><td style="padding: 8px;">${inquiry.budget}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #444;">Message</td><td style="padding: 8px;">${inquiry.message}</td></tr>
        </table>
        <p style="margin-top: 16px; color: #666; font-size: 12px;">Submitted via PROSCIENTIFIC SOLUTIONS FZCO website</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"ProScient Website" <${process.env.SMTP_USER}>`,
        to: toEmail,
        replyTo: inquiry.email,
        subject: `New Inquiry from ${inquiry.name} - ${inquiry.industry || 'General'}`,
        html,
      });
      this.logger.log(`Inquiry email sent to ${toEmail}`);
    } catch (err) {
      this.logger.error('Failed to send inquiry email', err);
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
