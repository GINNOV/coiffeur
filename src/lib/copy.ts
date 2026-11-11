export const copy = {
  pinInvalid: "PIN non valido",
  pinMismatch: "I due PIN non coincidono",
  writeName: "Scrivi un nome",
  closed: "Chiuso",
  occupied: "Orario già occupato",
  stale: "Questo appuntamento è cambiato",
  offline: "Nessuna connessione. Modifica non salvata.",
  phoneTaken: "Esiste già un cliente con questo numero",
  emptyVisit: "Scrivi un nome o un servizio",
  useThisClient: "Usa questo cliente",
  walkIn: "Cliente di passaggio",
  enter: "Entra",
  save: "Salva",
  close: "Chiudi",
  settings: "Impostazioni",
  note: "Nota",
  visits: "Visite",
  status: {
    prenotato: "Prenotato",
    in_salone: "In salone",
    fatto: "Fatto",
    annullato: "Annullato",
    non_venuto: "Non venuto",
  },
  columnOne: "Poltrona 1",
  columnTwo: "Poltrona 2",
  nome: "Nome",
  telefono: "Telefono",
  servizio: "Servizio",
  durata: "Durata",
  stato: "Stato",
  pinCurrent: "PIN attuale",
  pinNew: "PIN nuovo",
  pinConfirm: "Ripeti il PIN",
  backToDay: "Agenda",
  salonBook: "Il libro del salone",
  mainNav: "Principale",
  footerNav: "Piè di pagina",
  reference: "Riferimento",
  shoot: "Scatta",
  shootStart: "Via",
  frameHint: "Metti il viso nella cornice",
  cameraBlocked: "La fotocamera non si apre",
  needFour: "Servono quattro foto",
  photoFailed: "Le foto non sono state salvate",
  noPhotos: "Nessuna foto di riferimento",
  photoOf: "Foto di riferimento",
} as const;

export type StatusCode = keyof typeof copy.status;

export const STATUS_CODES = [
  "prenotato",
  "in_salone",
  "fatto",
  "annullato",
  "non_venuto",
] as const satisfies readonly StatusCode[];

export function statusLabel(code: string): string {
  if (code in copy.status) return copy.status[code as StatusCode];
  return code;
}
