export interface District {
  id: string;
  name: string;
  state: string;
  url: string;
}

export const DISTRICTS: District[] = [
  // Virginia
  { id: "fcps",      name: "Fairfax County Public Schools",      state: "VA", url: "https://sis.fcps.edu/" },
  { id: "lcps",      name: "Loudoun County Public Schools",      state: "VA", url: "https://portal.lcps.org/" },
  { id: "pwcs",      name: "Prince William County Schools",      state: "VA", url: "https://sis.pwcs.edu/" },
  { id: "aps",       name: "Arlington Public Schools",           state: "VA", url: "https://sis.apsva.us/" },
  { id: "aacps",     name: "Alexandria City Public Schools",     state: "VA", url: "https://sis.acps.k12.va.us/" },
  // Maryland
  { id: "mcps",      name: "Montgomery County Public Schools",   state: "MD", url: "https://md-mcps-psv.edupoint.com/" },
  { id: "pgcps",     name: "Prince George's County Schools",     state: "MD", url: "https://md-pgcps-psv.edupoint.com/" },
  { id: "hcpss",     name: "Howard County Public Schools",       state: "MD", url: "https://md-hcpss-psv.edupoint.com/" },
  // Washington
  { id: "bsd",       name: "Bellevue School District",          state: "WA", url: "https://wa-bsd405-psv.edupoint.com/" },
  { id: "lwsd",      name: "Lake Washington School District",   state: "WA", url: "https://wa-lwsd-psv.edupoint.com/" },
  // California
  { id: "lausd",     name: "Los Angeles Unified",               state: "CA", url: "https://ca-lausd-psv.edupoint.com/" },
  { id: "sdusd",     name: "San Diego Unified",                 state: "CA", url: "https://ca-sdusd-psv.edupoint.com/" },
  // Arizona
  { id: "dvusd",     name: "Deer Valley Unified",               state: "AZ", url: "https://az-dvusd-psv.edupoint.com/" },
  { id: "cusd",      name: "Chandler Unified",                  state: "AZ", url: "https://az-cusd80-psv.edupoint.com/" },
];

export function getDistrictById(id: string): District | undefined {
  return DISTRICTS.find((d) => d.id === id);
}
