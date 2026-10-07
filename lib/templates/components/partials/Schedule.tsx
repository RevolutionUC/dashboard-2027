import * as React from "react";
import { getEmailEvent, type EventEmailProps } from "../../event-details";
import { EmailHeading } from "../EmailHeading";
import { EmailText, EmailLink } from "../EmailText";

export const SchedulePartial: React.FC<EventEmailProps> = ({ eventDetails }) => {
  return (
    <>
      <EmailHeading as="h3">Schedule</EmailHeading>
      <EmailText>
        Event dates: {getEmailEvent(eventDetails).dates}. {getEmailEvent(eventDetails).checkInInfo}{" "}
        See <EmailLink href={getEmailEvent(eventDetails).scheduleUrl}>the event schedule</EmailLink>{" "}
        for full and up-to-date schedule details.
      </EmailText>
    </>
  );
};
