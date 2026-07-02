/** Aadhaar is opt-in: set REQUIRE_AADHAAR_VERIFICATION=true to enforce. */
exports.isAadhaarVerificationRequired = () =>
  process.env.REQUIRE_AADHAAR_VERIFICATION === "true";
