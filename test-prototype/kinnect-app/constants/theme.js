// constants/theme.js
// Colors and spacing matching the Kinnect prototype exactly.

export const colors = {
  green:    '#0B6E4F',
  green700: '#064a35',
  peach:    '#EC9670',
  butter:   '#F2C94C',
  cream:    '#F4F0E8',
  cream2:   '#ECE6D6',
  ink:      '#142019',
  ink2:     '#3A4A3F',
  ink3:     '#7A8C80',
  line:     'rgba(20,32,25,0.10)',
  white:    '#FFFFFF',
  danger:   '#C44536',

  // Tag category colors
  Sports:   '#EC9670',
  Arts:     '#D4A93C',
  Outdoors: '#0B6E4F',
  Food:     '#C44536',
  Social:   '#4A7FBE',
};

export const TAG_LIBRARY = {
  Sports:   ['Pickleball','Tennis','Volleyball','Running','Climbing','Yoga','Soccer','Basketball','Skateboarding'],
  Arts:     ['Photography','Film','Music','Drawing','Writing','Pottery'],
  Outdoors: ['Hiking','Camping','Surfing','Biking','Gardening'],
  Food:     ['Coffee','Brunch','Cooking','Baking','Wine','Vegan'],
  Social:   ['Board Games','Trivia','Dancing','Karaoke','Reading'],
};

// Suggested sub-tags per parent tag — used in the customize sheet
export const SUBTAG_LIBRARY = {
  'Pickleball':   ['singles','doubles','tournaments','beginner'],
  'Tennis':       ['singles','doubles','clay','hard court'],
  'Volleyball':   ['indoor','beach','grass','6s','4s'],
  'Running':      ['trail','road','5k','marathon','sprints'],
  'Climbing':     ['bouldering','top-rope','lead','outdoor'],
  'Yoga':         ['vinyasa','ashtanga','hot','yin'],
  'Soccer':       ['pickup','futsal','league'],
  'Basketball':   ['pickup','3v3','5v5'],
  'Skateboarding':['street','park','vert','longboard'],
  'Photography':  ['film','digital','street','portrait','35mm'],
  'Film':         ['indie','horror','arthouse','criterion'],
  'Music':        ['live shows','producing','jam sessions','vinyl'],
  'Drawing':      ['ink','watercolor','digital'],
  'Writing':      ['fiction','journaling','poetry','non-fiction'],
  'Pottery':      ['wheel','hand-built','glazing'],
  'Hiking':       ['day hikes','overnight','peak bagging','dawn patrol'],
  'Camping':      ['car','backpacking','glamping'],
  'Surfing':      ['shortboard','longboard','dawn patrol','sup'],
  'Biking':       ['gravel','road','mtb','commute'],
  'Gardening':    ['veggies','natives','succulents'],
  'Coffee':       ['espresso','pour-over','cold brew','shops','beans'],
  'Brunch':       ['pancakes','dim sum','mimosas','tacos'],
  'Cooking':      ['italian','korean','vegetarian','knife skills'],
  'Baking':       ['sourdough','pastry','cookies','cake'],
  'Wine':         ['natural','red','white','tastings'],
  'Vegan':        ['cooking','restaurants','desserts'],
  'Board Games':  ['strategy','party','co-op','heavy euros'],
  'Trivia':       ['pub','sports','music','history'],
  'Dancing':      ['salsa','swing','house','bachata'],
  'Karaoke':      ['pop','rock','duets'],
  'Reading':      ['fiction','sci-fi','non-fiction','book club'],
};

export const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', placeholder: '@username',        color: '#E1306C' },
  { id: 'discord',   name: 'Discord',   placeholder: 'username#0000',    color: '#5865F2' },
  { id: 'wechat',    name: 'WeChat',    placeholder: 'WeChat ID',         color: '#07C160' },
  { id: 'whatsapp',  name: 'WhatsApp',  placeholder: '+1 (555) 000-0000', color: '#25D366' },
  { id: 'telegram',  name: 'Telegram',  placeholder: '@username',         color: '#0088cc' },
];

// Which category a tag belongs to
export function catFor(tag) {
  for (const [cat, tags] of Object.entries(TAG_LIBRARY)) {
    if (tags.includes(tag)) return cat;
  }
  return 'Sports';
}

// Primary color for a category
export function catColor(cat) {
  return colors[cat] || colors.green;
}

// Light tint background for sub-tag chips (color + alpha)
export function tintFor(color) {
  return color + '22';
}

// Dark text color for sub-tag chips, per category
export function shadeFor(cat) {
  return {
    Sports:   '#8c4023',
    Arts:     '#6b5511',
    Outdoors: '#064a35',
    Food:     '#7a1f15',
    Social:   '#22466e',
  }[cat] || '#064a35';
}
