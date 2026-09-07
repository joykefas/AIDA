import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailProvider } from '../../providers/email.provider';
import { ProgressService } from '../progress.service';
import { QUEUE_SEND_WEEKLY_REPORT } from '../../queue/queue.constants';
import type { WeeklyProgressReport } from '@aida/shared';

@Processor(QUEUE_SEND_WEEKLY_REPORT)
export class SendWeeklyReportProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private progressService: ProgressService,
    private email: EmailProvider,
  ) {
    super();
  }

  async process(_job: Job) {
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, displayName: true },
    });
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    for (const user of users) {
      const report = await this.progressService.weekly(user.id);
      const html = this.renderReportHtml(
        user.displayName || 'Student',
        report,
        appUrl,
      );

      await this.email.send({
        to: user.email,
        subject: `Your AIDA Weekly Learning Report (${report.currentStreakDays}-day streak!)`,
        html,
      });
    }
  }

  private renderReportHtml(
    name: string,
    report: WeeklyProgressReport,
    appUrl: string,
  ): string {
    const strengthsHtml =
      report.strengths.length > 0
        ? report.strengths
            .map(
              (s) => `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-size: 14px; color: #1e293b; font-weight: 500;">${s.topicTitle}</td>
            <td style="padding: 10px 0; text-align: right;">
              <span style="display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 12px; font-weight: 600; padding: 2px 8px; rounded: 9999px;">
                ${Math.round(s.masteryScore * 100)}% Mastery
              </span>
            </td>
          </tr>`,
            )
            .join('')
        : `<tr><td colspan="2" style="padding: 12px 0; font-size: 13px; color: #64748b; font-style: italic;">Complete more quizzes to establish topic strengths!</td></tr>`;

    const weaknessesHtml =
      report.weaknesses.length > 0
        ? report.weaknesses
            .map(
              (w) => `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-size: 14px; color: #1e293b; font-weight: 500;">${w.topicTitle}</td>
            <td style="padding: 10px 0; text-align: right;">
              <span style="display: inline-block; background-color: #fff1f2; color: #be123c; font-size: 12px; font-weight: 600; padding: 2px 8px; rounded: 9999px;">
                ${Math.round(w.masteryScore * 100)}% Review Recommended
              </span>
            </td>
          </tr>`,
            )
            .join('')
        : `<tr><td colspan="2" style="padding: 12px 0; font-size: 13px; color: #64748b; font-style: italic;">No critical weak points identified this week. Great work!</td></tr>`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Learning Summary</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Weekly Learning Pulse</h1>
      <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Hey ${name}, here is your weekly mastery breakdown.</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 24px;">
      <!-- Stats Row -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="width: 33.3%; text-align: center; padding: 12px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9;">
            <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Quizzes</div>
            <div style="font-size: 22px; font-weight: 700; color: #0284c7; margin-top: 4px;">${report.quizzesTaken}</div>
          </td>
          <td style="width: 10px;"></td>
          <td style="width: 33.3%; text-align: center; padding: 12px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9;">
            <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Topics Reviewed</div>
            <div style="font-size: 22px; font-weight: 700; color: #0284c7; margin-top: 4px;">${report.reviewsCompleted}</div>
          </td>
          <td style="width: 10px;"></td>
          <td style="width: 33.3%; text-align: center; padding: 12px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9;">
            <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Streak</div>
            <div style="font-size: 22px; font-weight: 700; color: #0284c7; margin-top: 4px;">${report.currentStreakDays}d</div>
          </td>
        </tr>
      </table>

      <!-- Strengths -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 15px; font-weight: 600; margin: 0 0 8px; color: #0f172a;">Top Strengths</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${strengthsHtml}
        </table>
      </div>

      <!-- Needs Review -->
      <div style="margin-bottom: 32px;">
        <h3 style="font-size: 15px; font-weight: 600; margin: 0 0 8px; color: #0f172a;">Focus Areas for Next Week</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${weaknessesHtml}
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0 16px;">
        <a href="${appUrl}/dashboard" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Continue Learning
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
      <p style="margin: 0;">Sent by AIDA Adaptive Learning Platform. You received this because weekly progress summaries are enabled in your account settings.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
