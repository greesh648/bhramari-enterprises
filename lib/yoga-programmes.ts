/** Owner-editable yoga catalogue. Prices are intentionally unconfigured.
 * Set price to the verified display string (including currency and fee basis).
 * Confirm start date, meeting days, format and venue before accepting bookings.
 * Empty image paths use our local SVG illustrations without broken images.
 */
export const yogaSettings = {
  timezone: 'IST (UTC+05:30)',
  format: 'Live Online via Zoom',
  location: 'Zoom joining details are shared with confirmed participants after enrolment and batch confirmation.',
  startDate: 'Next start date to be confirmed',
  meetingDays: 'Meeting days to be confirmed with your batch',
  priceNote: 'Price to be confirmed',
  instructor: { name: '', biography: '', credentials: '', image: { src: '', alt: 'Bhramari yoga instructor' } },
  onlineSetup: 'A stable internet connection, Zoom installed on your device, and a quiet practice space. Joining information is shared privately after confirmation.',
};

export type YogaPose = 'seated' | 'tree' | 'warrior' | 'dancer';
export type YogaProgramme = {
  slug: string; title: string; shortTitle: string; duration: string;
  timing: string; price: string | null; illustration: YogaPose;
  image: { src: string; alt: string }; shortDescription: string;
  description: string; audience: string; highlights: string[];
  curriculum: { label: string; title: string; description: string }[];
  suitableFor: string[]; requirements: string[]; faqs: { question: string; answer: string }[];
};

const essentials = ['A yoga mat and comfortable clothing', 'Water and a quiet practice space with room to move comfortably', 'An unhurried few minutes before and after your session'];

export const yogaProgrammes: YogaProgramme[] = [
  {
    slug: '7-day-course', title: '7-Day Yoga Course', shortTitle: 'Begin with intention.',
    duration: '7 Days', timing: '7:00 AM – 8:00 AM', price: null, illustration: 'seated',
    image: { src: '', alt: 'Woman seated in a calm, cross-legged yoga posture' },
    shortDescription: 'A short guided introduction to help you begin a consistent yoga practice.',
    description: 'A considered first step into yoga. Across seven days, explore familiar foundations, simple movement and breathing awareness, with time to notice your own pace. The emphasis is on understanding the practice and finding a manageable way to continue.',
    audience: 'For beginners and people returning after a break who would like a short, structured introduction.',
    highlights: ['Foundational postures', 'Breathing awareness', 'Gentle mobility', 'Balance and alignment', 'Mindful movement', 'A simple continuation routine'],
    curriculum: [
      { label: 'Day 1', title: 'Foundations & breathing awareness', description: 'Meet the structure of a session, explore comfortable positions and become familiar with observing the breath.' },
      { label: 'Day 2', title: 'Mobility & basic postures', description: 'Explore gentle joint movement and introductory postures, with options appropriate to individual comfort.' },
      { label: 'Day 3', title: 'Balance & alignment', description: 'Practise steady transitions and simple balance work, using support where helpful.' },
      { label: 'Day 4', title: 'Flexibility-focused practice', description: 'Notice comfortable movement ranges without forcing a stretch or comparing with others.' },
      { label: 'Day 5', title: 'Strength & stability', description: 'Explore controlled holds and foundational stability at a manageable pace.' },
      { label: 'Day 6', title: 'Integrated sequence', description: 'Connect familiar movements into a simple, guided sequence with space for pauses.' },
      { label: 'Day 7', title: 'Complete practice & continuation', description: 'Bring the week together in a guided session and discuss practical ways to maintain a routine.' },
    ],
    suitableFor: ['People beginning their yoga practice', 'People returning to movement after a pause', 'Anyone looking for a concise introduction before a longer course'],
    requirements: [...essentials],
    faqs: [
      { question: 'Do I need any yoga experience?', answer: 'This course is designed as an introduction. Share your experience and access needs when enquiring so suitability can be discussed.' },
      { question: 'Does the course run on seven consecutive days?', answer: 'The course covers seven days of practice. The start date and exact meeting days will be confirmed for your batch before booking.' },
      { question: 'What can I do after the seventh day?', answer: 'The final session includes continuation guidance. You may discuss a longer programme or a manageable personal routine; there is no automatic enrolment.' },
    ],
  },
  {
    slug: '21-day-course', title: '21-Day Yoga Course', shortTitle: 'Make room for consistency.',
    duration: '21 Days', timing: '7:00 AM – 8:00 AM', price: null, illustration: 'tree',
    image: { src: '', alt: 'Woman standing in a supported, balanced tree yoga posture' },
    shortDescription: 'A structured 21-day journey for consistency and a stronger personal practice.',
    description: 'Give your practice a little more time to become familiar. This three-week journey revisits the foundations, introduces considered progressions and brings movement, balance and breathing awareness into a repeatable routine.',
    audience: 'For beginners who value a longer introduction and returning participants looking for a regular morning rhythm.',
    highlights: ['Foundation and alignment', 'Progressive movement sequences', 'Balance and stability', 'Breathing awareness', 'Practice reflection', 'A repeatable morning routine'],
    curriculum: [
      { label: 'Week 1', title: 'Foundations', description: 'Build familiarity with core postures, comfortable alignment, breath awareness and the rhythm of a guided session.' },
      { label: 'Week 2', title: 'Build & progress', description: 'Revisit familiar movements, explore balance and stability, and introduce variations according to readiness.' },
      { label: 'Week 3', title: 'Consistency & integration', description: 'Connect sequences, practise thoughtful transitions and reflect on a routine that fits your everyday life.' },
    ],
    suitableFor: ['Beginners seeking time to become familiar with the foundations', 'Participants returning to a regular morning practice', 'People who appreciate guided structure and repetition'],
    requirements: [...essentials, 'A routine that can accommodate the confirmed course dates'],
    faqs: [
      { question: 'How is this different from the 7-day course?', answer: 'The longer format gives more room to revisit foundations, introduce progressions and develop familiarity through guided repetition.' },
      { question: 'Is daily attendance required?', answer: 'Consistency is encouraged. Exact meeting days, attendance expectations and any missed-session arrangements will be confirmed for your batch.' },
      { question: 'Is a specific level of flexibility needed?', answer: 'No flexibility target is promised or required. Discuss your experience and needs before enrolment; suitable variations depend on the confirmed programme and instructor guidance.' },
    ],
  },
  {
    slug: '1-month-batch', title: '1-Month Yoga Batch', shortTitle: 'An evening rhythm, your own.',
    duration: '1 Month', timing: '6:30 PM – 7:30 PM', price: null, illustration: 'warrior',
    image: { src: '', alt: 'Woman in a grounded warrior-inspired yoga posture' },
    shortDescription: 'An evening programme for regular movement, balance and a mindful practice.',
    description: 'Create a regular space for movement at the close of your day. This month-long batch balances familiar foundations with gradual exploration, using guided sequences, considered pacing and time for relaxation.',
    audience: 'For people seeking a regular evening practice, whether beginning again or continuing an existing routine.',
    highlights: ['Evening practice rhythm', 'Mobility and flexibility', 'Grounded standing postures', 'Balance and controlled transitions', 'Relaxation', 'Personal practice habits'],
    curriculum: [
      { label: 'Week 1', title: 'Settle into your routine', description: 'Establish a comfortable practice rhythm with foundations, mobility and awareness of posture and breath.' },
      { label: 'Week 2', title: 'Explore range & steadiness', description: 'Revisit foundational movements, explore standing postures and notice balance through controlled transitions.' },
      { label: 'Week 3', title: 'Connect your practice', description: 'Combine familiar elements into guided sequences, adapting pace and range to individual readiness.' },
      { label: 'Week 4', title: 'Integrate & continue', description: 'Refine familiar sequences, make space for relaxation and consider a sustainable routine beyond the batch.' },
    ],
    suitableFor: ['People who prefer an evening session', 'Participants returning to regular movement', 'Beginners looking for a structured month of guided practice'],
    requirements: [...essentials, 'Time reserved for the confirmed evening meeting days'],
    faqs: [
      { question: 'Is the batch held every evening?', answer: 'The session window is 6:30 PM–7:30 PM IST. Meeting days, start date and any holidays will be confirmed before enrolment.' },
      { question: 'Can I join without completing a short course?', answer: 'You can enquire directly. Your experience and needs can be discussed to determine whether the batch is suitable.' },
      { question: 'Can the batch be renewed?', answer: 'Continuation depends on the confirmed schedule and availability. Discuss the next batch towards the end of your programme; renewal is not automatic.' },
    ],
  },
  {
    slug: '3-month-programme', title: '3-Month Progressive Yoga Programme', shortTitle: 'A practice that grows with you.',
    duration: '3 Months', timing: '5:30 AM – 6:30 AM', price: null, illustration: 'dancer',
    image: { src: '', alt: 'Woman exploring an elegant dancer-inspired balance posture' },
    shortDescription: 'A longer, progressive practice in consistency, strength, balance and mindful movement.',
    description: 'Take a longer view of your practice. This three-month programme begins with foundations and consistency, then explores strength, balance and mobility before bringing the elements into integrated sequences. Progression follows readiness rather than a fixed performance target.',
    audience: 'For participants who want a longer guided structure and can make space for a consistent early-morning routine.',
    highlights: ['Sustained practice habits', 'Foundation refinement', 'Strength and stability', 'Balance and mobility', 'Progressive sequences', 'Integrated mindful practice'],
    curriculum: [
      { label: 'Month 1', title: 'Foundations & consistency', description: 'Establish a repeatable routine, revisit key postures and develop familiarity with alignment, pacing and breathing awareness.' },
      { label: 'Month 2', title: 'Strength, balance & mobility', description: 'Explore controlled progressions and posture variations with suitable support, based on individual readiness.' },
      { label: 'Month 3', title: 'Progressive integrated practice', description: 'Connect familiar elements into longer sequences, refine transitions and reflect on how to sustain your personal practice.' },
    ],
    suitableFor: ['Participants looking for sustained, structured consistency', 'People returning to practice with time for gradual progression', 'Beginners who would like to discuss a longer-term learning format'],
    requirements: [...essentials, 'A commitment to the confirmed early-morning batch routine'],
    faqs: [
      { question: 'Must I be able to do advanced postures?', answer: 'No. The illustration represents one aspect of yoga, not an entry requirement or promised outcome. Practice is introduced progressively according to readiness and guidance.' },
      { question: 'How is progression decided?', answer: 'The curriculum provides a broad structure. Pace, variations and complexity are discussed with the instructor and adjusted to the participants and confirmed programme.' },
      { question: 'What does the three-month fee include?', answer: 'Pricing, session frequency, inclusions and any payment or cancellation terms will be confirmed before booking. No payment is collected on this website.' },
    ],
  },
];

export const yogaPath = '/businesses/yoga-wellness/';
export const programmeHref = (slug: string) => yogaPath + slug + '/';
export const yogaEnquiryHref = (slug: string) => yogaPath + '?programme=' + encodeURIComponent(slug) + '#enquire';
