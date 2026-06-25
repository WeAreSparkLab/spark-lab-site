// =============================================================================
// Client registry — maps a client id to that client's config block
// =============================================================================
//
// This is what makes the agents multi-client. A request carries a client id
// (the booking/matcher widgets send `client`; the content tool uses ?c=<id>),
// and the function looks the config up here instead of hard-coding one client.
//
// ADD A CLIENT:
//   1. Copy willow-lane-massage.js → <client>.js and fill in their details
//      (including `clientId`, and — for the content tool — `contentToken`).
//   2. require() it below and add one line to CLIENTS, keyed by its clientId.
// That's it: every agent now serves the new client. No endpoint duplication.
// =============================================================================

const willowLane = require("./willow-lane-massage.js");

const CLIENTS = {
  "willow-lane": willowLane,
  // "roots-reflexology": require("./roots-reflexology.js"),
};

// The public /studio demos (taster, showcase) always use this client.
const DEFAULT_CLIENT_ID = "willow-lane";

function normaliseId(id) {
  return typeof id === "string" ? id.trim().toLowerCase() : "";
}

// Returns the config for an id, or null if it isn't registered.
function getClient(id) {
  const key = normaliseId(id);
  return Object.prototype.hasOwnProperty.call(CLIENTS, key) ? CLIENTS[key] : null;
}

// Resolve a request's client:
//   - blank / missing id  → the default demo client (for the public /studio pages)
//   - a provided id       → that client, or null if it isn't registered
// A null result means "an id was given but is unknown" — the caller should error
// rather than silently serving the wrong business (catches typo'd data-client).
function resolveClient(id) {
  if (id == null || String(id).trim() === "") return CLIENTS[DEFAULT_CLIENT_ID];
  return getClient(id);
}

module.exports = { CLIENTS, DEFAULT_CLIENT_ID, getClient, resolveClient };
