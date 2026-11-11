// =============================================================================
// Concept-build knowledge block — "Fern & Foil" hair & beauty salon (FICTIONAL)
// =============================================================================
// Backs the booking assistant and "Find your service" matcher on the concept page
// at /studio/concepts/salon. Same shape as ./willow-lane-massage.js. Keep the values
// in sync with the copy on that page.
// =============================================================================

module.exports = {
  fictional: true,

  name: "Fern & Foil",
  tagline: "A friendly hair and beauty salon on Unthank Road, Norwich: colour, cuts, brows and nails under one roof.",
  kind: "a hair and beauty salon",
  ownerLabel: "the salon team",

  location: "84 Unthank Road, Norwich, NR2. Ground floor, step-free from the street.",
  parking: "Two-hour free parking on the side streets off Unthank Road, and the number 25 bus stops outside.",

  hours: "Tuesday 9am–5:30pm, Wednesday 9am–5:30pm, Thursday 9am–8pm, Friday 9am–6pm, Saturday 8:30am–4pm. Closed Sunday and Monday.",

  bookingLink: "tel:01632960241",
  bookingNote: "Book by phone or ask the team in the salon. New colour clients need a quick patch test at least 48 hours before their appointment; it takes five minutes and is free.",

  services: [
    { name: "Cut & finish", duration: "45 minutes", price: "from £38", description: "A wash, a cut that suits how you actually wear your hair, and a blow-dry finish." },
    { name: "Blow-dry", duration: "30 minutes", price: "£24", description: "Wash and blow-dry, sleek or full of volume." },
    { name: "Full head colour", duration: "1 hour 45 minutes", price: "from £72", description: "One all-over colour, root to tip, including a cut and finish." },
    { name: "Balayage", duration: "3 hours", price: "from £120", description: "Hand-painted, soft, lived-in lightness that grows out gently. Includes toner and finish." },
    { name: "Gloss & toner", duration: "45 minutes", price: "£35", description: "Refreshes faded colour or knocks back brassiness between colour appointments." },
    { name: "Brow shape & tint", duration: "30 minutes", price: "£22", description: "Waxed and tidied to suit your face, then tinted to frame it." },
    { name: "Gel manicure", duration: "45 minutes", price: "£28", description: "Shaped, tidied cuticles and a gel colour that lasts around two weeks." },
  ],

  cancellationPolicy: "Please give 24 hours' notice to move or cancel. For appointments over two hours we take a £20 deposit, which comes off your bill.",

  notSuitableIf: [
    "you've had a reaction to hair dye before, or your patch test reacted: please don't book a colour service and speak to the team first",
    "your scalp is broken, very sore or has an active rash or infection (colour services)",
    "you have an infection or broken skin around the brow or nail area",
  ],

  faqs: [
    { q: "Do I need a patch test?", a: "Yes, for any colour service if you're new to us or it's been over six months. It's free and takes five minutes, at least 48 hours before." },
    { q: "Can I bring my children?", a: "Little ones are welcome for short appointments; for longer colour sessions it's easier without them." },
    { q: "Do you do men's cuts?", a: "Yes, the Cut & finish is for any hair length and anyone." },
    { q: "Do you sell gift vouchers?", a: "Yes, in any amount, from the salon or over the phone." },
  ],

  tone: "Bright, warm and down to earth, like a stylist you've known for years. Never pushy.",

  clientId: "fern-and-foil",
};
