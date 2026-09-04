// Curated browse categories. Listings still store a free-text `category`, but the
// create form suggests these and Browse filters by them. Keep in sync with
// web/src/lib/categories.js.

export const CATEGORIES = [
  { name: 'Photography', type: 'DIGITAL' },
  { name: 'Videography', type: 'DIGITAL' },
  { name: 'Graphic Design', type: 'DIGITAL' },
  { name: 'Web & App Development', type: 'DIGITAL' },
  { name: 'Writing & Translation', type: 'DIGITAL' },
  { name: 'Music & Audio', type: 'DIGITAL' },
  { name: 'Tutoring', type: 'DIGITAL' },
  { name: 'Social Media & Marketing', type: 'DIGITAL' },
  { name: 'Event Services', type: 'DIGITAL' },
  { name: 'Beauty & Hair', type: 'DIGITAL' },
  { name: 'Repairs & Tech Help', type: 'DIGITAL' },
  { name: 'Camera & Lenses', type: 'PHYSICAL' },
  { name: 'Audio & PA Gear', type: 'PHYSICAL' },
  { name: 'Event Equipment', type: 'PHYSICAL' },
  { name: 'Musical Instruments', type: 'PHYSICAL' },
  { name: 'Tools & Machinery', type: 'PHYSICAL' },
  { name: 'Vehicles & Transport', type: 'PHYSICAL' },
  { name: 'Sports & Outdoor', type: 'PHYSICAL' },
  { name: 'Other', type: null },
];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);
