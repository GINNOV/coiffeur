export type DayVisit = {
  id: string;
  stylistId: string;
  clientId: string | null;
  clientName: string;
  phone: string;
  service: string;
  status: string;
  start: string;
  durationMinutes: number;
  updatedAt: string;
};

export type DayStylist = {
  id: string;
  name: string;
  position: number;
  visits: DayVisit[];
};

export type DayPayload = {
  dateKey: string;
  heading: string;
  closed: boolean;
  prev: string;
  next: string;
  stylists: DayStylist[];
};

export type ClientHit = {
  id: string;
  name: string;
  phone: string;
  lastVisitDate: string | null;
};

export type ClientVisitRow = {
  id: string;
  when: string;
  dateKey: string;
  stylistName: string;
  service: string;
  status: string;
};

export type ClientDetail = {
  id: string;
  name: string;
  phone: string;
  note: string;
  visits: ClientVisitRow[];
};

export type ReferenceStrip = {
  id: string;
  shots: string[];
};

export type Clash = {
  id: string;
  name: string;
  phone: string;
};
