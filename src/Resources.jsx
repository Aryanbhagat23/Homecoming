const RESOURCES = [
  { name: 'Eldercare Locator', url: 'https://eldercare.acl.gov', phone: '1-800-677-1116',
    desc: 'Free national service that connects you to local aging and caregiving services — meals, transportation, in-home help.' },
  { name: 'Area Agencies on Aging', url: 'https://www.usaging.org/findhelp',
    desc: 'Your local agency for respite care, caregiver training, and support programs in your county.' },
  { name: 'Family Caregiver Alliance', url: 'https://www.caregiver.org',
    desc: 'Practical guides on caregiving tasks, plus state-by-state help finder.' },
  { name: '211 Helpline', url: 'https://www.211.org', phone: 'Dial 211',
    desc: 'Connects you to local help of every kind: food, housing, transportation, health services.' },
  { name: 'National Alliance for Caregiving', url: 'https://www.caregiving.org',
    desc: 'Research and resources for family caregivers, including condition-specific guides.' },
  { name: 'Medicare Caregiver Resources', url: 'https://www.medicare.gov/caregivers',
    desc: 'What Medicare covers after discharge: home health, equipment, and follow-up care.' },
]

const v = (name) => `var(--${name})`

export default function Resources() {
  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{ fontFamily: v('font-display'), fontSize: 26, fontWeight: 600, margin: 0 }}>
        Find support
      </h2>
      <p style={{ color: v('cite'), fontSize: 14, marginTop: 4 }}>
        Trusted, free services for family caregivers. You don't have to do this alone.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginTop: 16 }}>
        {RESOURCES.map((r) => (
          <a key={r.name} href={r.url} target="_blank" rel="noreferrer"
            style={{ background: v('card'), border: `1px solid ${v('border')}`, borderRadius: 12,
                     padding: 16, textDecoration: 'none', color: v('ink'), display: 'block' }}>
            <div style={{ fontWeight: 600, fontSize: 15, fontFamily: v('font-body') }}>
              {r.name} <span style={{ color: v('cite'), fontWeight: 400 }}>↗</span>
            </div>
            {r.phone && (
              <div style={{ fontSize: 12.5, color: v('verify'), marginTop: 2, fontFamily: v('font-mono') }}>
                ☎ {r.phone}
              </div>
            )}
            <p style={{ fontSize: 13, color: '#3F4A44', margin: '6px 0 0', lineHeight: 1.5 }}>{r.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}