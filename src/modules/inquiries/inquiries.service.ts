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

    // Try to send email notification (non-blocking)
    this.sendEmailAsync(saved).catch(err =>
      this.logger.error('Email notification failed', err),
    );

    return saved;
  }

  private async sendEmailAsync(inquiry: Inquiry): Promise<void> {
    this.logger.log('Attempting to send inquiry email...');

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = process.env.SMTP_PORT || '465';
    const notifyEmail = process.env.NOTIFY_EMAIL || 'info@psci-sol.com';

    this.logger.log(`SMTP config: host=${smtpHost}, port=${smtpPort}, user=${smtpUser ? '***' : 'MISSING'}, pass=${smtpPass ? '***' : 'MISSING'}, to=${notifyEmail}`);

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP not configured — skipping email. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars.');
      return;
    }

    // Dynamic import to avoid crash if nodemailer is not installed
    let nodemailer;
    try {
      nodemailer = await import('nodemailer');
      this.logger.log('nodemailer imported successfully');
    } catch (err) {
      this.logger.error('Failed to import nodemailer', err);
      return;
    }

    let transporter;
    try {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: parseInt(smtpPort) === 465,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        tls: { rejectUnauthorized: false },
        socketOptions: { family: 4 },
      });
      this.logger.log('SMTP transporter created');
    } catch (err) {
      this.logger.error('Failed to create SMTP transporter', err);
      return;
    }

    try {
      this.logger.log('Verifying SMTP connection...');
      await transporter.verify();
      this.logger.log('SMTP connection verified successfully');
    } catch (err) {
      this.logger.error('SMTP connection verification failed', err);
      return;
    }

    const info = await transporter.sendMail({
      from: `"ProScient Website" <${smtpUser}>`,
      to: notifyEmail,
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

    this.logger.log(`Email sent successfully! Message ID: ${info.messageId}`);
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
