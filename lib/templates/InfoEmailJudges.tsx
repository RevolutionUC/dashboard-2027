import * as React from "react";
import { getEmailEvent, type EventEmailProps } from "./event-details";
import { EmailLink } from "./components/EmailText";
import { InfoEmailTemplate } from "./components/InfoEmailTemplate";

export const infoEmailJudgesMeta = {
  id: "info-email-judges",
  name: "Judge Information",
  subject: "RevolutionUC Judge Information",
  description: "Information for event judges",
};

export const InfoEmailJudges: React.FC<EventEmailProps> = ({ eventDetails }) => {
  return (
    <InfoEmailTemplate
      preview="RevolutionUC Judge Information"
      greeting="Hey, Judge!"
      intro={
        <>
          Thank you for volunteering to be a judge at RevolutionUC! Your expertise and feedback will
          be invaluable to our hackers. Here's what you need to know:
        </>
      }
      sections={[
        {
          title: "Event Details",
          body: (
            <>
              {getEmailEvent(eventDetails).dates}. {getEmailEvent(eventDetails).venue}. Your judging
              assignment will include your scheduled time.
            </>
          ),
        },
        {
          title: "Judging Process",
          body: (
            <>
              You'll be assigned to judge a set of projects. Each team will have a few minutes to
              present their hack, followed by a brief Q&A. You'll score each project based on
              criteria like innovation, technical complexity, design, and usefulness.
            </>
          ),
        },
        {
          title: "What to Expect",
          body: (
            <>
              Teams have been working for 24 hours, so expect to see a wide range of projects in
              various states of completion. We encourage you to provide constructive feedback to
              help hackers learn and grow!
            </>
          ),
        },
        {
          title: "Parking",
          body: (
            <>
              The 1819 Innovation Hub has a parking lot with plentiful spaces, and it is completely
              free on the weekends.
            </>
          ),
        },
      ]}
      contact={
        <>
          If you have any questions, please reach out to us at{" "}
          <EmailLink href="mailto:info@revolutionuc.com">info@revolutionuc.com</EmailLink>.
        </>
      }
      closing={<>We look forward to seeing you at RevolutionUC!</>}
    />
  );
};

export default InfoEmailJudges;
