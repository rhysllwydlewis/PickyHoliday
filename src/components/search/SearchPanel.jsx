import React from 'react';
import { BriefcaseBusiness, CalendarDays, ChevronRight, Clock3, HeartHandshake, Hotel, MapPin, Plane, Users, WalletCards } from 'lucide-react';
import { criteriaToSearchParams, normaliseHolidaySearchCriteria } from '../../services/search/holidaySearchCriteria.js';
import { fieldOptions } from '../../app/appConstants.js';

const searchTabs = [
  ['Holidays', Plane, true],
  ['Villas', Hotel],
  ['Group hotel stays', Users, 'NEW'],
  ['Stag & Hen', BriefcaseBusiness],
  ['Families', HeartHandshake],
];

function SearchInput({ icon: Icon, label, name, value, onChange, type = 'text', placeholder = '', min, options }) {
  const input = options ? (
    <select name={name} value={value} onChange={(event) => onChange(name, event.target.value)}>
      {options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}
    </select>
  ) : (
    <input name={name} type={type} min={min} value={value ?? ''} onChange={(event) => onChange(name, event.target.value)} placeholder={placeholder} />
  );
  return (
    <label className="field compact-field">
      <span>{label}</span>
      <p>{input}<Icon size={17} /></p>
    </label>
  );
}

export function SearchPanel({ activeTab, setActiveTab, search, setSearch, onSearch, locationSuggestions, onLookupLocations }) {
  const updateSearchField = (name, value) => {
    setSearch((currentSearch) => normaliseHolidaySearchCriteria({ ...currentSearch, [name]: value }));
  };

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
            />
          </p>
          {locationSuggestions.length > 0 && (
            <div className="location-suggestions" aria-label="Location suggestions">
              {locationSuggestions.slice(0, 4).map((location) => (
                <button key={location.id} type="button" onClick={() => updateSearchField('destination', location.cityName || location.name)}>
                  {location.name} {location.iataCode && <b>{location.iataCode}</b>}
                </button>
              ))}
            </div>
          )}
        </label>
        <SearchInput icon={Plane} label="From" name="originAirport" value={search.originAirport} options={fieldOptions.origin} onChange={updateSearchField} />
        <SearchInput icon={CalendarDays} label="Depart" name="departureDate" type="date" value={search.departureDate} onChange={updateSearchField} />
        <SearchInput icon={CalendarDays} label="Return date" name="returnDate" type="date" value={search.returnDate} onChange={updateSearchField} />
        <SearchInput icon={Clock3} label="Nights" name="nights" type="number" min="1" value={search.nights} onChange={updateSearchField} />
        <SearchInput icon={CalendarDays} label="Flexibility" name="dateFlexibilityDays" value={search.dateFlexibilityDays} options={fieldOptions.flexibility} onChange={updateSearchField} />
        <SearchInput icon={Users} label="Party size" name="partySize" type="number" min="1" value={search.partySize} onChange={updateSearchField} />
        <SearchInput icon={Hotel} label="Rooms" name="rooms" type="number" min="1" value={search.rooms} onChange={updateSearchField} />
        <SearchInput icon={Users} label="Room mix" name="roomMix" value={search.roomMix} placeholder="e.g. twins + doubles" onChange={updateSearchField} />
        <SearchInput icon={WalletCards} label="Budget pp" name="budgetPerPerson" type="number" min="0" value={search.budgetPerPerson || ''} placeholder="Optional" onChange={updateSearchField} />
        <button className="searchbtn composer-searchbtn">Search ideas <ChevronRight size={20} /></button>
      </form>
      <div className="popular">
        <span>Popular:</span>
        {['Ibiza', 'Tenerife', 'Barcelona', 'Dubai', 'Ayia Napa', 'Zante', 'Benidorm'].map((destination) => (
          <button key={destination} onClick={() => updateSearchField('destination', destination)}>{destination}</button>
        ))}
      </div>
    </section>
  );
}

