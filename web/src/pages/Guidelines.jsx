export default function Guidelines() {
  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <h1 style={{ margin: 0 }}>Community Guidelines</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Campus Connect V2 works because people trust it. These rules keep it that way.
        Breaking them can get a listing, review, or account removed.
      </p>

      <Section
        title="1. Be honest in your listings"
        items={[
          "Describe the skill, service, or item accurately — condition, what's included, turnaround time, and any deposit or ID requirements.",
          "Use your own photos and video. Don't pass off stock images or someone else's work as your own.",
          'Price clearly. No hidden charges sprung after a client has paid.',
        ]}
      />
      <Section
        title="2. Deliver what you promise"
        items={[
          'If you accept a hire, do the job or hand over the item as agreed.',
          "Communicate early if something changes. Don't go silent on a client.",
          'Return hired equipment on time and in the condition you received it.',
        ]}
      />
      <Section
        title="3. Keep payments on the platform"
        items={[
          'Pay and get paid through HustleGuard escrow. It protects both sides.',
          'Do not ask a client to pay you directly, off-platform, to "save fees". This is the most common way people get scammed, and it is a bannable offence.',
          'Only click Approve Delivery once you are genuinely satisfied.',
        ]}
      />
      <Section
        title="4. Prohibited listings"
        items={[
          'No illegal goods or services, weapons, drugs, counterfeit items, or stolen property.',
          'No adult services, gambling, academic dishonesty (writing graded coursework, sitting exams), or anything that puts a minor at risk.',
          'No get-rich-quick schemes, fake reviews, follower-selling, or unlicensed "loan" offers.',
        ]}
      />
      <Section
        title="5. Respect each other"
        items={[
          'No harassment, hate speech, threats, or discrimination based on tribe, religion, gender, disability, or anything else.',
          "Keep chat about the gig. Don't pressure anyone for personal details, photos, or meetings they haven't agreed to.",
          'Reviews must reflect a real transaction. No revenge reviews, no paid reviews.',
        ]}
      />
      <Section
        title="6. Protect personal data"
        items={[
          "Only share the contact details you're comfortable with, and only when you need to.",
          "Don't post other people's phone numbers, ID numbers, or private information.",
        ]}
      />

      <div className="card stack" style={{ gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Reporting</h2>
        <p style={{ margin: 0 }}>
          See something that breaks these rules? Use the <strong>Report</strong> link on
          any listing, review, or profile. Reports are private. Moderators review each one
          and can remove content or restrict accounts. You can track what you've reported
          under your account.
        </p>
      </div>
    </div>
  );
}

function Section({ title, items }) {
  return (
    <div className="card stack" style={{ gap: 6 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h2>
      <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.5 }}>
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
