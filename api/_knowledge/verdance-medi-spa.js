// =============================================================================
// Concept-build knowledge block — "Verdance Medi-Spa" (FICTIONAL)
// =============================================================================
// Backs the chat assistant on the concept page at /studio/concepts/medi-spa.
// Same shape as ./willow-lane-massage.js. The page lists no prices ("ask the team
// when you call"), so neither does this block: the assistant must not invent any.
// =============================================================================

module.exports = {
  fictional: true,

  name: "Verdance Medi-Spa",
  tagline: "A calm, professional beauty and aesthetics clinic just off Mill Lane, Norwich: facials, electrolysis, nails and more, done properly by a trained team.",
  kind: "a beauty and aesthetics clinic with a trained team",
  ownerLabel: "the clinic team",

  location: "1 Mill Lane, Norwich, NR1, easy to find off the industrial estate.",
  parking: "Ask the team when you call for the best place to park.",

  hours: "Monday closed, Tuesday 10am–8pm, Wednesday 10am–8pm, Thursday 9am–8pm, Friday 9am–5pm, Saturday 9am–3pm, Sunday closed.",

  bookingLink: "tel:01632960244",
  bookingNote: "Book by phone on 01632 960244 or message the clinic on Facebook. Prices depend on the treatment and are given when you book; the team will talk you through the options.",

  services: [
    { name: "Facials", duration: "ask when booking", price: "given when you book", description: "Rejuvenating facials tailored to your skin, for a genuinely radiant finish rather than a rushed cleanse." },
    { name: "Electrolysis", duration: "ask when booking", price: "given when you book", description: "Precise, permanent hair removal, done with a steady, experienced hand. Usually a course of sessions." },
    { name: "Manicure & pedicure", duration: "ask when booking", price: "given when you book", description: "Nail care and finishing with real attention to detail, from shape to polish." },
    { name: "Face waxing", duration: "ask when booking", price: "given when you book", description: "Smooth, refined waxing for a clean, polished finish, gently done." },
    { name: "Aesthetic treatments", duration: "ask when booking", price: "given when you book", description: "A full range of aesthetic treatments; the team will talk you through what's right for you at a consultation." },
  ],

  cancellationPolicy: "Please give the clinic as much notice as you can if you need to cancel or move an appointment, ideally 24 hours.",

  notSuitableIf: [
    "you have broken skin, a rash, an infection or active cold sores in the area to be treated",
    "you're pregnant and asking about electrolysis or aesthetic treatments: please speak to the team and your GP or midwife first",
    "you have a pacemaker or another implanted device and are asking about electrolysis: check with your GP before booking",
  ],

  faqs: [
    { q: "How much do treatments cost?", a: "Prices depend on the treatment and are given when you book. Call 01632 960244 and the team will talk you through them." },
    { q: "Is electrolysis permanent?", a: "Electrolysis is a permanent hair-removal method, usually done as a course of sessions. The team will explain how many you're likely to need." },
    { q: "Do I need a consultation first?", a: "For aesthetic treatments the team will always talk you through what's right for you before anything is booked." },
  ],

  tone: "Calm, warm and reassuring, like a friendly clinic receptionist. Professional but never clinical-cold.",

  clientId: "verdance-medi-spa",
};
