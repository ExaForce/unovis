export type Country = {
  id: string;
  label: string;
  color: string;
}

export type DataRecord = {
  year: number;
  us: number;
  cn?: number;
}

export const countries: Country[] = [{
  id: 'cn',
  label: 'China',
  color: 'var(--vis-color0)',
}, {
  id: 'us',
  label: 'USA',
  color: 'var(--vis-color1)',
}]

export const legendItems = [
  { name: 'undefined', value: undefined },
  { name: '0 or null', value: null },
  { name: '300M', value: 300 },
]

export const data = [
  {
    year: 1961,
    cn: 109.659976,
    us: 163.619978,
  },
  {
    year: 1962,
    cn: 120.421293,
    us: 162.45578,
  },
  {
    year: 1963,
    cn: 137.456233,
    us: 174.812487,
  },
  {
    year: 1964,
    cn: 152.356625,
    us: 160.937079,
  },
  {
    year: 1965,
    cn: 162.156281,
    us: 183.602617,
  },
  {
    year: 1966,
    cn: 177.613486,
    us: 184.44488,
  },
  {
    year: 1967,
    cn: 181.182167,
    us: 208.158055,
  },
  {
    year: 1968,
    cn: 177.133015,
    us: 202.538423,
  },
  {
    year: 1969,
    cn: 176.486754,
    us: 205.28817,
  },
  {
    year: 1970,
    us: 186.860751,
  },
  {
    year: 1971,
    us: 237.624461,
  },
  {
    year: 1972,
    us: 228.117866,
  },
  {
    year: 1973,
    us: 237.683006,
  },
  {
    year: 1974,
    us: 204.617505,
  },
  {
    year: 1975,
    us: 249.283743,
  },
  {
    year: 1976,
    us: 258.200097,
  },
  {
    year: 1977,
    us: 266.014469,
  },
  {
    year: 1978,
    us: 276.602542,
  },
  {
    year: 1979,
    us: 302.62558,
  },
  {
    year: 1980,
    cn: 280.287437,
    us: 269.883982,
  },
  {
    year: 1981,
    cn: 286.450038,
    us: 330.889528,
  },
  {
    year: 1982,
    cn: 315.36405,
    us: 333.103755,
  },
  {
    year: 1983,
    cn: 345.626506,
    us: 207.657604,
  },
  {
    year: 1984,
    cn: 365.937335,
    us: 314.7495,
  },
  {
    year: 1985,
    cn: 339.877377,
    us: 347.118216,
  },
  {
    year: 1986,
    cn: 352.084647,
    us: 315.331216,
  },
  {
    year: 1987,
    cn: 359.240676,
    us: 280.494047,
  },
  {
    year: 1988,
    cn: 351.82429,
    us: 206.5281,
  },
  {
    year: 1989,
    cn: 367.63608,
    us: 284.238058,
  },
  {
    year: 1990,
    cn: 404.719096,
    us: 312.410604,
  },
  {
    year: 1991,
    cn: 398.896071,
    us: 280.063391,
  },
  {
    year: 1992,
    cn: 404.275226,
    us: 353.025147,
  },
  {
    year: 1993,
    cn: 407.930462,
    us: 259.105342,
  },
  {
    year: 1994,
    cn: 396.46012,
    us: 355.934924,
  },
  {
    year: 1995,
    cn: 418.664201,
    us: 277.60121,
  },
  {
    year: 1996,
    cn: 453.4393,
    us: 335.780123,
  },
  {
    year: 1997,
    cn: 445.931409,
    us: 336.582161,
  },
  {
    year: 1998,
    cn: 458.394739,
    us: 349.425744,
  },
  {
    year: 1999,
    cn: 455.192431,
    us: 335.364364,
  },
  {
    year: 2000,
    cn: 407.336509,
    us: 342.631506,
  },
  {
    year: 2001,
    us: 324.994634,
  },
  {
    year: 2002,
    us: 297.143452,
  },
  {
    year: 2003,
    us: 348.247631,
  },
  {
    year: 2004,
    us: 389.023763,
  },
  {
    year: 2005,
    us: 366.436346,
  },
  {
    year: 2006,
    cn: 452.800282,
    us: 338.3368,
  },
  {
    year: 2007,
    cn: 457.809418,
    us: 415.13086,
  },
  {
    year: 2008,
    cn: 480.12597,
    us: 402.399936,
  },
  {
    year: 2009,
    cn: 483.277147,
    us: 418.666166,
  },
  {
    year: 2010,
    cn: 497.920509,
    us: 401.12633,
  },
  {
    year: 2011,
    cn: 521.171808,
    us: 385.545256,
  },
  {
    year: 2012,
    cn: 541.163568,
    us: 356.210124,
  },
  {
    year: 2013,
    cn: 554.422547,
    us: 434.30845,
  },
  {
    year: 2014,
    cn: 559.325222,
    us: 442.84909,
  },
  {
    year: 2015,
    cn: 623.197344,
    us: 431.870788,
  },
  {
    year: 2016,
    cn: 618.011522,
    us: 503.465267,
  },
  {
    year: 2017,
    cn: 619.879237,
    us: 466.847085,
  },
  {
    year: 2018,
    cn: 612.170193,
    us: 467.95114,
  },
]