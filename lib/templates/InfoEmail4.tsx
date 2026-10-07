import type { EventEmailProps } from "./event-details";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeading } from "./components/EmailHeading";
import { EmailText } from "./components/EmailText";
import {
  InpersonPartial,
  TransportationPartial,
  SchedulePartial,
  CheckInPartial,
  WhatToBringPartial,
  DiscordPartial,
  HackSubmissionsPartial,
  TeamsPartial,
  SocialsPartial,
} from "./components/partials";

export const infoEmail4Meta = {
  id: "info-email-4",
  name: "Info Email 4 (day before)",
  subject: "RevolutionUC starts TOMORROW!",
  description: "Final informational email sent the day before the event",
};

interface InfoEmail4Props extends EventEmailProps {
  firstName?: string;
}

export const InfoEmail4: React.FC<InfoEmail4Props> = ({ firstName = "Hacker", eventDetails }) => {
  return (
    <EmailLayout preview="RevolutionUC starts TOMORROW!">
      <EmailHeading as="h1">Hey, {firstName}!</EmailHeading>

      <EmailText>
        RevolutionUC is starting TOMORROW at noon! Here's some important information:
      </EmailText>

      <InpersonPartial />
      <TransportationPartial />
      <SchedulePartial eventDetails={eventDetails} />
      <CheckInPartial />
      <WhatToBringPartial />
      <DiscordPartial />
      <HackSubmissionsPartial />
      <TeamsPartial />
      <SocialsPartial />
    </EmailLayout>
  );
};

export default InfoEmail4;
