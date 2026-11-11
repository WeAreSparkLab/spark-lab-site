// =============================================================================
// Concept-build knowledge block — "Hearth & Thread" home and gift shop (FICTIONAL)
// =============================================================================
// Backs the gift-finder assistant and FAQ answerer on the concept page at
// /studio/concepts/shop. Same shape as ./willow-lane-massage.js; no health list.
// =============================================================================

module.exports = {
  fictional: true,

  name: "Hearth & Thread",
  tagline: "An independent home and gift shop in Holt: handmade ceramics, candles, linen and cards by local makers.",
  kind: "an independent home and gift shop",
  ownerLabel: "the shop",
  assistantRole: "shop assistant",
  assistantGoal: "help people find a gift or something for their home from the ranges below, answer questions about the shop, delivery and click and collect, and suggest they call or visit to reserve something",

  location: "6 Chapel Yard, Holt, NR25. Step-free, with space to turn a wheelchair or pushchair.",
  parking: "Holt's Albert Street car park is three minutes' walk.",

  hours: "Monday to Saturday 9:30am–5pm, Sunday 11am–4pm. Late opening until 7pm on Thursdays in December.",

  bookingLink: "tel:01632960566",
  bookingNote: "There's no online checkout yet. Call to reserve anything for up to three days, or to arrange local delivery or click and collect.",

  services: [
    { name: "Handmade ceramics", duration: "in stock", price: "mugs from £18, bowls from £24, vases from £30", description: "Stoneware by three Norfolk potters; every piece is slightly different." },
    { name: "Candles & home fragrance", duration: "in stock", price: "£12–£34", description: "Soy candles poured in Norfolk, in five seasonal scents, plus reed diffusers." },
    { name: "Linen & textiles", duration: "in stock", price: "tea towels £14, napkins £24 for four, throws from £65", description: "Washed linen in soft colours and wool throws." },
    { name: "Cards & wrapping", duration: "in stock", price: "cards £3.50", description: "Cards by local illustrators. Free gift wrapping on anything bought in the shop." },
    { name: "Gift boxes", duration: "made up while you wait, or to order", price: "£30, £45 or £60", description: "A boxed selection chosen to a budget, wrapped and ready to give. Usually: £30 = a handmade mug, a small candle and a card; £45 = a stoneware bowl, a large candle, two linen napkins and a card; £60 = a stoneware vase, a reed diffuser, a linen tea towel and napkins, and a card." },
  ],

  cancellationPolicy: "Reserved items are held for three days. Unused items can be returned within 30 days with a receipt for a refund or exchange; candles must be unburnt.",

  notSuitableIf: [],

  faqs: [
    { q: "Do you deliver?", a: "Yes, free local delivery within 10 miles of Holt for orders over £40, usually within two working days. Further afield, we can post most things for £5.95." },
    { q: "Can I click and collect?", a: "Yes, call the shop, pay over the phone and pick up the same day." },
    { q: "Do you wrap gifts?", a: "Yes, free gift wrapping on anything bought in the shop." },
    { q: "Do you take card payments?", a: "Yes, card and contactless; cash is welcome too." },
    { q: "Can I return something?", a: "Yes, unused items can be returned within 30 days with a receipt for a refund or exchange. Candles need to be unburnt." },
  ],

  tone: "Warm, thoughtful and a little bit enthusiastic, like a shopkeeper who loves what they stock. Ask what the gift is for and their budget if it helps.",

  clientId: "hearth-and-thread",
};
