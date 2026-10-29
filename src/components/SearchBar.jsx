import React from 'react';

function SearchBar({
  searchTerm,
  onSearchChange,
  placeholder = 'Search...',
  filters = [],
  onReset,
}) {
  const hasActiveFilters =
    Boolean(searchTerm) ||
    filters.some((f) => f.value !== '' && f.value !== 'All');

  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onSearchChange('')}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {filters && filters.length > 0 && (
        <div className="filters-wrapper">
          {filters.map((filter, index) => (
            <div key={index} className="filter-group">
              {filter.label && <label className="filter-label">{filter.label}</label>}
              <select
                className="filter-select"
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
              >
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {hasActiveFilters && onReset && (
            <button
              type="button"
              className="btn btn-outline btn-sm reset-filter-btn"
              onClick={onReset}
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
