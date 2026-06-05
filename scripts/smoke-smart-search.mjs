import assert from 'node:assert/strict';
import { applySmartHolidaySearchField } from '../src/services/search/holidaySearchCriteria.js';
import {
  airportResultLabel,
  destinationComboboxValue,
  searchAirportOptions,
  searchDestinationOptions,
} from '../src/data/travelOptions.js';

const labels = (items) => items.map((item) => item.label);
const airportLabels = (query) => searchAirportOptions(query, { limit: 10 }).map(airportResultLabel);
const destinationLabels = (query) => labels(searchDestinationOptions(query, { limit: 10 }));

assert(airportLabels('Car').some((label) => label.includes('Cardiff') && label.includes('CWL')), '“Car” should return Cardiff airport');
assert(airportLabels('CWL').some((label) => label.includes('Cardiff') && label.includes('CWL')), '“CWL” should return Cardiff airport');
assert(airportLabels('Gat').some((label) => label.includes('London Gatwick') && label.includes('LGW')), '“Gat” should return London Gatwick');
assert(airportLabels('AMS').some((label) => label.includes('Amsterdam') && label.includes('AMS')), '“AMS” should return Amsterdam');
const malMatches = destinationLabels('Mal');
for (const expected of ['Malta', 'Malaga', 'Majorca', 'Lake Garda']) {
  assert(malMatches.includes(expected), `“Mal” should suggest ${expected}`);
}
assert(destinationLabels('Zak').includes('Zante'), '“Zak” should suggest Zante via Zakynthos alias');
assert(destinationLabels('Mallorca').includes('Majorca'), '“Mallorca” should suggest Majorca');

const groupedAirports = searchAirportOptions('', { includeGroupsWhenEmpty: true });
assert(groupedAirports.length > 1, 'Empty airport focus should return grouped airport sections');
assert(groupedAirports.some((group) => group.label === 'UK' && group.options.some((option) => option.label === 'Cardiff')), 'Grouped airport list should include Cardiff in UK');

const starterDestinations = searchDestinationOptions('', { limit: 10 });
assert(starterDestinations.length > 0, 'Empty destination focus should return popular destination suggestions');
assert(starterDestinations.some((option) => destinationComboboxValue(option) === 'Ibiza'), 'Popular destination suggestions should include Ibiza');

const withDeparture = applySmartHolidaySearchField({ nights: 7 }, 'departureDate', '2026-07-01');
assert.equal(withDeparture.returnDate, '2026-07-08', 'Departure date should auto-fill return date from nights');

const changedDeparture = applySmartHolidaySearchField({ departureDate: '2026-07-01', returnDate: '2026-07-10', nights: 7 }, 'departureDate', '2026-07-03');
assert.equal(changedDeparture.nights, 7, 'Changing departure should keep future return date and recalculate nights');

const withReturn = applySmartHolidaySearchField(withDeparture, 'returnDate', '2026-07-12');
assert.equal(withReturn.nights, 11, 'Return date should update nights');

const withNights = applySmartHolidaySearchField(withReturn, 'nights', 5);
assert.equal(withNights.returnDate, '2026-07-06', 'Changing nights should update return date');

const withSmallerParty = applySmartHolidaySearchField({ adults: 4, children: 0, rooms: 4 }, 'adults', 2);
assert.equal(withSmallerParty.rooms, 2, 'Rooms should shrink when party size becomes smaller than room count');

const withTooManyRooms = applySmartHolidaySearchField({ adults: 2, children: 0, rooms: 1 }, 'rooms', 5);
assert.equal(withTooManyRooms.rooms, 2, 'Rooms should not exceed party size when changed directly');

console.log('Smart search smoke assertions passed');
