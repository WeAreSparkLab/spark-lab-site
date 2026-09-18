// =============================================================================
// Concept-build knowledge block — "Elmfield Foot Clinic" (FICTIONAL)
// =============================================================================
//
// Backs the "Find your treatment" matcher embedded on the anonymised concept
// page at /studio/concepts/foot-clinic. Same shape as ./willow-lane-massage.js
// — see that file for the full field reference. Values here are kept in sync
// with the copy on the concept page itself (services list, hours, contact).
// =============================================================================

module.exports = {
  fictional: true,

  name: "Elmfield Foot Clinic",
  tagline: "Chiropody & podiatry care on Market Street, in the heart of Wymondham.",

  location: "12 Market Street, Wymondham, NR18.",
  parking: "On-street parking on Market Street, plus the Market Place car park two minutes' walk away.",

  hours:
    "Monday 8:30am–5pm, Tuesday 8:30am–5pm, Wednesday 8:30am–6pm, Thursday 8:30am–4:30pm, Friday 8:30am–1pm. Closed Saturday and Sunday.",

  bookingLink: "tel:01632960118",
  bookingNote: "Booking is by phone — call the clinic and Sally will find you a slot.",

  services: [
    {
      name: "Nail care",
      duration: "30 minutes",
      price: "£30",
      description: "Routine nail cutting and care, done safely and comfortably.",
    },
    {
      name: "Ingrowing toenails",
      duration: "30 minutes",
      price: "£35",
      description: "Assessment and treatment to ease pain and prevent infection.",
    },
    {
      name: "Corns & callus",
      duration: "30 minutes",
      price: "£35",
      description: "Removal of hard skin, corns and callus for lasting relief.",
    },
    {
      name: "Verrucae",
      duration: "30 minutes",
      price: "£35",
      description: "Treatment and advice for verrucae at any stage.",
    },
    {
      name: "Diabetic footcare assessment",
      duration: "45 minutes",
      price: "£40",
      description: "A thorough diabetic foot check to catch problems early.",
    },
    {
      name: "Footcare advice",
      duration: "20 minutes",
      price: "£20",
      description: "Practical guidance on keeping your feet healthy day to day — good if you're not sure what you need.",
    },
  ],

  cancellationPolicy:
    "Please give at least 24 hours' notice to cancel or reschedule your appointment.",

  notSuitableIf: [
    "you have an open wound, ulcer, or actively bleeding area on the foot",
    "you have signs of a spreading infection (redness spreading up the leg, fever, or feeling unwell)",
    "you have sudden, severe foot or leg pain with swelling — this needs urgent medical attention, not a clinic appointment",
  ],

  faqs: [
    {
      q: "Do I need a GP referral?",
      a: "No — you can book directly with the clinic, no referral needed.",
    },
    {
      q: "Are you NHS or private?",
      a: "Elmfield Foot Clinic is a private, independent practice.",
    },
    {
      q: "Is Sally qualified?",
      a: "Yes — Sally is an HCPC-registered podiatrist and a member of the Royal College of Podiatry.",
    },
  ],

  tone:
    "Warm, plain-spoken and reassuring — like a friendly local podiatrist, not a medical textbook. Keep it short.",

  clientId: "elmfield-foot-clinic",
};
