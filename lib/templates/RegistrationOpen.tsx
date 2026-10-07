import * as React from "react";
import { getEmailEvent, type EventEmailProps } from "./event-details";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeading } from "./components/EmailHeading";
import { EmailText, EmailLink } from "./components/EmailText";
import { EmailButton } from "./components/EmailButton";

export const registrationOpenMeta = {
  id: "registration-open",
  name: "Registration Open",
  subject: "Registration is now open for RevolutionUC!",
  description: "Announcement that registration is open",
};

interface RegistrationOpenProps extends EventEmailProps {
  firstName?: string;
}

export const RegistrationOpen: React.FC<RegistrationOpenProps> = ({
  firstName = "Hacker",
  eventDetails,
}) => {
  return (
    <EmailLayout preview="Registration is now open for RevolutionUC!">
      <EmailHeading as="h1">Hey, {firstName}!</EmailHeading>
      <EmailHeading as="h2">Registration is Now Open!</EmailHeading>

      <EmailText>
        We're excited to announce that registration for RevolutionUC{" "}
        {getEmailEvent(eventDetails).year}
        is now open!
      </EmailText>

      <EmailText>
        RevolutionUC is the University of Cincinnati's premier hackathon, where students from around
        the world come together to build, learn, and innovate over 24 hours.
      </EmailText>

      <EmailHeading as="h3">Event Details</EmailHeading>
      <EmailText>
        <strong>When:</strong> {getEmailEvent(eventDetails).dates}
        <br />
        <strong>Where:</strong> {getEmailEvent(eventDetails).venue}
        <br />
        <strong>Duration:</strong> 24 hours of hacking!
      </EmailText>

      <EmailHeading as="h3">What to Expect</EmailHeading>
      <EmailText>
        • Free food and swag
        <br />• Amazing sponsors and workshops
        <br />• Prizes for winning hacks
        <br />• Networking opportunities
        <br />• A weekend of fun and learning!
      </EmailText>

      <EmailButton href="https://revolutionuc.com/register">Register Now</EmailButton>

      <EmailText>
        Follow us on social media for updates:{" "}
        <EmailLink href="https://twitter.com/revolution_uc">Twitter</EmailLink>,{" "}
        <EmailLink href="https://instagram.com/revolution.uc">Instagram</EmailLink>,{" "}
        <EmailLink href="https://www.tiktok.com/@revolution.uc">TikTok</EmailLink>
      </EmailText>

      <EmailText>We can't wait to see you there!</EmailText>
    </EmailLayout>
  );
};

export default RegistrationOpen;
