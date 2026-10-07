import * as React from "react";
import { getEmailEvent, type EventEmailProps } from "./event-details";
import { Section } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeading } from "./components/EmailHeading";
import { EmailText, EmailLink } from "./components/EmailText";
import { EmailButton } from "./components/EmailButton";

export const confirmAttendanceMeta = {
  id: "confirm-attendance",
  name: "Confirm Attendance",
  subject: "Confirm your attendance for RevolutionUC",
  description: "Sent to ask registrants to confirm their attendance",
  requiredProps: ["yesConfirmationUrl", "noConfirmationUrl"],
};

interface ConfirmAttendanceProps extends EventEmailProps {
  firstName?: string;
  yesConfirmationUrl?: string;
  noConfirmationUrl?: string;
  offWaitlist?: boolean;
}

export const ConfirmAttendance: React.FC<ConfirmAttendanceProps> = ({
  firstName = "Hacker",
  eventDetails,
  yesConfirmationUrl = "#",
  noConfirmationUrl = "#",
  offWaitlist = false,
}) => {
  const event = getEmailEvent(eventDetails);
  return (
    <EmailLayout preview="Confirm your attendance for RevolutionUC">
      <EmailHeading as="h1">Hi, {firstName}!</EmailHeading>

      {offWaitlist ? (
        <EmailText>
          <strong>You have been moved off the waitlist for RevolutionUC!</strong> Please confirm
          your attendance. Event dates: {event.dates}.
        </EmailText>
      ) : (
        <EmailText>
          We're excited for RevolutionUC {event.year}. {event.dates}. {event.venue}. Please confirm
          your in-person attendance:
        </EmailText>
      )}

      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <EmailButton href={yesConfirmationUrl} variant="primary">
          Yes - I'm attending RevolutionUC
        </EmailButton>
      </Section>

      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <EmailButton href={noConfirmationUrl} variant="success">
          No - I'm not attending RevolutionUC
        </EmailButton>
      </Section>

      <EmailText>
        If you select <strong>Yes</strong>, you'll receive a welcome email with event details. Spots
        are limited, so confirm early to secure your spot before we reach capacity. If the event
        fills up, you'll be placed on the waitlist and notified if a spot becomes available. We hope
        to see you there!
      </EmailText>

      <EmailText>
        <strong>Check-In Information:</strong> {event.checkInInfo}
      </EmailText>

      <EmailText>
        If you have successfully confirmed your attendance but need to check in late, please email
        us in advance, and we will hold your spot!
      </EmailText>

      <EmailText>
        <strong>Is there a confirmation deadline?</strong>
        <br />
        {event.deadline}.
      </EmailText>

      <EmailText>
        <strong>What if I confirm my attendance now and later can't attend?</strong>
        <br />
        Please send us an email at{" "}
        <EmailLink href="mailto:info@revolutionuc.com">info@revolutionuc.com</EmailLink> to release
        your spot.
      </EmailText>

      <EmailText>
        <strong>What if I later find out I can attend?</strong>
        <br />
        Please email us as soon as you find out you can attend at{" "}
        <EmailLink href="mailto:info@revolutionuc.com">info@revolutionuc.com</EmailLink>. We'll do
        our best to find space for you, but please understand that we may have to place you on a
        waitlist.
      </EmailText>

      <EmailText>
        <strong>What if I show up to the event without confirming my attendance?</strong>
        <br />
        Contact the organizers about availability. Registration and a confirmed place are required
        for in-person participation.
      </EmailText>

      <EmailText>
        <strong>I accidentally selected No!</strong>
        <br />
        Please email us at{" "}
        <EmailLink href="mailto:info@revolutionuc.com">info@revolutionuc.com</EmailLink> and we'll
        update your registration.
      </EmailText>

      <EmailText>
        If you're over 18, you can review the event waiver you agreed to{" "}
        <EmailLink href="https://revolutionuc.com/waiver">here</EmailLink>.
      </EmailText>
    </EmailLayout>
  );
};

export default ConfirmAttendance;
