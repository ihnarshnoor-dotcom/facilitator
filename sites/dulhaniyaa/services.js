// Dulhaniyaa rate card. PLACEHOLDER prices in INR. Edit freely.
//
// Row format: [id, name, level, pricing_type, min, max]
//   level:        "core" | "addon" | "luxury"
//   pricing_type: "flat"      price once for the whole wedding
//                 "per_guest" multiplied by guestCount
//                 "per_event" multiplied by the number of events
//                 "per_day"   counted once (the planner confirms the days)
//                 "on_request" no price; the planner quotes it (min/max = null)
// Keep ids stable: websites send ids, and old ids in saved plans should keep working.

const RATE_CARD = [
  {
    id: "venue",
    name: "Venue",
    items: [
      ["venue_layout", "Venue layout & setup", "core", "flat", 50000, 200000],
      ["venue_red_carpet", "Red carpet entry", "core", "flat", 8000, 25000],
      ["venue_vedi", "Vedi / mandap", "core", "flat", 25000, 150000],
      ["venue_chair_covers", "Chair covers", "addon", "per_guest", 40, 120],
      ["venue_table_overlays", "Table overlays", "addon", "flat", 15000, 50000],
      ["venue_ambient_lighting", "Ambient & element lighting", "addon", "per_event", 30000, 150000],
      ["venue_ice_bar", "Ice bar", "luxury", "flat", 75000, 250000],
      ["venue_molecule_bar", "Molecule bar", "luxury", "flat", 100000, 300000],
      ["venue_ceiling_wall", "Ceiling & wall treatments", "luxury", "per_event", 150000, 600000],
    ],
  },
  {
    id: "catering",
    name: "Catering",
    items: [
      ["cat_standard_menu", "Standard menu", "core", "per_guest", 1200, 3000],
      ["cat_baraat_trolley", "Baraat trolley", "addon", "flat", 15000, 40000],
      ["cat_chaat_counters", "Chaat counters", "addon", "per_event", 20000, 60000],
      ["cat_phera_menu", "Phera menu", "addon", "per_guest", 250, 600],
      ["cat_special_sweets", "Special sweets", "luxury", "per_guest", 200, 600],
      ["cat_live_gourmet", "Live gourmet counters", "luxury", "per_event", 60000, 200000],
    ],
  },
  {
    id: "decor",
    name: "Decor",
    items: [
      ["decor_entrance", "Entrance decor", "core", "per_event", 25000, 100000],
      ["decor_passage", "Passage decor", "core", "per_event", 20000, 80000],
      ["decor_stage", "Stage decor", "core", "per_event", 50000, 300000],
      ["decor_chandeliers", "Chandeliers", "addon", "per_event", 20000, 100000],
      ["decor_console_corner", "Console & corner setups", "addon", "per_event", 15000, 60000],
      ["decor_photo_booth", "Decor photo booth", "addon", "per_event", 15000, 50000],
      ["decor_props", "Props", "addon", "per_event", 10000, 40000],
      ["decor_floral_install", "Floral installations", "luxury", "per_event", 150000, 800000],
      ["decor_custom_backdrop", "Custom backdrops", "luxury", "per_event", 75000, 300000],
      ["decor_fabrication", "Custom fabrication", "luxury", "per_event", 100000, 500000],
    ],
  },
  {
    id: "entertainment",
    name: "Entertainment",
    items: [
      ["ent_dj_sound", "DJ + sound", "core", "per_event", 25000, 80000],
      ["ent_anchor", "Anchor / emcee", "addon", "per_event", 15000, 60000],
      ["ent_dhol", "Dhol", "addon", "per_event", 8000, 25000],
      ["ent_singer", "Live singer", "addon", "per_event", 40000, 200000],
      ["ent_choreography", "Choreography", "addon", "flat", 30000, 150000],
      ["ent_led_walls", "LED walls", "luxury", "per_event", 40000, 150000],
      ["ent_dance_floor", "LED / wooden dance floor", "luxury", "per_event", 30000, 120000],
      ["ent_harpist_pianist", "Harpist / pianist", "luxury", "per_event", 50000, 150000],
      ["ent_salsa_band", "Salsa band", "luxury", "per_event", 60000, 200000],
      ["ent_comedian", "Stand-up comedian", "luxury", "per_event", 75000, 300000],
      ["ent_military_band", "Military band", "luxury", "per_event", 40000, 120000],
      ["ent_celebrity", "Celebrity performer", "luxury", "on_request", null, null],
      ["ent_international", "International acts", "luxury", "on_request", null, null],
    ],
  },
  {
    id: "photography",
    name: "Photography",
    items: [
      ["photo_wedding_day", "Wedding day photography & film", "core", "flat", 100000, 350000],
      ["photo_prewedding", "Pre-wedding shoot", "addon", "flat", 50000, 200000],
      ["photo_prefunction", "Pre-function coverage", "addon", "per_event", 40000, 120000],
      ["photo_booth", "Instant photo booth", "addon", "per_event", 20000, 60000],
      ["photo_assistant", "Personal photo assistant", "addon", "per_day", 8000, 20000],
      ["photo_frame_canvas", "Frame canvas", "luxury", "flat", 15000, 60000],
      ["photo_wedding_website", "Wedding website", "luxury", "flat", 20000, 75000],
    ],
  },
  {
    id: "invitations",
    name: "Invitation Cards",
    items: [
      ["inv_cards_boxes", "Invitation cards / boxes", "core", "flat", 40000, 250000],
      ["inv_video", "Video invite", "addon", "flat", 5000, 25000],
      ["inv_itinerary", "Guest itinerary", "addon", "flat", 5000, 20000],
      ["inv_milni_envelope", "Themed milni envelopes", "addon", "flat", 5000, 20000],
      ["inv_silver_samdhi", "Silver invite for samdhi", "luxury", "flat", 30000, 150000],
    ],
  },
  {
    id: "makeup",
    name: "Makeup",
    items: [
      ["mu_bridal_hd", "Bridal HD makeup", "core", "flat", 25000, 80000],
      ["mu_party", "Party makeup", "addon", "flat", 5000, 15000],
      ["mu_family", "Family makeup", "addon", "flat", 20000, 60000],
      ["mu_prewedding", "Pre-wedding shoot makeup", "addon", "flat", 10000, 30000],
      ["mu_hairstyling", "Hairstyling", "addon", "flat", 5000, 20000],
      ["mu_nail_art", "Nail art", "addon", "flat", 3000, 12000],
      ["mu_airbrush", "Airbrush bridal makeup", "luxury", "flat", 40000, 120000],
      ["mu_parlour_hotel", "Parlour in hotel", "luxury", "per_day", 40000, 120000],
    ],
  },
  {
    id: "bar",
    name: "Liquor & Bar",
    items: [
      ["bar_bartender", "Bartender + license help", "core", "per_event", 20000, 60000],
      ["bar_cocktails", "Cocktails", "addon", "per_guest", 300, 800],
      ["bar_international", "International liquor", "addon", "per_guest", 800, 2500],
      ["bar_room_service", "Room-service hard drinks", "addon", "flat", 25000, 100000],
      ["bar_specialty", "Molecule / LED / ice bar", "luxury", "per_event", 75000, 250000],
      ["bar_russian_waitresses", "Russian waitresses", "luxury", "per_event", 50000, 150000],
    ],
  },
  {
    id: "mehendi",
    name: "Mehendi",
    items: [
      ["meh_bridal", "Bridal mehendi", "core", "flat", 15000, 60000],
      ["meh_family", "Family mehendi (40–50 people)", "addon", "flat", 20000, 50000],
      ["meh_groom", "Groom mehendi", "addon", "flat", 3000, 10000],
      ["meh_bazaar_parandi", "Meena bazaar: parandi stall", "luxury", "flat", 15000, 40000],
      ["meh_bazaar_bangles", "Meena bazaar: bangles stall", "luxury", "flat", 15000, 40000],
      ["meh_bazaar_astro", "Meena bazaar: astrologer", "luxury", "flat", 15000, 40000],
      ["meh_bazaar_tarot", "Meena bazaar: tarot reader", "luxury", "flat", 15000, 40000],
      ["meh_bazaar_parrot", "Meena bazaar: parrot fortune teller", "luxury", "flat", 10000, 30000],
      ["meh_bazaar_jutti", "Meena bazaar: jutti wala", "luxury", "flat", 15000, 40000],
      ["meh_bazaar_pagdi", "Meena bazaar: pagdi wala", "luxury", "flat", 15000, 40000],
    ],
  },
  {
    id: "hospitality",
    name: "Hospitality",
    items: [
      ["hosp_hotel_contract", "Hotel contracting", "core", "flat", 25000, 75000],
      ["hosp_car_pickdrop", "Car pick & drop", "core", "per_day", 30000, 120000],
      ["hosp_checkin", "Guest check-in desk", "core", "per_day", 15000, 40000],
      ["hosp_control_room", "24-hour control room", "addon", "per_day", 20000, 60000],
      ["hosp_travel_desk", "Travel desk", "addon", "per_day", 10000, 30000],
      ["hosp_sms_alerts", "Event-wise SMS alerts", "addon", "flat", 5000, 20000],
      ["hosp_return_gifts", "Return gifts", "addon", "per_guest", 300, 1500],
      ["hosp_massage_room", "Massage room", "luxury", "per_day", 30000, 80000],
      ["hosp_beauty_parlour", "Beauty parlour for 40–50 female guests", "luxury", "per_day", 50000, 150000],
      ["hosp_games_room", "Games room", "luxury", "per_day", 25000, 75000],
    ],
  },
  {
    id: "band_baaja",
    name: "Band Baaja / Ghodiwala",
    items: [
      ["band_ghodi", "Ghodi", "core", "flat", 15000, 40000],
      ["band_dhol", "Baraat dhol", "core", "flat", 8000, 25000],
      ["band_lights_chhatar", "Lights & chhatar", "addon", "flat", 10000, 30000],
      ["band_shehnai", "Shehnai", "addon", "flat", 10000, 30000],
      ["band_taasha_naqqara", "Taasha & naqqara", "addon", "flat", 15000, 40000],
      ["band_mobile_dj", "Mobile DJ", "addon", "flat", 20000, 50000],
      ["band_pataka", "Baraat welcome: pataka", "addon", "flat", 5000, 20000],
      ["band_pearl_mala", "Baraat welcome: pearl mala", "addon", "flat", 5000, 20000],
      ["band_garlands", "Baraat welcome: flower garlands", "addon", "flat", 5000, 25000],
      ["band_brooch", "Baraat welcome: brooch", "addon", "flat", 5000, 20000],
      ["band_safa", "Baraat welcome: pagdi / safa", "addon", "per_guest", 150, 500],
      ["band_baggi", "Baggi with horses", "luxury", "flat", 40000, 120000],
      ["band_palki", "Palki", "luxury", "flat", 25000, 75000],
      ["band_phoolon_chadar", "Phoolon ki chadar", "luxury", "flat", 15000, 50000],
      ["band_theme_entry", "Theme entry", "luxury", "flat", 50000, 200000],
      ["band_floral_jewellery", "Floral jewellery", "luxury", "flat", 10000, 40000],
      ["band_cold_fireworks", "Cold fireworks", "luxury", "per_event", 15000, 60000],
    ],
  },
  {
    id: "pandit",
    name: "Pandit / Priest",
    items: [
      ["pandit_ji", "Pandit ji", "core", "per_event", 11000, 51000],
      ["pandit_samagri", "Puja samagri kit", "addon", "flat", 5000, 20000],
    ],
  },
  {
    id: "cars",
    name: "Luxury Car Rental",
    items: [
      ["car_vintage", "Vintage car", "luxury", "flat", 25000, 75000],
      ["car_limousine", "Limousine", "luxury", "flat", 40000, 120000],
    ],
  },
  {
    id: "favours",
    name: "Wedding Favours",
    items: [
      ["fav_standard", "Standard favours", "core", "per_guest", 150, 500],
      ["fav_custom", "Customised favours", "addon", "per_guest", 400, 1200],
      ["fav_premium_hampers", "Premium hampers", "luxury", "per_guest", 1500, 5000],
    ],
  },
  {
    id: "cake",
    name: "Cake & Chocolate",
    items: [
      ["cake_standard", "Wedding cake", "core", "flat", 10000, 40000],
      ["cake_chocolate_counter", "Chocolate counter", "addon", "per_event", 20000, 60000],
      ["cake_designer", "Designer cake", "luxury", "flat", 50000, 200000],
    ],
  },
  {
    id: "permissions",
    name: "Permissions & License",
    items: [
      ["perm_police_noc", "Police NOC", "core", "flat", 10000, 30000],
      ["perm_dj_sound", "DJ / sound permission", "core", "per_event", 5000, 20000],
      ["perm_liquor", "Liquor license", "addon", "per_event", 10000, 50000],
    ],
  },
  {
    id: "additional",
    name: "Additional",
    items: [
      ["add_security_valet", "Security & valet", "core", "per_event", 20000, 60000],
      ["add_guest_shuttles", "Transportation: guest shuttles", "core", "per_day", 25000, 100000],
    ],
  },
];

export const SERVICES = RATE_CARD.map((cat) => ({
  id: cat.id,
  name: cat.name,
  items: cat.items.map(([id, name, level, pricing_type, min, max]) => ({ id, name, level, pricing_type, min, max })),
}));

// id -> item plus its category, for quick lookups.
export const ITEMS_BY_ID = Object.freeze(
  Object.fromEntries(
    SERVICES.flatMap((cat) =>
      cat.items.map((item) => [item.id, Object.freeze({ ...item, categoryId: cat.id, category: cat.name })])
    )
  )
);
