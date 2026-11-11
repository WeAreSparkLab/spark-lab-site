// =============================================================================
// Concept-build knowledge block — "Alder Joinery" workshop (FICTIONAL)
// =============================================================================
// Backs the quote-enquiry assistant and FAQ answerer on the concept page at
// /studio/concepts/workshop. Same shape as ./willow-lane-massage.js; no health
// list. Prices are "from" guides only: every job is quoted after a visit.
// =============================================================================

module.exports = {
  fictional: true,

  name: "Alder Joinery",
  tagline: "Bespoke joinery from a workshop near Dereham: fitted alcove units, wardrobes, staircases and kitchens, made to measure.",
  kind: "a small bespoke joinery workshop run by Tom and a team of three",
  ownerLabel: "Tom",
  assistantRole: "enquiry assistant",
  assistantGoal: "answer questions about what the workshop makes, how a project works and rough starting prices, and help them get ready for a quote: what Tom will want to know (what they want made, roughly what size, their town or postcode) and how to book the free home visit by phone. Never give a firm quote",

  location: "Unit 3, Rash's Green Industrial Estate, Dereham, NR19. The workshop covers homes within about 30 miles.",
  parking: "Parking outside the unit. Visits to the workshop are by appointment so someone's free to show you round.",

  hours: "Workshop Monday to Friday 7:30am–4:30pm. Phone answered until 5:30pm. Home visits for measuring can be booked on Saturday mornings.",

  bookingLink: "tel:01632960634",
  bookingNote: "Start with a free home visit to measure and talk it through; a written quote follows within a week. A 30% deposit secures a slot in the workshop diary, which is usually 6 to 8 weeks out.",

  services: [
    { name: "Alcove units & shelving", duration: "around 2 days to fit", price: "from £950 per alcove", description: "Cupboards below and shelves above, painted on site in your colour." },
    { name: "Fitted wardrobes", duration: "around 3 days to fit", price: "from £2,400", description: "Floor-to-ceiling wardrobes built around sloping ceilings, chimney breasts and awkward corners." },
    { name: "Staircases", duration: "made in the workshop, fitted in 2–4 days", price: "from £3,800", description: "Oak and painted staircases, new or as a replacement, including balustrades." },
    { name: "Kitchens", duration: "usually 2–3 weeks on site", price: "from £14,000", description: "Hand-built in-frame or slab-door kitchens in oak or painted finishes; the price varies a great deal with size and appliances." },
    { name: "Repairs & one-off pieces", duration: "varies", price: "quoted per job", description: "Sash window repairs, window seats, boot benches and small furniture." },
  ],

  cancellationPolicy: "Quotes are valid for 60 days. The deposit is refundable until materials are ordered.",

  notSuitableIf: [],

  faqs: [
    { q: "Is the home visit free?", a: "Yes, the first measuring visit and the written quote are free, with no obligation." },
    { q: "Are you insured?", a: "Yes, fully insured with public liability cover, and all work comes with a five-year guarantee." },
    { q: "Do you paint the units?", a: "Yes, alcove units and wardrobes are hand-painted on site in a colour of your choice." },
    { q: "Do you take on small jobs?", a: "Yes, smaller jobs are fitted in between larger projects, so they can sometimes be done sooner." },
  ],

  tone: "Friendly, practical and straight-talking, like a tradesperson who's proud of the work. No jargon.",

  clientId: "alder-joinery",
};
