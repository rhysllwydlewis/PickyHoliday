import React from 'react';
import { BriefcaseBusiness, CalendarDays, ChevronRight, Clock3, HeartHandshake, Hotel, MapPin, Plane, Users } from 'lucide-react';
import { addDaysToIsoDate, applySmartHolidaySearchField } from '../../services/search/holidaySearchCriteria.js';
import { fieldOptions } from '../../app/appConstants.js';
import { airportComboboxValue, airportResultLabel, airportResultMeta, destinationComboboxValue, destinationResultMeta, normaliseTravelOptionText, popularDestinationChips, searchAirportOptions, searchDestinationOptions } from '../../data/travelOptions.js';
import { SmartTravelField } from './SmartTravelField.jsx';

const searchTabs = [
  ['Holidays', Plane, true],
  ['Villas', Hotel],
  ['Group hotel stays', Users, 'NEW'],
  ['Stag & Hen', BriefcaseBusiness],
  ['Families', HeartHandshake],
];
function renderSelectOption(option) {
  const value = option.value ?? option.label ?? option;
  const label = option.label ?? option;
  const iata = option.iataCode ? ` (${option.iataCode})` : '';
  const region = option.countryRegion && option.countryRegion !== option.label ? ` · ${option.countryRegion}` : '';
  return <option key={`${value}-${option.iataCode || ''}`} value={value}>{label}{iata}{region}</option>;
}

function SearchInput({ icon: Icon, label, name, value, onChange, type = 'text', placeholder = '', min, max, options, className = '' }) {
  const input = options ? (
    <select name={name} value={value} onChange={(event) => onChange(name, event.target.value)}>
      {options.map((option) => (
        option.options
          ? <optgroup key={option.label} label={option.label}>{option.options.map(renderSelectOption)}</optgroup>
          : renderSelectOption(option)
      ))}
    </select>
  ) : (
    <input name={name} type={type} min={min} max={max} value={value ?? ''} onChange={(event) => onChange(name, event.target.value)} placeholder={placeholder} />
  );
  return (
    <label className={`field compact-field ${className}`.trim()}>
      <span>{label}</span>
      <p>{input}{Icon && <Icon size={17} />}</p>
    </label>
  );
}

export function SearchPanel({ activeTab, setActiveTab, search, setSearch, onSearch, isLoading = false, locationSuggestions, onLookupLocations }) {
  const lookupLocationsRef = React.useRef(onLookupLocations);
  React.useEffect(() => { lookupLocationsRef.current = onLookupLocations; }, [onLookupLocations]);

  const updateSearchField = (name, value) => {
    setSearch((currentSearch) => applySmartHolidaySearchField(currentSearch, name, value));
  };

  React.useEffect(() => {
    const keyword = `${search.destination || ''}`.trim();
    if (keyword.length < 3) return undefined;
    const timeout = window.setTimeout(() => lookupLocationsRef.current(keyword), 250);
    return () => window.clearTimeout(timeout);
  }, [search.destination]);

  const airportOptions = React.useMemo(() => searchAirportOptions(search.originAirport, { limit: 10 }), [search.originAirport]);
  const groupedAirportOptions = React.useMemo(() => searchAirportOptions('', { includeGroupsWhenEmpty: true }), []);
  const destinationOptions = React.useMemo(() => {
    const localOptions = searchDestinationOptions(search.destination, { limit: 10 });
    const query = normaliseTravelOptionText(search.destination);
    if (!query) return localOptions;
    const providerOptions = (locationSuggestions || [])
      .filter((location) => !localOptions.some((item) => normaliseTravelOptionText(item.label) === normaliseTravelOptionText(location.cityName || location.name)))
      .slice(0, Math.max(0, 10 - localOptions.length))
      .map((location) => ({ ...location, label: location.name, value: location.cityName || location.name, countryRegion: location.iataCode || 'Provider' }));
    return [...localOptions, ...providerOptions];
  }, [locationSuggestions, search.destination]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const minimumReturnDate = addDaysToIsoDate(search.departureDate, 1) || todayIso;
  const departureDateMin = search.departureDate && search.departureDate < todayIso ? undefined : todayIso;
  const returnDateMin = search.returnDate && search.returnDate < minimumReturnDate ? undefined : minimumReturnDate;

  return (
    <section className="search-panel composer-search-panel" id="search">
      <div className="tabs" role="tablist" aria-label="Holiday type">
        {searchTabs.map(([tab, Icon, flag]) => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => { setActiveTab(tab); updateSearchField('intent', tab); }}
            role="tab"
            aria-selected={activeTab === tab}
          >
            <Icon size={16} />
            {tab}
            {flag === 'NEW' && <em>NEW</em>}
          </button>
        ))}
      </div>
      <form className="fields composer-fields" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
        <SmartTravelField
          icon={MapPin}
          label="Destination"
          name="destination"
          value={search.destination}
          placeholder="Destination, resort or hotel"
          options={destinationOptions}
          onChange={updateSearchField}
          onBlur={(value) => onLookupLocations(value)}
          getOptionValue={destinationComboboxValue}
          getOptionLabel={(option) => option.label || option.name || ''}
          getOptionMeta={destinationResultMeta}
          className="destination-field"
          emptyHint="Try a resort, city, country or trip style"
        />
        <SmartTravelField
          icon={Plane}
          label="From / departure airport"
          name="originAirport"
          value={search.originAirport}
          placeholder="Airport or IATA code"
          options={airportOptions}
          groupedOptions={groupedAirportOptions}
          showGroupsWhenEmpty
          onChange={updateSearchField}
          getOptionValue={airportComboboxValue}
          getOptionLabel={airportResultLabel}
          getOptionMeta={airportResultMeta}
          className="airport-field compact-field"
          emptyHint="Start typing an airport, city or IATA code"
        />
        <SearchInput label="Depart" name="departureDate" type="date" min={departureDateMin} value={search.departureDate} onChange={updateSearchField} className="depart-field" />
        <SearchInput label="Return" name="returnDate" type="date" min={returnDateMin} value={search.returnDate} onChange={updateSearchField} className="return-field" />
        <SearchInput icon={Users} label="Adults" name="adults" type="number" min="1" max="60" value={search.adults} onChange={updateSearchField} className="adult-field" />
        <SearchInput icon={Users} label="Children" name="children" type="number" min="0" max="60" value={search.children} onChange={updateSearchField} className="children-field" />
        <SearchInput icon={Hotel} label="Rooms" name="rooms" type="number" min="1" max="30" value={search.rooms} onChange={updateSearchField} className="rooms-field" />
        <SearchInput icon={Clock3} label="Nights" name="nights" type="number" min="1" max="60" value={search.nights} onChange={updateSearchField} className="nights-field" />
        <SearchInput icon={CalendarDays} label="Date flexibility" name="dateFlexibilityDays" value={search.dateFlexibilityDays} options={fieldOptions.flexibility} onChange={updateSearchField} className="flexibility-field" />
        <button
          className={`searchbtn composer-searchbtn search-action-field${isLoading ? ' searchbtn--loading' : ''}`}
          type="submit"
          aria-label={isLoading ? 'Searching…' : 'Search ideas'}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="searchbtn-sun" viewBox="0 0 20 20" fill="none" aria-hidden="true" width="20" height="20">
                <circle cx="10" cy="10" r="4" fill="#08234c" opacity="0.9" />
                {[0,45,90,135,180,225,270,315].map((deg, i) => {
                  const r = deg * Math.PI / 180;
                  return (
                    <line key={i}
                      x1={10 + Math.cos(r) * 5.5} y1={10 + Math.sin(r) * 5.5}
                      x2={10 + Math.cos(r) * 7.5} y2={10 + Math.sin(r) * 7.5}
                      stroke="#08234c" strokeWidth="1.6" strokeLinecap="round"
                    />
                  );
                })}
              </svg>
              <span>Searching…</span>
            </>
          ) : (
            <>Search ideas <ChevronRight size={20} /></>
          )}
        </button>
      </form>
      <div className="popular">
        <span>Popular:</span>
        {popularDestinationChips.map((destination) => (
          <button key={destination} onClick={() => updateSearchField('destination', destination)}>{destination}</button>
        ))}
      </div>
    </section>
  );
}
