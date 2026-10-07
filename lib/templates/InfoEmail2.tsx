import type { EventEmailProps } from "./event-details";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeading } from "./components/EmailHeading";
import { EmailText } from "./components/EmailText";
import {
  InpersonPartial,
  SchedulePartial,
  SponsorsPartial,
  DiscordPartial,
  SocialsPartial,
  WaiverPartial,
} from "./components/partials";

export const infoEmail2Meta = {
  id: "info-email-2",
  name: "Info Email 2 (2 weeks out)",
  subject: "RevolutionUC is less than 2 weeks away!",
  description: "Second informational email sent 2 weeks before the event",
};

interface InfoEmail2Props extends EventEmailProps {
  firstName?: string;
}

export const InfoEmail2: React.FC<InfoEmail2Props> = ({ firstName = "Hacker", eventDetails }) => {
  return (
    <EmailLayout preview="RevolutionUC is less than 2 weeks away!">
      <EmailHeading as="h1">Hey, {firstName}!</EmailHeading>

      <EmailText>
        We're less than 2 weeks away from RevolutionUC 2027! Here are some updates on the event:
      </EmailText>

      <InpersonPartial />
      <SchedulePartial eventDetails={eventDetails} />
      <SponsorsPartial />
      <DiscordPartial />
      <SocialsPartial />
      <WaiverPartial />

      <EmailText>
        <strong>Can't wait to see you there!</strong>
      </EmailText>

      <EmailText>
        Get excited! There's less than two weeks until hacking begins at RevolutionUC!
      </EmailText>
    </EmailLayout>
  );
};

export default InfoEmail2;
