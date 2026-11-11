// =============================================================================
// Concept-build knowledge block — "Still Water Studio" holistic therapy (FICTIONAL)
// =============================================================================
// Backs the booking assistant, treatment matcher and FAQ answerer on the concept
// page at /studio/concepts/wellness-studio. Same shape as ./willow-lane-massage.js.
// =============================================================================

module.exports = {
  fictional: true,

  name: "Still Water Studio",
  tagline: "Massage, reflexology and calm facials in a quiet garden studio in Aylsham.",
  kind: "a small holistic therapy studio run by one therapist, Mira",
  ownerLabel: "Mira",

  location: "The Garden Studio, 9 Millgate, Aylsham, NR11. A single-storey studio at the back of the garden, step-free along a paved path.",
  parking: "Free parking on Millgate, and the Buttlands car park is a five-minute walk.",

  hours: "Monday 10am–6pm, Wednesday 10am–8pm, Thursday 10am–6pm, Friday 9am–3pm, Saturday 9am–1pm. Closed Tuesday and Sunday.",

  bookingLink: "tel:01632960373",
  bookingNote: "Book by phone or text. Mira sends a short health form before a first visit so the session can be planned around you.",

  services: [
    { name: "Relaxing back, neck & shoulders", duration: "30 minutes", price: "£32", description: "A focused massage for tight shoulders and desk necks." },
    { name: "Full body massage", duration: "60 minutes", price: "£55", description: "Slow, calming full-body massage with warm oil. Good for a first visit." },
    { name: "Deep tissue massage", duration: "60 minutes", price: "£60", description: "Firmer, slower work for knots and stubborn tension." },
    { name: "Reflexology", duration: "50 minutes", price: "£45", description: "Gentle pressure on the feet; deeply relaxing, fully clothed apart from your feet." },
    { name: "Calm facial", duration: "45 minutes", price: "£48", description: "Cleanse, gentle massage and mask with natural products, plus a scalp massage." },
  ],

  cancellationPolicy: "Please give 24 hours' notice to cancel or move, so the slot can go to someone else.",

  notSuitableIf: [
    "you have a fever, infection or feel unwell on the day",
    "you have a recent injury, a new lump or unexplained pain that hasn't been checked by a GP",
    "you're in the first 12 weeks of pregnancy (massage and reflexology are offered from the second trimester, with your midwife's okay)",
    "you have a history of blood clots or DVT, unless your GP has said massage is fine",
  ],

  faqs: [
    { q: "What should I wear?", a: "Whatever's comfortable. You'll be covered with towels throughout and only the area being worked on is uncovered." },
    { q: "Is it okay if I've never had a massage?", a: "Very much so. Mira will talk you through everything and you can stop or change the pressure at any time." },
    { q: "Do you sell gift vouchers?", a: "Yes, for any treatment or amount. They're valid for a year." },
    { q: "Is the studio accessible?", a: "Yes, it's single-storey with a step-free path. The treatment couch can be lowered." },
  ],

  tone: "Quiet, gentle and reassuring. Short sentences, no wellness jargon.",

  clientId: "still-water-studio",
};
