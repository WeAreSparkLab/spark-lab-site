// =============================================================================
// Concept-build knowledge block — "Larder & Loaf" café and bakery (FICTIONAL)
// =============================================================================
// Backs the café assistant and FAQ answerer on the concept page at
// /studio/concepts/cafe. Same shape as ./willow-lane-massage.js, with no
// "not suitable if" list (it isn't a health service), so the agents leave the
// GP guidance out. Allergen answers stay general: the team confirms on the day.
// =============================================================================

module.exports = {
  fictional: true,

  name: "Larder & Loaf",
  tagline: "A neighbourhood café and bakery on Magdalen Street, Norwich: sourdough, brunch and good coffee.",
  kind: "an independent café and bakery",
  ownerLabel: "the café team",
  assistantRole: "café assistant",
  assistantGoal: "answer questions about the menu, opening times and the café, and explain how to book a table for six or more or order a celebration cake (both by phone)",

  location: "112 Magdalen Street, Norwich, NR3. Step-free entrance and an accessible toilet.",
  parking: "Pay-and-display at Anglia Square, two minutes' walk. Bike racks outside.",

  hours: "Monday to Friday 8am–4pm (kitchen until 2:30pm), Saturday 8:30am–4pm (kitchen until 3pm), Sunday 9am–2pm (brunch only).",

  bookingLink: "tel:01632960458",
  bookingNote: "Walk-ins are the norm. Tables for six or more can be booked by phone, and celebration cakes need three days' notice.",

  services: [
    { name: "Brunch", duration: "served until the kitchen closes", price: "£7–£13", description: "Sourdough toasties, shakshuka, a full veggie breakfast and seasonal specials." },
    { name: "Coffee & cake", duration: "all day", price: "£2.80–£5", description: "Locally roasted coffee, loose-leaf tea and cakes baked that morning." },
    { name: "Sourdough & bakes to take home", duration: "all day, until sold out", price: "loaves £4.50–£5.50, bakes from £3.50", description: "Country loaf, seeded rye and focaccia; bakes from 8am. Pre-order by 2pm for the next day." },
    { name: "Celebration cakes", duration: "3 days' notice", price: "from £32 (serves 12)", description: "Sponge or chocolate layer cakes with a simple message on top." },
  ],

  cancellationPolicy: "For booked tables, a quick call if your plans change is all we ask. Celebration cakes can be cancelled free up to 48 hours before collection.",

  notSuitableIf: [],

  faqs: [
    { q: "Do you have vegan and gluten-free options?", a: "Yes: there's always a vegan brunch dish and at least one gluten-free cake. Our kitchen handles gluten, nuts and dairy, so we can't promise anything is allergen-free; please tell the team about allergies when you order." },
    { q: "Are dogs welcome?", a: "Yes, well-behaved dogs are welcome inside and on the terrace, with water bowls by the door." },
    { q: "Can I bring a pushchair?", a: "Yes, there's room by the window tables and a baby-changing area in the accessible toilet." },
    { q: "Do you have Wi-Fi?", a: "Yes, free Wi-Fi, though laptops are asked to give up tables at weekend brunch." },
    { q: "Do you do takeaway?", a: "Yes, all drinks and bakes, and most brunch dishes, can be taken away." },
  ],

  tone: "Cheerful and relaxed, like a friendly barista. Short and to the point.",

  clientId: "larder-and-loaf",
};
