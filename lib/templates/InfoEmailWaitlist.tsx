import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeading } from "./components/EmailHeading";
import { EmailText } from "./components/EmailText";

export const infoEmailWaitlistMeta = {
  id: "info-email-waitlist",
  name: "Waitlist Notification",
  subject: "RevolutionUC Waitlist Information",
  description: "Sent to registrants placed on the waitlist",
};

interface InfoEmailWaitlistProps {
  firstName?: string;
}

export const InfoEmailWaitlist: React.FC<InfoEmailWaitlistProps> = ({ firstName = "Hacker" }) => {
  return (
    <EmailLayout preview="RevolutionUC Waitlist Information">
      <EmailHeading as="h1">Hey, {firstName}!</EmailHeading>

      <EmailText>
        Thank you for registering for RevolutionUC. We've received an overwhelming response, and
        while we'd love to accommodate everyone, we are currently at full capacity. As a result, we
        have put you on our <strong>waitlist</strong>.
      </EmailText>

      <EmailText>
        If a place opens up, we will email you an attendance offer. Please respond before its
        expiry. A waitlist position does not guarantee admission; contact the organizers before
        making travel plans.
      </EmailText>

      <EmailText>We appreciate your enthusiasm and hope to see you at RevolutionUC!</EmailText>
    </EmailLayout>
  );
};

export default InfoEmailWaitlist;
