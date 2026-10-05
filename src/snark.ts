import type { Holiday } from './holidays';
import type { TimeOfDay, WeatherKind } from './types';

/** Danish phrase pack. One line is picked per situation and stays put for the hour. */
const LINES = {
  storm: [
    'Torden og lyn. Træk stikket ud, og lad som om det er 1800-tallet.',
    'Himlen holder koncert. Gratis adgang, men du bliver våd.',
    'Tordenvejr. Ser du Thor, så sig, at vi har fået nok.',
    'Lyn i luften. Ikke den bedste dag at flyve med drage.',
  ],
  hail: [
    'Hagl! Himlen kaster med ærter igen.',
    'Det hagler. Din bil har mere at frygte end du. Næsten.',
    'Gratis isterninger fra oven. Ingen ved, hvem der har bestilt dem.',
  ],
  pour: [
    'Det styrtregner. Selv ænderne har søgt ly.',
    'Regnen falder ikke. Den bliver hældt ud af spande.',
    'Skybrud. Godt tidspunkt at tjekke, om kælderen stadig er tør.',
    'Så meget regn, at fiskene overvejer at flytte på land.',
  ],
  sleet: [
    'Slud. Vejrets svar på et kompromis, ingen bad om.',
    'Hverken regn eller sne. Bare elendighed i flydende form.',
    'Slud. Den mest danske vejrtype, der findes.',
  ],
  snow: [
    'Sne! Nyd de fem minutter, før det bliver til slud.',
    'Det sner. Om lidt bryder den kollektive trafik sammen.',
    'Hvidt og smukt. Indtil nogen skal skrabe bilen.',
    'Sne i Danmark. Børnene jubler, pendlerne græder.',
  ],
  rain: [
    'Det regner. Du bor i Danmark – hvad havde du regnet med?',
    'Regnvejr. Perfekt til at blive under dynen og kalde det selvomsorg.',
    'Lidt regn har aldrig skadet nogen. Undtagen din frisure.',
    'Det drypper. Paraplyen er din bedste ven i dag.',
    'Regn igen. Græsset er glad. Det er nok også den eneste.',
  ],
  fog: [
    'Tåge. Man kan næsten ikke se, hvor dårligt vejret er.',
    'Tæt tåge. Perfekt til en mystisk krimi – eller til at blive inde.',
    'Tågen ligger tæt. Naboen er officielt forsvundet.',
  ],
  windy: [
    'Modvind i begge retninger. Det er ikke dig, det er Danmark.',
    'Det blæser. Hold godt fast i hatten – og i cyklen.',
    'Stiv kuling. Vindmøllerne tjener styr på penge i dag.',
    'Så meget blæst, at frisuren har sin egen vejrudsigt.',
  ],
  hot: [
    'Over 25 grader! Danskerne smider tøjet og klager over varmen.',
    'Hedebølge, dansk version. Find skyggen og en kold øl.',
    'Det er varmt. Isbutikkerne har deres bedste dag i år.',
  ],
  arctic: [
    'Bidende koldt. Selv pingviner ville tage en ekstra trøje på.',
    'Så koldt, at din ånde har brug for en jakke.',
  ],
  freezing: [
    'Frostvejr. Husk vanterne – og isskraberen.',
    'Under nul. Fortovene er nu officielt skøjtebaner.',
    'Koldt nok til at se sin ånde. Og fortryde, at man gik ud.',
  ],
  rainSoon: [
    'Tørt lige nu, men regnen er på vej. Tag paraplyen med.',
    'Nyd tørvejret, mens det varer. Det gør det ikke længe.',
  ],
  cloudy: [
    'Gråvejr. Himlen har valgt sin yndlingsfarve igen.',
    'Overskyet. Solen har taget en fridag. Igen.',
    'Grå himmel. Danmarks nationalfarve, hvis man spørger vejret.',
  ],
  partly: [
    'Lidt sol, lidt skyer. Vejret kan ikke beslutte sig.',
    'Solen kigger frem en gang imellem. Bare for at drille.',
    'Halvskyet. Eller halvsolrigt, hvis man er optimist.',
  ],
  clearNight: [
    'Klar nat. Perfekt til stjernekig – eller til at fryse.',
    'Stjerneklart. Månen holder øje med dig.',
    'Klar himmel i nat. Tæl får, eller tæl stjerner.',
  ],
  warm: [
    'Solskin i Danmark. Nyd det, før nogen opdager fejlen.',
    'Dejligt vejr. Om lidt bliver du sikkert stukket af en hveps.',
    'Sol og varme! Find solcremen og en plet på græsset.',
    'Strålende vejr. Selv mågerne er i godt humør i dag.',
  ],
  mild: [
    'Sol fra en skyfri himmel. Det sker ikke tit, så nyd det.',
    'Smukt vejr. Ingen undskyldning for ikke at gå en tur.',
    'Solen skinner. Vær nu sød at gå udenfor.',
  ],
  halloween: [
    'Glædelig halloween! Selv skyerne er klædt ud i dag.',
    'Slik eller ballade? Vejret har valgt ballade.',
    'Halloween. Græskarrene griner, og vejret griner med.',
    'Uhyggeligt vejr. Eller er det bare flagermusene?',
  ],
  christmasEve: [
    'Glædelig jul! Risalamanden venter – vejret gør ikke.',
    'Juleaften. Nissen har tjekket vejrudsigten to gange.',
    'Glædelig jul! Hvid jul? Det må vejret selv om.',
  ],
  christmasDay: [
    'Juledag. Rester til frokost – og vejret er også genopvarmet.',
    'Glædelig jul! Bukserne strammer, men vejret er gratis.',
  ],
  nyeDay: [
    'Nytårsaften! Kongens tale kl. 18 – vejret taler bare videre.',
    'Sidste dag i året. Vejret har ikke lovet at forbedre sig.',
  ],
  nyeEvening: [
    'Raketterne er klar. Hold øje med himlen – og med hunden.',
    'Kransekage, champagne og krudt i luften. Godt nytår om lidt!',
    'Husk at stå på en stol ved midnat. Vejret står bare stille.',
  ],
  newyear: [
    'GODT NYTÅR! Hoppede du ned fra stolen?',
    'Godt nytår! Nyt år, samme danske vejr.',
    'Skål og godt nytår! Raketterne ved ikke, hvad vejret er.',
  ],
  easter: [
    'God påske! Påskeharen har gemt æg i landskabet – kan du finde dem?',
    'Påskefrokost-vejr. Husk snapsen – og en jakke.',
    'God påske! Påskeliljerne er mere optimistiske end vejrudsigten.',
  ],
  coldSun: [
    'Sol, men koldt. Smukt at se på gennem vinduet.',
    'Solskin og kulde. Danske vinterdage, når de er bedst.',
  ],
} as const;

export interface SnarkInput {
  kind: WeatherKind;
  /** Current temperature in °C. */
  tempC: number;
  windMs: number;
  time: TimeOfDay;
  rainSoon: boolean;
  holiday?: Holiday | null;
  now: Date;
}

function situation(i: SnarkInput): keyof typeof LINES {
  switch (i.holiday) {
    case 'halloween': return 'halloween';
    case 'christmas': return i.now.getDate() === 24 ? 'christmasEve' : 'christmasDay';
    case 'nye': return i.now.getHours() < 18 ? 'nyeDay' : 'nyeEvening';
    case 'newyear': return 'newyear';
    case 'easter': return 'easter';
  }
  switch (i.kind) {
    case 'storm': return 'storm';
    case 'hail': return 'hail';
    case 'pour': return 'pour';
    case 'sleet': return 'sleet';
    case 'snow': return 'snow';
    case 'rain': return 'rain';
    case 'fog': return 'fog';
  }
  if (i.windMs >= 10) return 'windy';
  if (i.tempC >= 25) return 'hot';
  if (i.tempC <= -8) return 'arctic';
  if (i.tempC <= 0) return 'freezing';
  if (i.rainSoon) return 'rainSoon';
  if (i.kind === 'cloudy') return 'cloudy';
  if (i.kind === 'partly') return 'partly';
  if (i.time === 'night') return 'clearNight';
  if (i.tempC >= 18) return 'warm';
  if (i.tempC >= 8) return 'mild';
  return 'coldSun';
}

export function snark(i: SnarkInput): string {
  const lines = LINES[situation(i)];
  const n = i.now;
  const hourSeed = n.getFullYear() * 1000 + n.getMonth() * 50 + n.getDate() * 31 + n.getHours() * 7;
  return lines[hourSeed % lines.length];
}
