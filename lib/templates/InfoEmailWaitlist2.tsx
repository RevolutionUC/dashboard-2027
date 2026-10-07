import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeading } from "./components/EmailHeading";
import { EmailText } from "./components/EmailText";

export const infoEmailWaitlist2Meta = {
  id: "info-email-waitlist-2",
  name: "Waitlist Follow Up",
  subject: "RevolutionUC Waitlist Update",
  description: "Follow up email for waitlisted registrants",
};

interface InfoEmailWaitlist2Props {
  firstName?: string;
}

export const InfoEmailWaitlist2: React.FC<InfoEmailWaitlist2Props> = ({ firstName = "Hacker" }) => {
  return (
    <EmailLayout preview="RevolutionUC Waitlist Update">
      <EmailHeading as="h1">Hey, {firstName}!</EmailHeading>

      <EmailText>We wanted to follow up about your waitlist status for RevolutionUC.</EmailText>

      <EmailText>
        Please keep your contact details and attendance plans up to date. If a place becomes
        available, we will email you an offer with a response deadline.
      </EmailText>

      <EmailText>
        A waitlist position does not guarantee a place. Contact the organizers before making travel
        plans.
      </EmailText>

      <EmailText>
        We appreciate your patience and enthusiasm for RevolutionUC. We hope to see you there!
      </EmailText>
    </EmailLayout>
  );
};

export default InfoEmailWaitlist2;
