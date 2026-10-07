export type EmailEventDetails = {
  year: number;
  dates: string;
  deadline: string;
  venue: string;
  checkInInfo: string;
  scheduleUrl: string;
};
export const defaultEmailEvent: EmailEventDetails = {
  year: 2027,
  dates: "Dates will be confirmed by the organizers",
  deadline: "The organizers will confirm the deadline",
  venue: "Venue will be confirmed by the organizers",
  checkInInfo: "The organizers will send check-in instructions before the event.",
  scheduleUrl: "https://revolutionuc.com/schedule",
};
export type EventEmailProps = { eventDetails?: EmailEventDetails };
export const getEmailEvent = (details?: EmailEventDetails) => details ?? defaultEmailEvent;
