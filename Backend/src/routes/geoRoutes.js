const express = require("express");
const router = express.Router();
const geoController = require("../controllers/geoController");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

router.use(authenticate);

router.get("/autocomplete", asyncHandler(geoController.autocomplete));
router.get("/place-details", asyncHandler(geoController.placeDetails));
router.get("/reverse", asyncHandler(geoController.reverseGeocode));
router.get("/map-preview", asyncHandler(geoController.mapPreview));

module.exports = router;
