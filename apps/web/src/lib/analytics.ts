/**
 * Privacy-first analytics stub.
 * This module is kept as a no-op shim so call-sites (identify, capture, reset)
 * continue to compile cleanly without third-party tracking. The COPPA/minor-account
 * guard is preserved.
 */

export interface TelemetryUser {
  id: string;
  isMinor: boolean;
}

class PrivacyAnalytics {
  private trackingEnabled = false;

  init(user?: TelemetryUser | null) {
    // Tracking is disabled for minors per COPPA/GDPR — never enable for minors
    if (!user || user.isMinor) {
      this.trackingEnabled = false;
      return;
    }
    this.trackingEnabled = true;
  }

  identify(user: TelemetryUser) {
    this.init(user);
    // No-op: wire a real SDK here when an analytics provider is chosen
  }

  capture(_eventName: string, _properties?: Record<string, unknown>) {
    void _eventName;
    void _properties;
    if (!this.trackingEnabled) return;
    // No-op: wire a real SDK here when an analytics provider is chosen
  }

  reset() {
    this.trackingEnabled = false;
  }
}

export const analytics = new PrivacyAnalytics();
