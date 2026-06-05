export const normaliseTravelOptionText = (value = '') => value
  .toString()
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export const looksLikeIataCode = (value) => /^[A-Z]{3}$/.test(`${value || ''}`.trim().toUpperCase());
export const extractTravelOptionCode = (value) => {
  const text = `${value || ''}`.trim();
  if (looksLikeIataCode(text)) return text.toUpperCase();
  return text.toUpperCase().match(/\(([A-Z]{3})\)/)?.[1] || '';
};

const airport = (label, airportCity, countryRegion, group, iataCode = '') => ({
  label,
  value: label,
  airportCity,
  countryRegion,
  group,
  ...(iataCode ? { iataCode } : {}),
});

export const departureAirports = [
  airport('London (All Airports)', 'London', 'United Kingdom', 'UK', 'LON'),
  airport('London Heathrow', 'London Heathrow', 'United Kingdom', 'UK', 'LHR'),
  airport('London Gatwick', 'London Gatwick', 'United Kingdom', 'UK', 'LGW'),
  airport('London Stansted', 'London Stansted', 'United Kingdom', 'UK', 'STN'),
  airport('London Luton', 'London Luton', 'United Kingdom', 'UK', 'LTN'),
  airport('London City', 'London City', 'United Kingdom', 'UK', 'LCY'),
  airport('Manchester', 'Manchester', 'United Kingdom', 'UK', 'MAN'),
  airport('Birmingham', 'Birmingham', 'United Kingdom', 'UK', 'BHX'),
  airport('Bristol', 'Bristol', 'United Kingdom', 'UK', 'BRS'),
  airport('Cardiff', 'Cardiff', 'Wales, UK', 'UK', 'CWL'),
  airport('Exeter', 'Exeter', 'United Kingdom', 'UK', 'EXT'),
  airport('Bournemouth', 'Bournemouth', 'United Kingdom', 'UK', 'BOH'),
  airport('Southampton', 'Southampton', 'United Kingdom', 'UK', 'SOU'),
  airport('Norwich', 'Norwich', 'United Kingdom', 'UK', 'NWI'),
  airport('East Midlands', 'East Midlands', 'United Kingdom', 'UK', 'EMA'),
  airport('Liverpool', 'Liverpool', 'United Kingdom', 'UK', 'LPL'),
  airport('Leeds Bradford', 'Leeds Bradford', 'United Kingdom', 'UK', 'LBA'),
  airport('Newcastle', 'Newcastle', 'United Kingdom', 'UK', 'NCL'),
  airport('Teesside', 'Teesside', 'United Kingdom', 'UK', 'MME'),
  airport('Edinburgh', 'Edinburgh', 'Scotland, UK', 'UK', 'EDI'),
  airport('Glasgow', 'Glasgow', 'Scotland, UK', 'UK', 'GLA'),
  airport('Glasgow Prestwick', 'Glasgow Prestwick', 'Scotland, UK', 'UK', 'PIK'),
  airport('Aberdeen', 'Aberdeen', 'Scotland, UK', 'UK', 'ABZ'),
  airport('Inverness', 'Inverness', 'Scotland, UK', 'UK', 'INV'),
  airport('Belfast International', 'Belfast International', 'Northern Ireland, UK', 'UK', 'BFS'),
  airport('Belfast City', 'Belfast City', 'Northern Ireland, UK', 'UK', 'BHD'),
  airport('Derry/Londonderry', 'Derry/Londonderry', 'Northern Ireland, UK', 'UK', 'LDY'),
  airport('Dublin', 'Dublin', 'Ireland', 'Ireland', 'DUB'),
  airport('Cork', 'Cork', 'Ireland', 'Ireland', 'ORK'),
  airport('Shannon', 'Shannon', 'Ireland', 'Ireland', 'SNN'),
  airport('Knock', 'Ireland West Knock', 'Ireland', 'Ireland', 'NOC'),
  airport('Amsterdam', 'Amsterdam Schiphol', 'Netherlands', 'Netherlands', 'AMS'),
  airport('Brussels', 'Brussels', 'Belgium', 'Belgium', 'BRU'),
  airport('Paris Charles de Gaulle', 'Paris Charles de Gaulle', 'France', 'France', 'CDG'),
  airport('Paris Orly', 'Paris Orly', 'France', 'France', 'ORY'),
  airport('Lyon', 'Lyon', 'France', 'France', 'LYS'),
  airport('Nice', 'Nice Côte d’Azur', 'France', 'France', 'NCE'),
  airport('Bordeaux', 'Bordeaux', 'France', 'France', 'BOD'),
  airport('Toulouse', 'Toulouse', 'France', 'France', 'TLS'),
  airport('Marseille', 'Marseille Provence', 'France', 'France', 'MRS'),
  airport('Frankfurt', 'Frankfurt', 'Germany', 'Germany', 'FRA'),
  airport('Munich', 'Munich', 'Germany', 'Germany', 'MUC'),
  airport('Berlin', 'Berlin Brandenburg', 'Germany', 'Germany', 'BER'),
  airport('Hamburg', 'Hamburg', 'Germany', 'Germany', 'HAM'),
  airport('Düsseldorf', 'Düsseldorf', 'Germany', 'Germany', 'DUS'),
  airport('Cologne Bonn', 'Cologne Bonn', 'Germany', 'Germany', 'CGN'),
  airport('Stuttgart', 'Stuttgart', 'Germany', 'Germany', 'STR'),
  airport('Vienna', 'Vienna', 'Austria', 'Central Europe', 'VIE'),
  airport('Zurich', 'Zurich', 'Switzerland', 'Central Europe', 'ZRH'),
  airport('Geneva', 'Geneva', 'Switzerland', 'Central Europe', 'GVA'),
  airport('Basel', 'Basel-Mulhouse-Freiburg', 'Switzerland/France', 'Central Europe', 'BSL'),
  airport('Milan Malpensa', 'Milan Malpensa', 'Italy', 'Italy', 'MXP'),
  airport('Milan Bergamo', 'Milan Bergamo', 'Italy', 'Italy', 'BGY'),
  airport('Rome Fiumicino', 'Rome Fiumicino', 'Italy', 'Italy', 'FCO'),
  airport('Venice', 'Venice Marco Polo', 'Italy', 'Italy', 'VCE'),
  airport('Naples', 'Naples', 'Italy', 'Italy', 'NAP'),
  airport('Bologna', 'Bologna', 'Italy', 'Italy', 'BLQ'),
  airport('Turin', 'Turin', 'Italy', 'Italy', 'TRN'),
  airport('Madrid', 'Madrid', 'Spain', 'Spain', 'MAD'),
  airport('Barcelona', 'Barcelona', 'Spain', 'Spain', 'BCN'),
  airport('Malaga', 'Malaga', 'Spain', 'Spain', 'AGP'),
  airport('Alicante', 'Alicante', 'Spain', 'Spain', 'ALC'),
  airport('Valencia', 'Valencia', 'Spain', 'Spain', 'VLC'),
  airport('Seville', 'Seville', 'Spain', 'Spain', 'SVQ'),
  airport('Palma de Mallorca', 'Palma de Mallorca', 'Spain', 'Spain', 'PMI'),
  airport('Ibiza', 'Ibiza', 'Spain', 'Spain', 'IBZ'),
  airport('Tenerife South', 'Tenerife South', 'Spain', 'Spain', 'TFS'),
  airport('Gran Canaria', 'Gran Canaria', 'Spain', 'Spain', 'LPA'),
  airport('Lanzarote', 'Lanzarote', 'Spain', 'Spain', 'ACE'),
  airport('Lisbon', 'Lisbon', 'Portugal', 'Portugal', 'LIS'),
  airport('Porto', 'Porto', 'Portugal', 'Portugal', 'OPO'),
  airport('Faro', 'Faro', 'Portugal', 'Portugal', 'FAO'),
  airport('Copenhagen', 'Copenhagen', 'Denmark', 'Nordics', 'CPH'),
  airport('Stockholm Arlanda', 'Stockholm Arlanda', 'Sweden', 'Nordics', 'ARN'),
  airport('Oslo', 'Oslo', 'Norway', 'Nordics', 'OSL'),
  airport('Helsinki', 'Helsinki', 'Finland', 'Nordics', 'HEL'),
  airport('Prague', 'Prague', 'Czechia', 'Central Europe', 'PRG'),
  airport('Budapest', 'Budapest', 'Hungary', 'Central Europe', 'BUD'),
  airport('Krakow', 'Krakow', 'Poland', 'Central Europe', 'KRK'),
  airport('Warsaw', 'Warsaw', 'Poland', 'Central Europe', 'WAW'),
  airport('Athens', 'Athens', 'Greece', 'Greece', 'ATH'),
  airport('Thessaloniki', 'Thessaloniki', 'Greece', 'Greece', 'SKG'),
  airport('Heraklion', 'Heraklion', 'Greece', 'Greece', 'HER'),
  airport('Rhodes', 'Rhodes', 'Greece', 'Greece', 'RHO'),
  airport('Corfu', 'Corfu', 'Greece', 'Greece', 'CFU'),
  airport('Malta', 'Malta', 'Malta', 'Central Europe', 'MLA'),
  airport('Larnaca', 'Larnaca', 'Cyprus', 'Greece', 'LCA'),
  airport('Paphos', 'Paphos', 'Cyprus', 'Greece', 'PFO'),
];

const addCodeAlias = (lookup, label, code) => {
  if (!label || !code || !looksLikeIataCode(code)) return lookup;
  lookup[normaliseTravelOptionText(label)] = code;
  lookup[normaliseTravelOptionText(`${label} (${code})`)] = code;
  lookup[normaliseTravelOptionText(code)] = code;
  return lookup;
};

export const departureAirportCodeLookup = departureAirports.reduce((lookup, option) => {
  addCodeAlias(lookup, option.label, option.iataCode);
  addCodeAlias(lookup, option.airportCity, option.iataCode);
  return lookup;
}, {});

export const destinationAliases = {
  Majorca: ['Mallorca', 'Palma', 'Palma de Mallorca'],
  Zante: ['Zakynthos'],
  Algarve: ['Faro', 'Albufeira', 'Vilamoura', 'Lagos'],
  Benidorm: ['Alicante', 'Costa Blanca'],
  'Ayia Napa': ['Larnaca', 'Nissi Beach'],
  'Costa del Sol': ['Malaga', 'Marbella'],
  Tenerife: ['Tenerife South', 'Canary Islands'],
  'Lake Garda': ['Malcesine'],
};

const destination = (label, group, countryRegion, tags = [], aliases = []) => ({
  label,
  value: label,
  group,
  countryRegion,
  tags,
  aliases: [...(destinationAliases[label] || []), ...aliases],
});

export const destinationSuggestions = [
  destination('Ibiza', 'Spain and islands', 'Spain', ['beach', 'party', 'stag-hen', 'group-hotels']),
  destination('Majorca', 'Spain and islands', 'Spain', ['beach', 'family', 'villas', 'group-hotels']),
  destination('Menorca', 'Spain and islands', 'Spain', ['beach', 'family', 'villas']),
  destination('Tenerife', 'Spain and islands', 'Spain', ['beach', 'family', 'group-hotels']),
  destination('Gran Canaria', 'Spain and islands', 'Spain', ['beach', 'family']),
  destination('Lanzarote', 'Spain and islands', 'Spain', ['beach', 'family', 'villas']),
  destination('Fuerteventura', 'Spain and islands', 'Spain', ['beach', 'family']),
  destination('Costa del Sol', 'Spain and islands', 'Spain', ['beach', 'family', 'stag-hen', 'group-hotels']),
  destination('Malaga', 'Spain and islands', 'Spain', ['beach', 'city', 'group-hotels']),
  destination('Marbella', 'Spain and islands', 'Spain', ['beach', 'party', 'villas']),
  destination('Benidorm', 'Spain and islands', 'Spain', ['beach', 'party', 'stag-hen', 'group-hotels']),
  destination('Alicante', 'Spain and islands', 'Spain', ['beach', 'city']),
  destination('Costa Brava', 'Spain and islands', 'Spain', ['beach', 'family']),
  destination('Barcelona', 'Spain and islands', 'Spain', ['city', 'beach', 'stag-hen', 'group-hotels']),
  destination('Madrid', 'Spain and islands', 'Spain', ['city', 'group-hotels']),
  destination('Valencia', 'Spain and islands', 'Spain', ['city', 'beach']),
  destination('Seville', 'Spain and islands', 'Spain', ['city']),
  destination('Algarve', 'Portugal', 'Portugal', ['beach', 'family', 'villas', 'group-hotels']),
  destination('Faro', 'Portugal', 'Portugal', ['beach']),
  destination('Albufeira', 'Portugal', 'Portugal', ['beach', 'party', 'stag-hen', 'group-hotels']),
  destination('Vilamoura', 'Portugal', 'Portugal', ['beach', 'villas']),
  destination('Lagos', 'Portugal', 'Portugal', ['beach', 'villas']),
  destination('Lisbon', 'Portugal', 'Portugal', ['city', 'group-hotels']),
  destination('Porto', 'Portugal', 'Portugal', ['city']),
  destination('Madeira', 'Portugal', 'Portugal', ['beach', 'family']),
  destination('Zante', 'Greece and islands', 'Greece', ['beach', 'party', 'stag-hen', 'group-hotels']),
  destination('Corfu', 'Greece and islands', 'Greece', ['beach', 'family', 'villas']),
  destination('Crete', 'Greece and islands', 'Greece', ['beach', 'family', 'villas']),
  destination('Heraklion', 'Greece and islands', 'Greece', ['beach', 'city']),
  destination('Rhodes', 'Greece and islands', 'Greece', ['beach', 'family', 'group-hotels']),
  destination('Kos', 'Greece and islands', 'Greece', ['beach', 'party']),
  destination('Santorini', 'Greece and islands', 'Greece', ['beach', 'city']),
  destination('Mykonos', 'Greece and islands', 'Greece', ['beach', 'party']),
  destination('Athens', 'Greece and islands', 'Greece', ['city']),
  destination('Thessaloniki', 'Greece and islands', 'Greece', ['city']),
  destination('Paphos', 'Cyprus and Malta', 'Cyprus', ['beach', 'family', 'group-hotels']),
  destination('Larnaca', 'Cyprus and Malta', 'Cyprus', ['beach', 'family']),
  destination('Ayia Napa', 'Cyprus and Malta', 'Cyprus', ['beach', 'party', 'stag-hen', 'group-hotels']),
  destination('Limassol', 'Cyprus and Malta', 'Cyprus', ['beach', 'family']),
  destination('Malta', 'Cyprus and Malta', 'Malta', ['beach', 'city', 'group-hotels']),
  destination('St Julian’s', 'Cyprus and Malta', 'Malta', ['beach', 'party', 'group-hotels'], ['St Julians']),
  destination('Sliema', 'Cyprus and Malta', 'Malta', ['beach', 'city']),
  destination('Rome', 'Italy', 'Italy', ['city', 'group-hotels']),
  destination('Milan', 'Italy', 'Italy', ['city']),
  destination('Venice', 'Italy', 'Italy', ['city']),
  destination('Florence', 'Italy', 'Italy', ['city']),
  destination('Naples', 'Italy', 'Italy', ['city', 'beach']),
  destination('Sorrento', 'Italy', 'Italy', ['beach', 'family']),
  destination('Amalfi Coast', 'Italy', 'Italy', ['beach', 'villas']),
  destination('Lake Garda', 'Italy', 'Italy', ['family', 'villas']),
  destination('Sicily', 'Italy', 'Italy', ['beach', 'family']),
  destination('Sardinia', 'Italy', 'Italy', ['beach', 'family', 'villas']),
  destination('Paris', 'France', 'France', ['city', 'family']),
  destination('Nice', 'France', 'France', ['beach', 'city']),
  destination('Cannes', 'France', 'France', ['beach', 'city']),
  destination('Marseille', 'France', 'France', ['city', 'beach']),
  destination('Bordeaux', 'France', 'France', ['city']),
  destination('Lyon', 'France', 'France', ['city']),
  destination('French Riviera', 'France', 'France', ['beach', 'villas']),
  destination('Disneyland Paris', 'France', 'France', ['family']),
  destination('Prague', 'Central and eastern Europe city breaks', 'Czechia', ['city', 'stag-hen', 'group-hotels']),
  destination('Budapest', 'Central and eastern Europe city breaks', 'Hungary', ['city', 'stag-hen', 'group-hotels']),
  destination('Krakow', 'Central and eastern Europe city breaks', 'Poland', ['city', 'stag-hen']),
  destination('Warsaw', 'Central and eastern Europe city breaks', 'Poland', ['city']),
  destination('Vienna', 'Central and eastern Europe city breaks', 'Austria', ['city']),
  destination('Bratislava', 'Central and eastern Europe city breaks', 'Slovakia', ['city']),
  destination('Amsterdam', 'Netherlands, Belgium and Germany', 'Netherlands', ['city', 'stag-hen', 'group-hotels']),
  destination('Rotterdam', 'Netherlands, Belgium and Germany', 'Netherlands', ['city']),
  destination('Brussels', 'Netherlands, Belgium and Germany', 'Belgium', ['city']),
  destination('Bruges', 'Netherlands, Belgium and Germany', 'Belgium', ['city']),
  destination('Berlin', 'Netherlands, Belgium and Germany', 'Germany', ['city', 'stag-hen']),
  destination('Munich', 'Netherlands, Belgium and Germany', 'Germany', ['city', 'stag-hen']),
  destination('Hamburg', 'Netherlands, Belgium and Germany', 'Germany', ['city', 'stag-hen']),
  destination('Cologne', 'Netherlands, Belgium and Germany', 'Germany', ['city']),
  destination('Dubrovnik', 'Croatia, Montenegro and Balkans', 'Croatia', ['beach', 'city']),
  destination('Split', 'Croatia, Montenegro and Balkans', 'Croatia', ['beach', 'city']),
  destination('Hvar', 'Croatia, Montenegro and Balkans', 'Croatia', ['beach', 'party']),
  destination('Zagreb', 'Croatia, Montenegro and Balkans', 'Croatia', ['city']),
  destination('Kotor', 'Croatia, Montenegro and Balkans', 'Montenegro', ['beach', 'city']),
  destination('Budva', 'Croatia, Montenegro and Balkans', 'Montenegro', ['beach', 'party']),
  destination('Antalya', 'Turkey', 'Turkey', ['beach', 'family', 'group-hotels']),
  destination('Dalaman', 'Turkey', 'Turkey', ['beach', 'family']),
  destination('Bodrum', 'Turkey', 'Turkey', ['beach', 'party']),
  destination('Marmaris', 'Turkey', 'Turkey', ['beach', 'party', 'stag-hen']),
  destination('Side', 'Turkey', 'Turkey', ['beach', 'family']),
  destination('Copenhagen', 'Nordics', 'Denmark', ['city']),
  destination('Stockholm', 'Nordics', 'Sweden', ['city']),
  destination('Oslo', 'Nordics', 'Norway', ['city']),
  destination('Reykjavik', 'Nordics', 'Iceland', ['city']),
  destination('Helsinki', 'Nordics', 'Finland', ['city']),
];

export const popularDestinationChips = [
  'Ibiza',
  'Tenerife',
  'Barcelona',
  'Albufeira',
  'Prague',
  'Benidorm',
  'Zante',
  'Amsterdam',
  'Majorca',
  'Ayia Napa',
];


const destinationAirportCodeOverrides = {
  'Ayia Napa': 'LCA',
  Algarve: 'FAO',
  Albufeira: 'FAO',
  'Amalfi Coast': 'NAP',
  Benidorm: 'ALC',
  Bodrum: 'BJV',
  Bruges: 'BRU',
  Budva: 'TIV',
  Cannes: 'NCE',
  Cologne: 'CGN',
  'Costa Brava': 'GRO',
  'Costa del Sol': 'AGP',
  Crete: 'HER',
  Dalaman: 'DLM',
  'Disneyland Paris': 'CDG',
  Dubrovnik: 'DBV',
  Florence: 'FLR',
  'French Riviera': 'NCE',
  Fuerteventura: 'FUE',
  Hvar: 'SPU',
  'Lake Garda': 'VRN',
  Madeira: 'FNC',
  Majorca: 'PMI',
  Marmaris: 'DLM',
  Menorca: 'MAH',
  Mykonos: 'JMK',
  Reykjavik: 'KEF',
  Rotterdam: 'RTM',
  Santorini: 'JTR',
  Sardinia: 'OLB',
  Sicily: 'CTA',
  Side: 'AYT',
  Sliema: 'MLA',
  Split: 'SPU',
  'St Julian’s': 'MLA',
  Zante: 'ZTH',
  Zagreb: 'ZAG',
};

export const destinationAirportCodeLookup = destinationSuggestions.reduce((lookup, option) => {
  const directAirportCode = departureAirportCodeLookup[normaliseTravelOptionText(option.label)];
  const code = destinationAirportCodeOverrides[option.label] || directAirportCode;
  addCodeAlias(lookup, option.label, code);
  for (const alias of option.aliases || []) addCodeAlias(lookup, alias, code);
  return lookup;
}, {});


const tagLabels = {
  beach: 'Beach',
  city: 'City',
  party: 'Party',
  family: 'Family',
  villas: 'Villas',
  'stag-hen': 'Stag & Hen',
  'group-hotels': 'Group Hotels',
};

const compactRegionLabel = (region = '') => (region === 'United Kingdom' ? 'UK' : region);
const optionTextParts = (parts) => parts.filter(Boolean).join(' ');
const normalisedWords = (value) => normaliseTravelOptionText(value).split(' ').filter(Boolean);

const scoreTextField = (query, value, weight = 0) => {
  const text = normaliseTravelOptionText(value);
  if (!query || !text.includes(query)) return -1;
  if (text === query) return 120 + weight;
  if (text.startsWith(query)) return 100 + weight;
  if (normalisedWords(text).some((word) => word.startsWith(query))) return 84 + weight;
  return 38 + weight;
};

const bestFieldScore = (query, fields = []) => fields.reduce((best, field) => Math.max(best, scoreTextField(query, field.value, field.weight)), -1);

export const airportSearchText = (airportOption = {}) => normaliseTravelOptionText(optionTextParts([
  airportOption.label,
  airportOption.label ? `${airportOption.label} Airport` : '',
  airportOption.airportCity,
  airportOption.iataCode,
  airportOption.countryRegion,
  airportOption.group,
]));

export const airportResultLabel = (airportOption = {}) => `${airportOption.label || ''}${airportOption.iataCode ? ` (${airportOption.iataCode})` : ''}`.trim();
export const airportResultMeta = (airportOption = {}) => compactRegionLabel(airportOption.countryRegion || airportOption.group || '');
export const airportComboboxValue = (airportOption = {}) => airportResultLabel(airportOption) || airportOption.value || '';

export const destinationSearchText = (destinationOption = {}) => normaliseTravelOptionText(optionTextParts([
  destinationOption.label,
  destinationOption.countryRegion,
  destinationOption.group,
  ...(destinationOption.aliases || []),
  ...(destinationOption.tags || []),
  ...(destinationOption.tags || []).map((tag) => tagLabels[tag] || tag),
]));

export const destinationTagLabel = (tag) => tagLabels[tag] || `${tag || ''}`.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
export const destinationResultMeta = (destinationOption = {}) => [
  destinationOption.countryRegion,
  (destinationOption.tags || []).slice(0, 3).map(destinationTagLabel).join(' / '),
].filter(Boolean).join(' · ');
export const destinationComboboxValue = (destinationOption = {}) => destinationOption.value || destinationOption.label || '';

export const popularDestinationSuggestions = popularDestinationChips
  .map((label) => destinationSuggestions.find((option) => normaliseTravelOptionText(option.label) === normaliseTravelOptionText(label)))
  .filter(Boolean);

export function searchAirportOptions(query = '', { limit = 10, includeGroupsWhenEmpty = false } = {}) {
  const normalisedQuery = normaliseTravelOptionText(query);
  if (!normalisedQuery) {
    const grouped = departureAirportGroups.map((group) => ({
      ...group,
      options: group.options.map((option) => ({ ...option, groupLabel: group.label })),
    }));
    if (includeGroupsWhenEmpty) return grouped;
    return grouped.flatMap((group) => group.options).slice(0, limit);
  }

  return departureAirports
    .map((option, index) => {
      const score = bestFieldScore(normalisedQuery, [
        { value: option.iataCode, weight: 22 },
        { value: option.label, weight: 18 },
        { value: `${option.label} Airport`, weight: 18 },
        { value: option.airportCity, weight: 14 },
        { value: option.countryRegion, weight: 2 },
        { value: option.group, weight: 0 },
        { value: airportSearchText(option), weight: -20 },
      ]);
      return { ...option, score, originalIndex: index };
    })
    .filter((option) => option.score >= 0)
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
    .slice(0, limit);
}

export function searchDestinationOptions(query = '', { limit = 10, popularWhenEmpty = true } = {}) {
  const normalisedQuery = normaliseTravelOptionText(query);
  if (!normalisedQuery) return (popularWhenEmpty ? popularDestinationSuggestions : destinationSuggestions).slice(0, limit);

  return destinationSuggestions
    .map((option, index) => {
      const score = bestFieldScore(normalisedQuery, [
        { value: option.label, weight: 20 },
        ...(option.aliases || []).map((alias) => ({ value: alias, weight: 18 })),
        { value: option.countryRegion, weight: 6 },
        ...(option.tags || []).map((tag) => ({ value: tag, weight: 5 })),
        ...(option.tags || []).map((tag) => ({ value: tagLabels[tag] || tag, weight: 5 })),
        { value: option.group, weight: 0 },
        { value: destinationSearchText(option), weight: -24 },
      ]);
      return { ...option, score, originalIndex: index };
    })
    .filter((option) => option.score >= 0)
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
    .slice(0, limit);
}

export const destinationGroups = [...new Set(destinationSuggestions.map((item) => item.group))].map((label) => ({
  label,
  destinations: destinationSuggestions.filter((item) => item.group === label).map((item) => item.label),
}));

export const departureAirportGroups = [...new Set(departureAirports.map((item) => item.group))].map((label) => ({
  label,
  options: departureAirports.filter((item) => item.group === label),
}));
