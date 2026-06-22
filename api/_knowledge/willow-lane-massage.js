// =============================================================================
// Sample business knowledge block — "Willow Lane Massage" (FICTIONAL)
// =============================================================================
//
// This is the per-business knowledge the booking assistant is allowed to use.
// It is deliberately a standalone config so a real client's block can drop in
// with the SAME SHAPE — just copy this file, swap the values, and point
// api/assistant.js at the new file (see the `require` at the top of that file).
//
// Keep every field truthful and specific. The assistant is instructed to use
// ONLY what is in here and never to invent prices, services, or policies.
//
// Shape (all fields used by the system-prompt builder in api/assistant.js):
//   name              string   — business name
//   tagline           string   — one short line of positioning
//   location          string   — where they are, plainly stated
//   parking           string   — parking / access notes
//   hours             string   — opening hours in plain text
//   bookingLink       string   — the URL the assistant steers people toward
//   bookingNote       string   — how booking works (e.g. Square)
//   services          array of { name, duration, price, description }
//   cancellationPolicy string  — the exact policy, stated once
//   notSuitableIf     array of string — conditions where they should not book
//                                       without speaking to a GP / professional
//   faqs              array of { q, a }
//   tone              string   — how the assistant should sound for THIS business
// =============================================================================

module.exports = {
  fictional: true, // surfaced in the UI so visitors know this is a demo business

  name: "Willow Lane Massage",
  tagline:
    "A small, independent massage studio for calm, practical bodywork — based in Norwich.",

  location:
    "Willow Lane, just off the city centre in Norwich, Norfolk. The studio is on the ground floor (no stairs).",
  parking:
    "Free on-street parking on Willow Lane after 10am, and a pay-and-display car park two minutes' walk away. The studio is a 10-minute walk from Norwich rail station.",

  hours:
    "Tuesday to Friday 9am–7pm, Saturday 9am–2pm. Closed Sunday and Monday.",

  bookingLink: "https://willowlanemassage.example.com/book",
  bookingNote:
    "Booking is online via Square — pick a service and time, and you'll get an instant confirmation by email. No deposit required.",

  services: [
    {
      name: "Relaxation massage",
      duration: "60 minutes",
      price: "£55",
      description:
        "A gentle full-body massage to unwind and de-stress. Good if you're new to massage.",
    },
    {
      name: "Deep tissue massage",
      duration: "60 minutes",
      price: "£60",
      description:
        "Firmer pressure focused on tight areas like shoulders, neck and lower back.",
    },
    {
      name: "Deep tissue massage",
      duration: "90 minutes",
      price: "£85",
      description:
        "A longer session for more thorough work across several problem areas.",
    },
    {
      name: "Pregnancy massage",
      duration: "60 minutes",
      price: "£60",
      description:
        "Gentle massage tailored for the second and third trimester, using a supported side-lying position.",
    },
    {
      name: "Back, neck & shoulders",
      duration: "30 minutes",
      price: "£35",
      description:
        "A focused short session for the upper body — ideal on a lunch break.",
    },
  ],

  cancellationPolicy:
    "Please give at least 24 hours' notice to cancel or reschedule. Cancellations with less than 24 hours' notice may be charged the full session fee.",

  // Plain-language safety list. The assistant shares the relevant item and
  // suggests speaking to a GP — it never gives medical advice or diagnoses.
  notSuitableIf: [
    "you have a fever, an infection, or feel unwell",
    "you are in the first 12 weeks of pregnancy (massage is offered from the second trimester)",
    "you have a new or undiagnosed injury, lump, or area of pain",
    "you have a condition such as DVT, recent surgery, or a skin infection in the area to be massaged",
  ],

  faqs: [
    {
      q: "Do I need to bring anything?",
      a: "No — just yourself. Towels and everything else are provided. Wear comfortable clothes.",
    },
    {
      q: "What should I expect at my first visit?",
      a: "A short chat about what you'd like to focus on and anything to be aware of, then your treatment. Arrive a couple of minutes early if you can.",
    },
    {
      q: "Do you offer gift vouchers?",
      a: "Yes — gift vouchers are available for any service. Ask and we'll sort one out.",
    },
    {
      q: "Are you insured and qualified?",
      a: "Yes — Willow Lane Massage is fully qualified and insured.",
    },
  ],

  tone:
    "Warm, calm and down-to-earth. Speak like a friendly practitioner, not a salesperson. Keep it short.",
};
