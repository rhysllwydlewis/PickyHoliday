import React from 'react';
import { BriefcaseBusiness, CalendarDays, ChevronRight, Clock3, HeartHandshake, Hotel, MapPin, Plane, Users } from 'lucide-react';
import { normaliseHolidaySearchCriteria } from '../../services/search/holidaySearchCriteria.js';
import { fieldOptions } from '../../app/appConstants.js';
import { destinationSuggestions, normaliseTravelOptionText, popularDestinationChips } from '../../data/travelOptions.js';

const searchTabs = [
  ['Holidays', Plane, true],
  ['Villas', Hotel],
  ['Group hotel stays', Users, 'NEW'],
  ['Stag & Hen', BriefcaseBusiness],
  ['Families', HeartHandshake],
];
const destinationSuggestionListId = 'destination-suggestions';
const destinationDatalistId = 'destination-options';

const normaliseMatchText = normaliseTravelOptionText;
const searchableDestinationText = (destination) => normaliseMatchText([
  destination.label,
  destination.countryRegion,
  destination.group,
  ...(destination.aliases || []),
  ...(destination.tags || []),
].join(' '));

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

function DestinationSuggestionButton({ destination, onSelect, source = 'Local' }) {
  return (
    <button type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(destination.value || destination.label || destination.cityName || destination.name)}>
      <span>{destination.label || destination.name}</span>
      <b>{source === 'Local' ? destination.countryRegion || destination.group : destination.iataCode || source}</b>
    </button>
  );
}

export function SearchPanel({ activeTab, setActiveTab, search, setSearch, onSearch, locationSuggestions, onLookupLocations }) {
  const lookupLocationsRef = React.useRef(onLookupLocations);
  React.useEffect(() => { lookupLocationsRef.current = onLookupLocations; }, [onLookupLocations]);

  const updateSearchField = (name, value) => {
    setSearch((currentSearch) => normaliseHolidaySearchCriteria({ ...currentSearch, [name]: value }));
  };

  React.useEffect(() => {
    const keyword = `${search.destination || ''}`.trim();
    if (keyword.length < 3) return undefined;
    const timeout = window.setTimeout(() => lookupLocationsRef.current(keyword), 250);
    return () => window.clearTimeout(timeout);
  }, [search.destination]);

  const localDestinationMatches = React.useMemo(() => {
    const query = normaliseMatchText(search.destination);
    if (!query) return [];
    return destinationSuggestions
      .filter((destination) => searchableDestinationText(destination).includes(query))
      .slice(0, 6);
  }, [search.destination]);

  const providerSuggestions = React.useMemo(() => locationSuggestions
    .filter((location) => !localDestinationMatches.some((item) => normaliseMatchText(item.label) === normaliseMatchText(location.cityName || location.name)))
    .slice(0, 3), [locationSuggestions, localDestinationMatches]);
  const hasSuggestions = localDestinationMatches.length > 0 || providerSuggestions.length > 0;

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
        <label className="field big destination-field">
          <span>Destination</span>
          <p>
            <MapPin size={18} />
            <input
              value={search.destination}
              onChange={(event) => updateSearchField('destination', event.target.value)}
              onBlur={() => onLookupLocations(search.destination)}
              placeholder="Destination, resort or hotel"
              aria-autocomplete="list"
              aria-controls={destinationSuggestionListId}
              aria-expanded={hasSuggestions}
              list={destinationDatalistId}
            />
            <datalist id={destinationDatalistId}>
              {destinationSuggestions.map((destination) => <option key={destination.label} value={destination.label} />)}
            </datalist>
          </p>
          {hasSuggestions && (
            <div className="location-suggestions" id={destinationSuggestionListId} role="listbox" aria-label="Destination suggestions">
              {localDestinationMatches.map((destination) => (
                <DestinationSuggestionButton key={destination.label} destination={destination} onSelect={(value) => updateSearchField('destination', value)} />
              ))}
              {providerSuggestions.map((location) => (
                <DestinationSuggestionButton key={location.id} destination={{ ...location, label: location.name, value: location.cityName || location.name }} source="Provider" onSelect={(value) => updateSearchField('destination', value)} />
              ))}
            </div>
          )}
        </label>
        <SearchInput icon={Plane} label="From / departure airport" name="originAirport" value={search.originAirport} options={fieldOptions.origin} onChange={updateSearchField} className="airport-field" />
        <SearchInput label="Depart" name="departureDate" type="date" value={search.departureDate} onChange={updateSearchField} className="depart-field" />
        <SearchInput label="Return" name="returnDate" type="date" value={search.returnDate} onChange={updateSearchField} className="return-field" />
        <SearchInput icon={Users} label="Adults" name="adults" type="number" min="1" max="60" value={search.adults} onChange={updateSearchField} className="adult-field" />
        <SearchInput icon={Users} label="Children" name="children" type="number" min="0" max="60" value={search.children} onChange={updateSearchField} className="children-field" />
        <SearchInput icon={Hotel} label="Rooms" name="rooms" type="number" min="1" max="30" value={search.rooms} onChange={updateSearchField} className="rooms-field" />
        <SearchInput icon={Clock3} label="Nights" name="nights" type="number" min="1" max="60" value={search.nights} onChange={updateSearchField} className="nights-field" />
        <SearchInput icon={CalendarDays} label="Date flexibility" name="dateFlexibilityDays" value={search.dateFlexibilityDays} options={fieldOptions.flexibility} onChange={updateSearchField} className="flexibility-field" />
        <button className="searchbtn composer-searchbtn search-action-field" type="submit">Search ideas <ChevronRight size={20} /></button>
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
