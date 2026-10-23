// ---------- content ----------
// Owns wheel content, run text, and move selection data.
const MAIN = [
  { lbl: ['FORWARD', '? M'], go: () => ({ t: `Forward ${metres()} metres`, b: "Straight ahead, whatever way you’re facing. A big stride is about a metre." }) },
  { lbl: ['GO', 'DEEPER'], deep: true, go: () => 'go deeper' },
  { lbl: ['NEXT', 'LEFT'], go: () => ({ t: 'Take the next left', b: 'The very next left you reach. Street, alley, arcade, doorway. Whatever comes first.' }) },
  { lbl: ['SHOW ME', 'JUST FOR FUN'], show: true, go: () => 'show me' },
  { lbl: ['GO', 'DEEPER'], deep: true, go: () => 'go deeper' },
  { lbl: ['RIGHT', '? M'], go: () => ({ t: `Right ${metres()} metres`, b: 'Turn to your right and walk it. If something is in the way, go round it and keep counting.' }) },
  { lbl: ['GO', 'DEEPER'], deep: true, go: () => 'go deeper' },
  { lbl: ['INTO THAT', 'BUILDING'], go: () => ({ t: 'Go into that building', b: 'The nearest building with an open door. Everyone goes in, and you stay at least five minutes.' }) },
  { lbl: ['GO', 'DEEPER'], deep: true, go: () => 'go deeper' },
  { lbl: ['BACK', '? M'], go: () => ({ t: `Back ${metres()} metres`, b: 'Turn round and walk back the way you came.' }) },
  { lbl: ['GO', 'DEEPER'], deep: true, go: () => 'go deeper' },
  { lbl: ['SHOW ME', 'JUST FOR FUN'], show: true, go: () => 'show me' },
  { lbl: ['GO', 'DEEPER'], deep: true, go: () => 'go deeper' },
  { lbl: ['ASK A', 'LOCAL'], go: () => ({ t: 'Ask a local', b: 'Stop the next local and ask where they would go right now. That is where you are going.' }) },
  { lbl: ['GO', 'DEEPER'], deep: true, go: () => 'go deeper' },
  { lbl: ['NEXT', 'RIGHT'], go: () => ({ t: 'Take the next right', b: 'The very next right you reach. No skipping one because it looks boring.' }) },
];

const MOVE_DEFS = {
  F: { lbl: ['FORWARD', '? M'], go: () => `forward ${metres()} metres` },
  L: { lbl: ['LEFT', '? M'], go: () => `left ${metres()} metres` },
  R: { lbl: ['RIGHT', '? M'], go: () => `right ${metres()} metres` },
  B: { lbl: ['BACK', '? M'], go: () => `back ${metres()} metres` },
  NL: { lbl: ['NEXT', 'LEFT'], go: () => 'take the next left' },
  NR: { lbl: ['NEXT', 'RIGHT'], go: () => 'take the next right' },
  X: { lbl: ['CROSS THE', 'ROAD'], go: () => 'cross the road' },
  C: { lbl: ['ROUND THE', 'CORNER'], go: () => 'go round the next corner' },
  W: { lbl: ['STAND', 'STILL'], go: () => `stand still for ${pick([1, 2, 3])} minutes` },
  WD: { lbl: ['WILD'], wild: true, go: () => 'Wild: no move from this wheel' },
  BN: { lbl: ['BONUS'], bonus: true, go: () => 'Bonus: no move from this wheel' },
  GD: { lbl: ['GOD'], god: true, go: () => 'The God slice' },
  UP: { lbl: [], up: true, go: () => 'Go back up' },
  UW: { lbl: [], up: true, wild: true, go: () => 'Wild, and go back up' },
  UB: { lbl: [], up: true, bonus: true, go: () => 'Bonus, and go back up' },
  MW: { lbl: ['MORE', 'WILDS'], boost: 'W', go: () => 'More Wilds: no move from this wheel' },
  MB: { lbl: ['MORE', 'BONUS'], boost: 'B', go: () => 'More Bonus: no move from this wheel' },
  ED: { lbl: ['EVEN', 'DEEPER'], deep: true, even: true, go: () => 'Go even deeper' },
  D2: { lbl: [], deep: 2, go: () => 'go two levels deeper' },
  U2: { lbl: [], up: 2, go: () => 'go back up two levels' },
};
// Wilds (gold, Cleopatra) and Bonus slices (purple, ankh). Wild on all three inner wheels is
// the ultra bonus; Bonus on all three is the bonus round. Four inner wheels, and you need three of a kind:
// Wilds and ankhs stay on every wheel (extras become special chickens). Each wheel is 15% Wild and 20% Bonus, which comes
// out at about 1.2% for three Wilds and 2.7% for three Bonuses. The last two wheels each have one God slice (never greyed):
// it sends you to whichever room you hold two of, else the kind you have more of, else a coin flip. Every Wild and Bonus has a
// normal slice on both sides, wrap-around included. Miss either kind and that kind goes grey on every wheel further in.
const LAYER_ORDERS = [
  ['BN', 'B', 'MW', 'F', 'C', 'WD', 'U2', 'X', 'BN', 'NR', 'F', 'WD', 'C', 'R', 'BN', 'X', 'L', 'WD', 'F', 'B', 'BN', 'R', 'NL', 'MB', 'L', 'BN', 'L', 'NR', 'WD', 'B', 'C', 'BN', 'NL', 'X', 'WD', 'NR', 'F', 'BN', 'C', 'R', 'WD', 'X', 'BN', 'NR'],
  ['BN', 'NL', 'X', 'WD', 'NR', 'MW', 'F', 'BN', 'C', 'R', 'WD', 'X', 'U2', 'BN', 'F', 'B', 'WD', 'R', 'MB', 'NL', 'BN', 'L'],
  ['BN', 'NR', 'F', 'WD', 'C', 'R', 'BN', 'UP', 'L', 'WD', 'F', 'B', 'BN', 'R', 'X', 'D2', 'NL', 'WD', 'L', 'U2', 'BN', 'B'],
  ['BN', 'C', 'ED', 'R', 'WD', 'X', 'UP', 'BN', 'F', 'B', 'WD', 'R', 'UP', 'BN', 'L', 'GD', 'F', 'NR', 'WD', 'B', 'U2', 'BN', 'NL'],
  // the hidden fifth wheel, only reached through Go even deeper on the last wheel: more Wilds and ankhs than any other wheel
  ['BN', 'C', 'WD', 'R', 'BN', 'X', 'WD', 'F', 'BN', 'B', 'GD', 'U2', 'WD', 'L', 'BN', 'NR', 'WD', 'F', 'BN', 'X', 'WD', 'R', 'BN', 'C', 'WD', 'L', 'BN', 'B'],
];
const REPLACE = ['F', 'L', 'R', 'B', 'NL', 'NR', 'X', 'C'];
// dead variants: 'W' = Wilds greyed, 'B' = Bonus greyed, 'WB' = both
const DEAD_KEYS = ['W', 'B', 'WB'];
const MAXD = LAYER_ORDERS.length; // every inner wheel, the hidden fifth included
var DEPTH = MAXD - 1; // inner wheels this run; the dice well sits in the last one (Go even deeper adds the fifth)
const DEAD_ORDERS = {};
DEAD_KEYS.forEach(v => DEAD_ORDERS[v] = LAYER_ORDERS.map((o, k) => { let j = k * 3; return o.map(key => (key === 'WD' && v.includes('W')) || (key === 'BN' && v.includes('B')) ? REPLACE[j++ % REPLACE.length] + (key === 'WD' ? '*' : '#') : key); }));
const STANK = [
  { lbl: ['MESSAGE', 'ZENA'], t: 'Message Zena' },
  { lbl: ['MESSAGE', 'PHELAN'], t: 'Message Phelan' },
  { lbl: ['MESSAGE', 'LAURENCE'], t: 'Message Laurence' },
  { lbl: ['TELL PHELAN', 'YOU LOVE HIM'], t: 'Tell Phelan you love him' },
  { lbl: ['EMAIL', "PHELAN'S WORK"], t: "Email Phelan's work" },
  { lbl: ["SNIFF PHELAN'S", 'OLD BED'], t: "Sniff Phelan's old bed" },
  { lbl: ['TRACK DOWN', 'PHELAN'], t: 'Track down Phelan' },
];
// 50 bingo balls: 25 x €10, 10 x €20, 10 x €50, 4 x €100, 1 x Phelan's heart
const PRIZES = [[10, 25], [20, 10], [50, 10], [100, 4], [500, 1]];
const PRIZE_COL = { 10: '#2f6fe0', 20: '#1f9d5a', 50: '#d23b3b', 100: '#8a4ad8', 500: '#d9a21b' };

// the ball drop draws 8 of these each run and shuffles which slot they land in
const FINAL_POOL = [
  { lbl: ['PUB'], t: 'The pub', b: 'and go into the nearest pub' },
  { lbl: ['SLOT', 'HOUSE'], t: 'The slot house', b: 'and find a slot house' },
  { lbl: ['CHIPPY'], t: 'The chippy', b: 'and get yourselves to a chippy' },
  { lbl: ['LIVE', 'MUSIC'], t: 'Live music', b: 'and find somewhere with live music on' },
  { lbl: ['SNOOKER'], t: 'Snooker hall', b: 'and find a snooker or pool hall' },
  { lbl: ['TAXI', 'LOTTO'], t: 'Taxi lotto', b: 'and get a taxi to wherever the driver picks' },
  { lbl: ['HIGH', 'UP'], t: 'Somewhere high', b: 'and get somewhere high up with a view' },
  { lbl: ['CORNER', 'SHOP'], t: 'The corner shop', b: 'and buy the strangest thing in the nearest corner shop' },
  { lbl: ['KARAOKE'], t: 'Karaoke', b: 'and find somewhere doing karaoke' },
  { lbl: ['ARCADE'], t: 'The arcade', b: 'and find an arcade' },
  { lbl: ['TRAD', 'SESSION'], t: 'Trad session', b: 'and find a pub with a trad session on' },
  { lbl: ['KEBAB'], t: 'The kebab shop', b: 'and get a kebab' },
  { lbl: ['HOTEL', 'LOBBY'], t: 'A hotel lobby', b: 'and walk into the fanciest hotel lobby nearby' },
  { lbl: ['BLACK', 'TAXI'], t: 'Black taxi tour', b: 'and flag down a black taxi and ask for the tour' },
  { lbl: ['LATE', 'CAFÉ'], t: 'A late café', b: 'and get a coffee somewhere still open' },
  { lbl: ['ROOFTOP', 'BAR'], t: 'Rooftop bar', b: 'and find a bar with a roof terrace' },
];
const SLOT_TINTS = [['#1d2f66', '#78a3f2'], ['#5a3d0d', '#f0c66a'], ['#5a1f33', '#ec93ae'], ['#0f4a3a', '#62d4aa'], ['#3b1f66', '#b58ff2'], ['#5a2a14', '#e8a172'], ['#2b3036', '#dde3e8'], ['#123d5c', '#70c6f0']];
let FINAL = [];
function dealFinal() {
  FINAL = [...FINAL_POOL].sort(() => Math.random() - .5).slice(0, 8).map((d, i) => ({ ...d, tint: SLOT_TINTS[i] }));
}
dealFinal();

// Austin's head: shown with every result
const QUOTES = [
  "It'll be grand. It always ends up grand, even when it takes the long way round.",
  "Stop for a second and look up. You're in Belfast with the lads. That's not nothing.",
  "There's no wrong way to go when you don't know where you're going.",
  'Nobody ever told a good story about the night that went to plan.',
  'The best bit is usually just round the next corner. Usually.',
  "Say yes to whatever's next. Worst case, it's a story.",
  'Every mate you have was a stranger once. Some of them still are, a bit.',
  "That's tomorrow's problem. Tonight is for this.",
  'Every great night started with somebody saying "one more".',
  "Trust the wheel. It hasn't let us down yet. Not properly, anyway.",
  "Home will still be there on Monday. This won't be.",
  "Keep going. You don't get lost if you never had a plan.",
];
let lastQuote = -1;
// Austin's hope streak: three finished runs in a row without a Wild or Bonus room and he gives the next deep run a More Wilds boost
const HOPE = [
  "Three in a row with nothing. That's the wheel winding up, lads. Next one's ours.",
  "I'm not saying it owes us. I'm just saying it owes us. Go again.",
  "Every dry spell ends. I've put a few extra Cleopatras in for you.",
  "The wheel's been quiet. Quiet means it's thinking. Spin it.",
  "I had a word with the wheel. It's sorry. Next go has more Wilds on it.",
];
const store = { get(k, d) { try { const v = localStorage.getItem('wol.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('wol.' + k, JSON.stringify(v)); } catch (e) {} } };
let roomHit = false;
function hopeAfterRun() {
  let n = roomHit ? 0 : store.get('dry', 0) + 1;
  if (n >= 3 && !store.get('hope', false)) {
    store.set('hope', true); n = 0;
    const fq = $('#finalQuote'); fq.className = 'fquote hope'; fq.innerHTML = '';
    const b = document.createElement('b'); b.textContent = 'Austin has hope'; fq.append(b, '“' + pick(HOPE) + '”');
    buzz([30, 60, 30]); ting();
  }
  store.set('dry', n);
}
function quote() { let i; do { i = Math.floor(Math.random() * QUOTES.length); } while (i === lastQuote); lastQuote = i; return QUOTES[i]; }
// the end screen pulls a thought out of one of three heads
const HEADS = {
  Mark: [
    "Why am I always the one holding everyone's jackets?",
    "Donegal's got better beaches than Rio. I've checked. Twice.",
    "I'm not saying I'm the best dancer here. I'm just saying nobody else is trying.",
    "Living with Phelan was character building. Mostly my character, mostly against my will.",
    "In Brazil I miss a proper cup of tea. At home I miss the sun. I can't win.",
    "Why does everyone keep asking me questions tonight?",
    "If we end up in a chipper, I'm getting curry chips. That's not up for discussion.",
    "I'm grand. I'm always grand. Stop asking.",
    "My fella says I'm more relaxed in Brazil. That's because Phelan isn't there.",
    "Belfast's fine. It's no Letterkenny, but it's fine.",
    "One more drink and I'll tell you about São Paulo. Actually, no I won't.",
    "I don't care where we go as long as there's a seat when we get there.",
  ],
  Cillian: [
    "Right, this is the one. I can feel it.",
    "Worst case, we get a story out of it.",
    "If the wheel sends us somewhere grim, we make it good anyway.",
    "Ask the wheel nicely and it'll be nicer back. That's basically science.",
    "I'd follow that wheel off a cliff. Not a high one, like.",
    "If Mark ever finds this wheel, I've never seen it in my life.",
    "Nothing bad has ever happened to anyone who said yes to things. Probably.",
    "I've a good feeling about the next street. And the one after.",
    "If it says go left, we go left. If it says go right, we think about it.",
    "Somewhere out there is the best pint in Belfast and it's waiting for us.",
    "The night only properly starts when someone gets lost.",
    "Trust the wheel. It's never been wrong. It's never been right either, but still.",
  ],
};
function headThought() { const who = pick(['Austin', 'Mark', 'Cillian']); return { who, text: who === 'Austin' ? quote() : pick(HEADS[who]) }; }
const PHOTO_N = 16;
const S = .56; // each nested wheel is this much smaller than the one around it
