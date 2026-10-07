import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeading } from "./components/EmailHeading";
import { EmailText } from "./components/EmailText";

export const infoEmailWaitlistPass1Meta = {
  id: "info-email-waitlist-pass-1",
  name: "Waitlist Pass 1 Notification",
  subject: "RevolutionUC Waitlist Information",
  description: "Initial waitlist email explaining attendance offers",
};

interface InfoEmailWaitlistPass1Props {
  firstName?: string;
}

export const InfoEmailWaitlistPass1: React.FC<InfoEmailWaitlistPass1Props> = ({
  firstName = "Hacker",
}) => {
  return (
    <EmailLayout preview="RevolutionUC Waitlist Information">
      <EmailHeading as="h1">Hey, {firstName}!</EmailHeading>

      <EmailText>
        Thank you for registering for RevolutionUC. We've received an overwhelming response, and we
        are currently at full capacity. Because of this, you have been placed on our waitlist.
      </EmailText>

      <EmailText>
        If a place becomes available, we will send you an offer link. Your place will be held for up
        to 24 hours, or until the confirmation deadline, whichever is earlier. Respond using your
        application link before the offer expires.
      </EmailText>

      <EmailText>We appreciate your enthusiasm and hope to see you at RevolutionUC!</EmailText>
    </EmailLayout>
  );
};

export default InfoEmailWaitlistPass1;
