export interface District {
  id: string;
  name: string;
  state: string;
  url: string;
}

export const DISTRICTS: District[] = [
  {
    id: "fcps",
    name: "Fairfax County Public Schools",
    state: "VA",
    url: "https://sis.fcps.edu/",
  },
  {
    id: "lcps",
    name: "Loudoun County Public Schools",
    state: "VA",
    url: "https://portal.lcps.org/",
  },
  {
    id: "pwcs",
    name: "Prince William County Schools",
    state: "VA",
    url: "https://sis.pwcs.edu/",
  },
  {
    id: "arlington",
    name: "Arlington Public Schools",
    state: "VA",
    url: "https://sis.apsva.us/",
  },
];

export function getDistrictById(id: string): District | undefined {
  return DISTRICTS.find((d) => d.id === id);
}
