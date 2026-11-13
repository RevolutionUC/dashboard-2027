// ---------- FAKE DATA (we'll swap these for real numbers later) ----------
const summary = [
  { label: "Total registrations", value: 250 },
  { label: "Approved", value: 120 },
  { label: "Pending", value: 60 },
  { label: "Rejected", value: 30 },
  { label: "Waitlisted", value: 25 },
  { label: "Withdrew", value: 15 },
  { label: "Universities represented", value: 18 },
  { label: "Accessibility requests", value: 9 },
];

const capacity = { total: 400, approved: 120 };

const registrationsByWeek = [
  { label: "Week 1", value: 20 },
  { label: "Week 2", value: 45 },
  { label: "Week 3", value: 70 },
  { label: "Week 4", value: 65 },
  { label: "Week 5", value: 50 },
];

const levelOfStudy = [
  { label: "Freshman", value: 60 },
  { label: "Sophomore", value: 70 },
  { label: "Junior", value: 55 },
  { label: "Senior", value: 40 },
  { label: "Graduate", value: 18 },
  { label: "Other", value: 7 },
];

const graduationYears = [
  { label: "2026", value: 40 },
  { label: "2027", value: 70 },
  { label: "2028", value: 65 },
  { label: "2029", value: 55 },
  { label: "2030+", value: 20 },
];

const experience = [
  { label: "First-time hackers", value: 140 },
  { label: "Returning hackers", value: 110 },
];

const origin = [
  { label: "Domestic", value: 215 },
  { label: "International", value: 35 },
];

const location = [
  { label: "Ohio", value: 150 },
  { label: "Other states", value: 65 },
  { label: "Other countries", value: 35 },
];

const byUniversity = [
  { label: "University of Cincinnati", value: 110 },
  { label: "Ohio State", value: 45 },
  { label: "Miami University", value: 30 },
  { label: "Xavier", value: 20 },
  { label: "Other", value: 45 },
];

const byMajor = [
  { label: "Computer science", value: 130 },
  { label: "Engineering", value: 50 },
  { label: "IT / Information systems", value: 35 },
  { label: "Business", value: 15 },
  { label: "Other", value: 20 },
];

const interests = [
  { label: "AI / Machine learning", value: 130 },
  { label: "Web development", value: 115 },
  { label: "Mobile development", value: 60 },
  { label: "Cybersecurity", value: 45 },
  { label: "Data science", value: 55 },
  { label: "Hardware", value: 30 },
  { label: "Game development", value: 40 },
];

const languages = [
  { label: "Python", value: 190 },
  { label: "JavaScript / TypeScript", value: 140 },
  { label: "Java", value: 120 },
  { label: "C / C++", value: 85 },
  { label: "Other", value: 40 },
];

const skillLevel = [
  { label: "Beginner", value: 95 },
  { label: "Intermediate", value: 110 },
  { label: "Advanced", value: 45 },
];

const teamStatus = [
  { label: "Already have a team", value: 80 },
  { label: "Looking for teammates", value: 110 },
  { label: "Working solo", value: 60 },
];

const gender = [
  { label: "Woman", value: 75 },
  { label: "Man", value: 150 },
  { label: "Non-binary", value: 10 },
  { label: "Other", value: 5 },
  { label: "Prefer not to say", value: 10 },
];

const dietary = [
  { label: "None", value: 170 },
  { label: "Vegetarian", value: 40 },
  { label: "Vegan", value: 15 },
  { label: "Gluten-free", value: 12 },
  { label: "Allergies", value: 13 },
];

const tshirts = [
  { label: "XS", value: 10 },
  { label: "S", value: 35 },
  { label: "M", value: 80 },
  { label: "L", value: 65 },
  { label: "XL", value: 35 },
  { label: "2XL", value: 15 },
  { label: "3XL", value: 5 },
  { label: "Prefer not to say", value: 5 },
];


const activityInterest = [
  { label: "Workshops", value: 175 },
  { label: "Networking", value: 140 },
  { label: "Sponsor activities", value: 110 },
  { label: "Technical talks", value: 125 },
  { label: "Career development", value: 130 },
];

const resumes = { uploaded: 170, notUploaded: 80 };

const resumePercent = Math.round(
  (resumes.uploaded / (resumes.uploaded + resumes.notUploaded)) * 100
);

const resumeSplit = [
  { label: "Uploaded a resume", value: resumes.uploaded },
  { label: "No resume", value: resumes.notUploaded },
];

// ---------- WEBSITE TRAFFIC (fake data) ----------
const traffic = { totalVisits: 6800, uniqueVisits: 4200 };

const trafficOverTime = [
  { label: "Week 1", value: 400 },
  { label: "Week 2", value: 900 },
  { label: "Week 3", value: 1300 },
  { label: "Week 4", value: 1000 },
  { label: "Week 5", value: 600 },
];

const visitorsBySource = [
  { label: "Instagram", value: 1500 },
  { label: "LinkedIn", value: 950 },
  { label: "Google", value: 850 },
  { label: "Email", value: 700 },
  { label: "Other", value: 200 },
];

const registrationsBySource = [
  { label: "Instagram", value: 80 },
  { label: "LinkedIn", value: 60 },
  { label: "Google", value: 45 },
  { label: "Email", value: 50 },
  { label: "Other", value: 15 },
];

const topSource = visitorsBySource.reduce((best, item) =>
  item.value > best.value ? item : best
);

// Percent of unique visitors who registered
const conversionRate =
  Math.round((summary[0].value / traffic.uniqueVisits) * 1000) / 10;


// ---------- Reusable pieces ----------
function BarList({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number }[];
}) {
  const max = Math.max(...items.map((item) => item.value));

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
            <div className="h-2 rounded bg-gray-200">
              <div
                className="h-2 rounded bg-blue-500"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}

// ---------- The page itself ----------
export default function StatsPage() {
  const percentFilled = Math.round((capacity.approved / capacity.total) * 100);
  const spotsLeft = capacity.total - capacity.approved;

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">Statistics</h1>

      {/* Number boxes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((stat) => (
          <div key={stat.label} className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Capacity */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-2 font-semibold">Capacity</h2>
        <p className="mb-2 text-sm text-gray-500">
          {capacity.approved} of {capacity.total} spots filled ({percentFilled}%)
          · {spotsLeft} left
        </p>
        <div className="h-3 rounded bg-gray-200">
          <div
            className="h-3 rounded bg-green-500"
            style={{ width: `${percentFilled}%` }}
          />
        </div>
      </div>

      <Section title="Registrations">
        <BarList title="Registrations over time (weekly)" items={registrationsByWeek} />
      </Section>

      <Section title="Who is coming">
        <BarList title="Level of study" items={levelOfStudy} />
        <BarList title="First-time vs. returning" items={experience} />
        <BarList title="Domestic vs. international" items={origin} />
        <BarList title="Where from" items={location} />
        <BarList title="By university" items={byUniversity} />
        <BarList title="By major" items={byMajor} />
        <BarList title="Expected graduation year" items={graduationYears} />
        <BarList title="Gender" items={gender} />
      </Section>

      <Section title="Skills and interests">
        <BarList title="Areas of interest" items={interests} />
        <BarList title="Programming languages" items={languages} />
        <BarList title="Experience level" items={skillLevel} />
      </Section>

      <Section title="Teams">
        <BarList title="Team status" items={teamStatus} />
      </Section>

      <Section title="Resumes">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Resumes uploaded</p>
          <p className="text-3xl font-bold">{resumes.uploaded}</p>
          <p className="text-xs text-gray-500">{resumePercent}% of registrants</p>
        </div>
        <BarList title="Resume uploaded vs. not" items={resumeSplit} />
      </Section>

      <Section title="Event logistics">
        <BarList title="Dietary restrictions" items={dietary} />
        <BarList title="T-shirt sizes" items={tshirts} />
      </Section>

      <Section title="Workshops and activities">
        <BarList title="What people are interested in" items={activityInterest} />
      </Section>

       <Section title="Website traffic">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total visits</p>
          <p className="text-3xl font-bold">{traffic.totalVisits}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Unique visitors</p>
          <p className="text-3xl font-bold">{traffic.uniqueVisits}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Conversion rate</p>
          <p className="text-3xl font-bold">{conversionRate}%</p>
          <p className="text-xs text-gray-500">of visitors who registered</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Top source</p>
          <p className="text-3xl font-bold">{topSource.label}</p>
          <p className="text-xs text-gray-500">
            {topSource.value} visitors
          </p>
        </div>
        <BarList title="Unique visitors over time (weekly)" items={trafficOverTime} />
        <BarList title="Visitors by source" items={visitorsBySource} />
        <BarList title="Registrations by source" items={registrationsBySource} />
      </Section>
      
    </div>
  );
}