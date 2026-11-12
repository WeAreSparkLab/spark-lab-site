// =============================================================================
// Concept-build knowledge block — "Ivy & Lash" brow, lash and beauty (FICTIONAL)
// =============================================================================
// Backs the chat assistant on the concept page at /studio/concepts/brow-bar.
// Same shape as ./willow-lane-massage.js. The page gives no prices ("prices
// given when you book"), so neither does this block.
// =============================================================================

module.exports = {
  fictional: true,

  name: "Ivy & Lash",
  tagline: "Brows, lashes and glow: in the chair on Mill Lane, Norwich, or at your door anywhere across Norwich.",
  kind: "a small brow, lash and beauty salon that also offers mobile treatments",
  ownerLabel: "the team",

  location: "14 Mill Lane, Norwich, NR1. The mobile team covers anywhere across Norwich.",
  parking: "Ask the team when you call for the nearest parking.",

  hours: "Monday 9:30am–5:30pm, Tuesday 9:30am–5pm, Wednesday to Saturday 9:30am–5:30pm, Sunday closed.",

  bookingLink: "tel:07700900118",
  bookingNote: "Call 07700 900118 to book, for the salon or a mobile visit. Walk-ins are welcome in the salon when there's space; booking ahead means no wait. Prices are given when you book.",

  services: [
    { name: "Eyebrow threading (salon)", duration: "short appointment", price: "given when you book", description: "Precision brow shaping with the thread technique." },
    { name: "Facial (salon)", duration: "ask when booking", price: "given when you book", description: "Cleanse, treat and glow." },
    { name: "Makeup service (salon)", duration: "ask when booking", price: "given when you book", description: "Everyday looks to full glam." },
    { name: "Haircut (salon)", duration: "ask when booking", price: "given when you book", description: "Cut and finish." },
    { name: "Waxing (salon or mobile)", duration: "ask when booking", price: "given when you book", description: "Hollywood, underarm, bikini and more." },
    { name: "Pedicure (salon)", duration: "ask when booking", price: "given when you book", description: "Soak, shape and polish." },
    { name: "Mobile spray tan", duration: "at your door", price: "given when you book", description: "Spray tanning at home, anywhere across Norwich." },
    { name: "Threading on the go (mobile)", duration: "at your door", price: "given when you book", description: "Brow shaping at home." },
    { name: "Brow & lash tint (mobile)", duration: "at your door", price: "given when you book", description: "Tinting for brows and lashes." },
    { name: "Lash extensions (mobile)", duration: "at your door", price: "given when you book", description: "Length and volume sets." },
    { name: "Lash lift & perm (mobile)", duration: "at your door", price: "given when you book", description: "Lift and curl your own lashes." },
  ],

  cancellationPolicy: "Please let the team know as early as you can if you need to cancel or move, especially for mobile visits.",

  notSuitableIf: [
    "you've reacted to tint or lash glue before: please speak to the team before booking a tint, lash lift or extensions (a patch test may be needed)",
    "you have an eye infection, very irritated eyes or recent eye surgery (lash and tint treatments)",
    "you have broken skin, sunburn or a rash in the area to be waxed, threaded or tanned",
  ],

  faqs: [
    { q: "How much are treatments?", a: "Prices are given when you book. Call or message 07700 900118 to check what's on today." },
    { q: "Do you come to me?", a: "Yes, the mobile team covers anywhere across Norwich for tanning, threading, waxing, tinting, lash extensions and lash lifts." },
    { q: "Can I walk in?", a: "Walk-ins are welcome in the salon when there's space. Booking ahead means no wait." },
  ],

  tone: "Friendly, upbeat and a little bit glam, like a brow artist who loves her job. Short and clear.",

  clientId: "ivy-and-lash",
};
