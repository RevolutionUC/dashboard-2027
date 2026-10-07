import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeading } from "./components/EmailHeading";
import { EmailText, EmailLink } from "./components/EmailText";
import { EmailButton } from "./components/EmailButton";

export const postEventEmailMeta = {
  id: "post-event",
  name: "Post Event Email",
  subject: "Thank you for attending RevolutionUC!",
  description: "Thank you email sent after the event",
};

interface PostEventEmailProps {
  firstName?: string;
}

export const PostEventEmail: React.FC<PostEventEmailProps> = ({ firstName = "Hacker" }) => {
  return (
    <EmailLayout preview="Thank you for attending RevolutionUC!">
      <EmailHeading as="h1">Hey, {firstName}!</EmailHeading>

      <EmailText>
        Thank you for attending RevolutionUC! Below is important information on the post event
        survey and prize information.
      </EmailText>

      <EmailHeading as="h3">Survey</EmailHeading>
      <EmailText>
        What did you think of RevolutionUC 2027? Did you absolutely love something? How can we
        improve? Let us know in our post event survey below.
      </EmailText>
      <EmailText>
        Any feedback you provide will help us to make the hackathon even better! All answers are
        anonymous and will be valuable in helping us plan for next year.
      </EmailText>
      <EmailButton href="https://forms.gle/pXH62rk36R6xQbkJ6">Post Event Survey</EmailButton>

      <EmailHeading as="h3">Winners and Prizes</EmailHeading>
      <EmailText>
        All winning hacks from this past weekend can be found on our{" "}
        <EmailLink href="https://revuc-x.devpost.com/">Devpost</EmailLink>! If you won one of our
        prize categories, we have sent you an email this morning to send you your prize. If you won
        a sponsored or MLH prize, we have forwarded your email to our sponsor and MLH so that you
        can get your prize!
      </EmailText>

      <EmailHeading as="h3">Swag</EmailHeading>
      <EmailText>
        We would like to give those who may have missed the Swag Form an opportunity to fill it out!{" "}
        <EmailLink href="https://docs.google.com/forms/d/e/1FAIpQLSfkA0AMTXkCvOxhABtlzqo5uJhIgdRTQAoigf9L72gb-nmqng/viewform">
          Here is the link
        </EmailLink>
        .
      </EmailText>
      <EmailText>
        We are able to ship swag overseas to our international participants! Please use the
        "Additional Comments" section if your address does not fit in the other fields.
      </EmailText>

      <EmailHeading as="h3">Thank You!</EmailHeading>
      <EmailText>
        Once again, thank you for making this event possible! RevolutionUC celebrated ten years of
        hackathons at the University of Cincinnati!
      </EmailText>
      <EmailText>
        If you're interested in getting involved with the hackathon or ACM@UC (the student group
        that organizes RevolutionUC), just reply to this email!
      </EmailText>

      <EmailText>We look forward to hosting you again next year!</EmailText>
    </EmailLayout>
  );
};

export default PostEventEmail;
