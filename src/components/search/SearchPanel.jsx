import React from 'react';
import { BriefcaseBusiness, CalendarDays, ChevronRight, Clock3, HeartHandshake, Hotel, MapPin, Plane, Users } from 'lucide-react';
import { normaliseHolidaySearchCriteria } from '../../services/search/holidaySearchCriteria.js';
import { fieldOptions } from '../../app/appConstants.js';

const searchTabs = [
  ['Holidays', Plane, true],
  ['Villas', Hotel],
  ['Group hotel stays', Users, 'NEW'],
  ['Stag & Hen', BriefcaseBusiness],
  ['Families', HeartHandshake],
];

function SearchInput({ icon: Icon, label, name, value, onChange, type = 'text', placeholder = '', min, max, options, className = '' }) {
  const input = options ? (
    <select name={name} value={value} onChange={(event) => onChange(name, event.target.value)}>
      {options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}
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
        <SearchInput icon={Plane} label="From / departure airport" name="originAirport" value={search.originAirport} options={fieldOptions.origin} onChange={updateSearchField} className="airport-field" />
        <SearchInput label="Depart" name="departureDate" type="date" value={search.departureDate} onChange={updateSearchField} className="depart-field" />
        <SearchInput label="Return" name="returnDate" type="date" value={search.returnDate} onChange={updateSearchField} className="return-field" />
        <SearchInput icon={Users} label="Adults" name="adults" type="number" min="1" max="60" value={search.adults} onChange={updateSearchField} className="adult-field" />
        <SearchInput icon={Users} label="Children" name="children" type="number" min="0" max="60" value={search.children} onChange={updateSearchField} className="children-field" />
        <SearchInput icon={Hotel} label="Rooms" name="rooms" type="number" min="1" max="30" value={search.rooms} onChange={updateSearchField} className="rooms-field" />
        <button className="searchbtn composer-searchbtn">Search ideas <ChevronRight size={20} /></button>
        <div className="advanced-search-row" aria-label="Secondary search options">
          <SearchInput icon={Clock3} label="Nights" name="nights" type="number" min="1" max="60" value={search.nights} onChange={updateSearchField} className="secondary-field" />
          <SearchInput icon={CalendarDays} label="Date flexibility" name="dateFlexibilityDays" value={search.dateFlexibilityDays} options={fieldOptions.flexibility} onChange={updateSearchField} className="secondary-field" />
        </div>
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

