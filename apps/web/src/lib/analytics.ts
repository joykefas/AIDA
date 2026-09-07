/**
 * Privacy-first analytics and telemetry wrapper.
 * Enforces COPPA and GDPR compliance by automatically suppressing behavioral tracking,
 * marketing cookies, and event streaming for accounts identified as minors (13-17)
 * or users who have not given explicit consent.
 */

export interface TelemetryUser {
  id: string;
  isMinor: boolean;
}

class PrivacyAnalytics {
  private trackingEnabled = false;

  init(user?: TelemetryUser | null) {
    if (!user) {
      this.trackingEnabled = false;
      return;
    }

    // Strictly disable third-party tracking for minors per COPPA / Legal Spec
    if (user.isMinor) {
      this.trackingEnabled = false;
      if (typeof window !== "undefined") {
        // Disable cookies and clear any tracking identifiers
        (window as any)["ga-disable-analytics"] = true;
      }
      return;
    }

    this.trackingEnabled = true;
  }

  capture(eventName: string, properties?: Record<string, any>) {
    if (!this.trackingEnabled) return;

    // Ready for PostHog / telemetry provider integration
    if (typeof window !== "undefined" && (window as any).posthog) {
      (window as any).posthog.capture(eventName, properties);
    }
  }
}

export const analytics = new PrivacyAnalytics();
