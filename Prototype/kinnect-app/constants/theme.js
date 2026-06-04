// constants/theme.js

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
  Gaming:   '#7B5EA7',
  Study:    '#2A8FA0',
  Wellness: '#E07B9A',
  Tech:     '#3A7BD5',
  Culture:  '#B5651D',
};

export const TAG_LIBRARY = {
  Sports: [
    'Pickleball','Tennis','Volleyball','Running','Climbing','Yoga',
    'Soccer','Basketball','Skateboarding','Cycling','Swimming',
    'Martial Arts','Golf','Frisbee','Badminton','Weightlifting',
  ],
  Outdoors: [
    'Hiking','Camping','Surfing','Biking','Gardening',
    'Fishing','Kayaking','Rock Climbing','Birdwatching','Skiing','Snowboarding',
  ],
  Arts: [
    'Photography','Film','Music','Drawing','Writing','Pottery',
    'Dance','Theater','Fashion','Design','Architecture','Painting','Sculpture',
  ],
  Food: [
    'Coffee','Brunch','Cooking','Baking','Wine','Vegan',
    'Street Food','Meal Prep','Cocktails','Tea','Ramen','Sushi',
  ],
  Social: [
    'Board Games','Trivia','Dancing','Karaoke','Reading',
    'Networking','Travel','Volunteering','Concerts','Nightlife','Parties',
  ],
  Gaming: [
    'Video Games','Chess','Poker','Tabletop RPG','Escape Rooms',
    'Arcade','Speedrunning','Trading Card Games','VR Gaming',
  ],
  Study: [
    'Studying','Tutoring','Math','Languages','Science',
    'History','Coding','Book Club','Debate','Law','Medicine',
    'Engineering','Economics','Philosophy','SAT/ACT Prep',
  ],
  Wellness: [
    'Meditation','Journaling','Nutrition','Therapy','Breathwork',
    'Cold Plunge','Stretching','Sleep','Gratitude','Sobriety',
  ],
  Tech: [
    'Programming','AI / ML','Startups','Hardware','Robotics',
    'Crypto','Cybersecurity','3D Printing','Open Source','Product Design',
  ],
  Culture: [
    'Movies','TV Shows','Anime','Podcasts','Museums',
    'Art Galleries','Comedy','Poetry','Zines','Astrology',
  ],
};

export const SUBTAG_LIBRARY = {
  // Sports
  'Pickleball':     ['singles','doubles','tournaments','beginner'],
  'Tennis':         ['singles','doubles','clay','hard court'],
  'Volleyball':     ['indoor','beach','grass','6s','4s'],
  'Running':        ['trail','road','5k','marathon','sprints'],
  'Climbing':       ['bouldering','top-rope','lead','outdoor'],
  'Yoga':           ['vinyasa','ashtanga','hot','yin'],
  'Soccer':         ['pickup','futsal','league'],
  'Basketball':     ['pickup','3v3','5v5'],
  'Skateboarding':  ['street','park','vert','longboard'],
  'Cycling':        ['road','gravel','mtb','commute'],
  'Swimming':       ['laps','open water','polo','diving'],
  'Martial Arts':   ['bjj','mma','boxing','muay thai','judo','karate'],
  'Golf':           ['18 holes','topgolf','disc golf','putting'],
  'Frisbee':        ['ultimate','disc golf','pickup'],
  'Badminton':      ['singles','doubles','casual'],
  'Weightlifting':  ['powerlifting','olympic','crossfit','hypertrophy'],
  // Outdoors
  'Hiking':         ['day hikes','overnight','peak bagging','dawn patrol'],
  'Camping':        ['car','backpacking','glamping'],
  'Surfing':        ['shortboard','longboard','dawn patrol','sup'],
  'Biking':         ['gravel','road','mtb','commute'],
  'Gardening':      ['veggies','natives','succulents'],
  'Fishing':        ['fly','deep sea','freshwater','catch & release'],
  'Kayaking':       ['flatwater','whitewater','sea'],
  'Rock Climbing':  ['bouldering','sport','trad','gym'],
  'Birdwatching':   ['backyard','migratory','life list'],
  'Skiing':         ['downhill','backcountry','park'],
  'Snowboarding':   ['park','powder','halfpipe'],
  // Arts
  'Photography':    ['film','digital','street','portrait','35mm'],
  'Film':           ['indie','horror','arthouse','criterion'],
  'Music':          ['live shows','producing','jam sessions','vinyl'],
  'Drawing':        ['ink','watercolor','digital'],
  'Writing':        ['fiction','journaling','poetry','non-fiction'],
  'Pottery':        ['wheel','hand-built','glazing'],
  'Dance':          ['salsa','swing','house','bachata','contemporary'],
  'Theater':        ['improv','musical','drama','stage mgmt'],
  'Fashion':        ['thrift','streetwear','vintage','design'],
  'Design':         ['graphic','ux','product','motion'],
  'Architecture':   ['urban planning','residential','sketching'],
  'Painting':       ['oil','acrylic','watercolor','mural'],
  'Sculpture':      ['clay','metal','wood','found objects'],
  // Food
  'Coffee':         ['espresso','pour-over','cold brew','shops','beans'],
  'Brunch':         ['pancakes','dim sum','mimosas','tacos'],
  'Cooking':        ['italian','korean','vegetarian','knife skills'],
  'Baking':         ['sourdough','pastry','cookies','cake'],
  'Wine':           ['natural','red','white','tastings'],
  'Vegan':          ['cooking','restaurants','desserts'],
  'Street Food':    ['tacos','ramen','dumplings','hot dogs'],
  'Meal Prep':      ['bulk cooking','macros','weekly planning'],
  'Cocktails':      ['classic','craft','tiki','mocktails'],
  'Tea':            ['matcha','oolong','bubble tea','ceremony'],
  'Ramen':          ['tonkotsu','shoyu','vegan','instant'],
  'Sushi':          ['omakase','rolls','nigiri','making it'],
  // Social
  'Board Games':    ['strategy','party','co-op','heavy euros'],
  'Trivia':         ['pub','sports','music','history'],
  'Dancing':        ['salsa','swing','house','bachata'],
  'Karaoke':        ['pop','rock','duets'],
  'Reading':        ['fiction','sci-fi','non-fiction','book club'],
  'Networking':     ['startup','creative','tech','career'],
  'Travel':         ['backpacking','luxury','road trips','solo'],
  'Volunteering':   ['animals','environment','community','youth'],
  'Concerts':       ['indie','rap','classical','festivals'],
  'Nightlife':      ['clubs','bars','raves','lounges'],
  'Parties':        ['hosting','themed','rooftop','house'],
  // Gaming
  'Video Games':    ['fps','rpg','fighting','co-op','indie'],
  'Chess':          ['blitz','classical','puzzle','otb'],
  'Poker':          ['texas hold em','cash games','tournaments'],
  'Tabletop RPG':   ['dnd','pathfinder','pbta','one shots'],
  'Escape Rooms':   ['horror','mystery','puzzle','competitive'],
  'Arcade':         ['retro','fighting games','rhythm','pinball'],
  'Speedrunning':   ['any%','glitchless','category extensions'],
  'Trading Card Games': ['mtg','pokemon','yugioh','draft'],
  'VR Gaming':      ['beat saber','vrchat','sim racing'],
  // Study
  'Studying':       ['library','coffee shop','group','pomodoro'],
  'Tutoring':       ['math','science','writing','test prep'],
  'Math':           ['calculus','stats','linear algebra','discrete'],
  'Languages':      ['spanish','mandarin','french','japanese','korean'],
  'Science':        ['biology','chemistry','physics','env sci'],
  'History':        ['ancient','modern','us','world','military'],
  'Coding':         ['python','javascript','swift','systems','web'],
  'Book Club':      ['fiction','non-fiction','classics','monthly'],
  'Debate':         ['policy','lincoln douglas','public forum','moot court'],
  'Law':            ['pre-law','contracts','constitutional','criminal'],
  'Medicine':       ['pre-med','nursing','anatomy','research'],
  'Engineering':    ['mechanical','electrical','civil','software'],
  'Economics':      ['macro','micro','behavioral','finance'],
  'Philosophy':     ['ethics','logic','existentialism','political'],
  'SAT/ACT Prep':   ['math','reading','writing','practice tests'],
  // Wellness
  'Meditation':     ['mindfulness','transcendental','guided','silent'],
  'Journaling':     ['gratitude','bullet','stream of consciousness'],
  'Nutrition':      ['macros','whole food','intuitive eating','supplements'],
  'Therapy':        ['cbt','talk therapy','group','somatic'],
  'Breathwork':     ['wim hof','box breathing','pranayama'],
  'Cold Plunge':    ['ice bath','cold shower','outdoor'],
  'Stretching':     ['mobility','pnf','yin yoga'],
  'Sleep':          ['tracking','routines','napping'],
  'Gratitude':      ['daily practice','journaling','sharing'],
  'Sobriety':       ['alcohol free','sober curious','recovery'],
  // Tech
  'Programming':    ['python','javascript','rust','systems','web'],
  'AI / ML':        ['llms','computer vision','data science','research'],
  'Startups':       ['founding','investing','growth','b2b','b2c'],
  'Hardware':       ['arduino','raspberry pi','pcb design','iot'],
  'Robotics':       ['ros','autonomous','drones','manipulation'],
  'Crypto':         ['bitcoin','defi','nfts','web3','trading'],
  'Cybersecurity':  ['ctf','pen testing','blue team','osint'],
  '3D Printing':    ['fdm','resin','modeling','prototyping'],
  'Open Source':    ['contributing','maintaining','linux','devtools'],
  'Product Design': ['ux','ui','figma','user research'],
  // Culture
  'Movies':         ['horror','comedy','sci-fi','documentary','arthouse'],
  'TV Shows':       ['drama','reality','anime','limited series'],
  'Anime':          ['shonen','seinen','slice of life','mecha'],
  'Podcasts':       ['true crime','comedy','tech','politics','history'],
  'Museums':        ['art','science','history','natural history'],
  'Art Galleries':  ['contemporary','street art','openings','prints'],
  'Comedy':         ['stand-up','improv','sketch','open mic'],
  'Poetry':         ['slam','haiku','reading','writing'],
  'Zines':          ['making','trading','distro','perzines'],
  'Astrology':      ['birth chart','transits','synastry','tarot'],
};

export const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', placeholder: '@username',        color: '#E1306C' },
  { id: 'discord',   name: 'Discord',   placeholder: 'username#0000',    color: '#5865F2' },
  { id: 'wechat',    name: 'WeChat',    placeholder: 'WeChat ID',         color: '#07C160' },
  { id: 'whatsapp',  name: 'WhatsApp',  placeholder: '+1 (555) 000-0000', color: '#25D366' },
  { id: 'telegram',  name: 'Telegram',  placeholder: '@username',         color: '#0088cc' },
];

export function catFor(tag) {
  for (const [cat, tags] of Object.entries(TAG_LIBRARY)) {
    if (tags.includes(tag)) return cat;
  }
  return 'Sports';
}

export function catColor(cat) {
  return colors[cat] || colors.green;
}

export function tintFor(color) {
  return color + '22';
}

export function shadeFor(cat) {
  return {
    Sports:   '#8c4023',
    Arts:     '#6b5511',
    Outdoors: '#064a35',
    Food:     '#7a1f15',
    Social:   '#22466e',
    Gaming:   '#3d1f6e',
    Study:    '#14505a',
    Wellness: '#7a2045',
    Tech:     '#1a3d7a',
    Culture:  '#6b3510',
  }[cat] || '#064a35';
}