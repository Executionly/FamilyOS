import countries from 'world-countries';

export const COUNTRIES = countries
  .map((c) => ({
    name: c.name.common,
    code: c.cca2,
    flag: c.flag,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));