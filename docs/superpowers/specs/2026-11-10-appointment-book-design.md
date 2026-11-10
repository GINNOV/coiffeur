# Appointment book for two stylists

A phone web app for one Italian salon. Two people share one day book, and each client has a card. The first version replaces the paper or WhatsApp book. It does not take payments, send reminders, or offer a public booking page.

The interface is Italian only. Dates use `it-IT`. The clock is 24-hour. The time zone is `Europe/Rome`. There is no language switch.

## Who uses it

Two stylists, each with a phone. Both open the same site, enter one 4-digit PIN, and edit either column. A correct PIN sets an httpOnly session cookie that expires 30 days after that entry. The session also stores the PIN version. Changing the PIN in Impostazioni bumps that version, so cookies from the previous PIN stop working.

There are no personal accounts. Impostazioni lets either person rename the columns and change the PIN.

## Screens

**Accesso.** One field for a 4-digit PIN and the button Entra. A wrong PIN, or a value that is not 4 digits, shows "PIN non valido" and does not open the day.

**Giorno.** Today is the default. Arrows move one calendar day at a time. The heading is the weekday and date in Italian, for example "martedì 10 novembre".

Open days show two columns side by side. The columns start as Poltrona 1 and Poltrona 2. A block shows the client name and, when present, the service. A tap opens the appointment. Empty slots are tappable.

Monday and Sunday show "Chiuso" and do not accept a new appointment. Past and future open days stay editable, so a visit can be marked Fatto after it happened.

**Appointment sheet.** Opens from an empty slot or from Cliente di passaggio on that column. Each column has its own Cliente di passaggio. Fields are nome, telefono, servizio, durata, and stato. Salva writes the visit. Chiudi discards the sheet. A poll while the sheet is open does not overwrite what the stylist has typed.

**Scheda cliente.** Nome, telefono, and nota. The nota is one free-text field for the usual cut, the colour formula, or an allergy. Under the nota, Visite lists linked appointments, newest first: date, stylist, service, status. The list includes Annullato and Non venuto.

**Impostazioni.** The two column names, up to 40 characters each, and a PIN change. An empty column name is refused with "Scrivi un nome". The PIN change asks for the current PIN, the new 4-digit PIN, and the new PIN again. If the two new values differ, the screen shows "I due PIN non coincidono" and keeps the old PIN. Opening hours are not a setting.

## The working day

Open Tuesday to Saturday, 09:00 to 19:00, in Europe/Rome. The grid steps by 15 minutes. The last start is 18:45. A start at 19:00 is refused. A visit that starts at or before 18:45 may end after 19:00, and the column grows so that end stays visible.

Durations are 30, 45, 60, 90, and 120 minutes. The default is 30. The default status is Prenotato.

Cliente di passaggio opens the sheet on that column. The start snaps down to the current 15-minute boundary. Before 09:00, after 18:45, or on a closed day, the app shows "Chiuso" and does not open a savable sheet.

## What a visit stores

A visit stores the stylist, the start, the duration, the service text, the status, and an optional client. Nome and servizio may each be empty, but not both. If both are empty, Salva shows "Scrivi un nome o un servizio".

The database stores status codes. The screen shows the Italian label.

- `prenotato` shows Prenotato, `in_salone` shows In salone, and `fatto` shows Fatto. These three block that stylist's column from the start until the start plus the duration.
- `annullato` shows Annullato, and `non_venuto` shows Non venuto. These two do not block. The slot can be booked again. The visit remains on the client card.

Touching ranges are half-open. A visit that ends at 10:30 and a visit that starts at 10:30 on the same column both stand. Overlap on the same column is refused with "Orario già occupato", and the existing visit stays. The other column is independent. Editing a visit uses the same rule and ignores the visit being saved.

There is no drag and drop and no hard delete. Moving means changing the stylist, the start, or the duration on the sheet, then saving. Cancelling means Annullato.

## Clients

A card exists only when the visit has a name.

Search runs while typing the name. The match is a case-insensitive substring on the name. If the query contains digits, those digits also match the phone. Each row shows the phone and the date of the last visit, so two people with the same name stay distinct. The list shows at most 8 rows. Tapping a row attaches that card. The sheet then shows that card's phone and does not edit it.

If the name matches nothing, and the phone digits match no existing card, Salva creates a card with that name, the typed phone, and an empty nota.

If the typed phone's digits match an existing card, Salva does not create a second card and does not attach the card silently. The sheet shows "Esiste già un cliente con questo numero" and the button Usa questo cliente. That button attaches the matching card. Clearing the phone and saving creates a new card with the typed name and no phone.

Empty phone numbers do not match each other.

Editing the name, the phone, or the nota happens on the scheda cliente. Saving a phone whose digits belong to another card is refused with "Esiste già un cliente con questo numero". Every visit that points at the card keeps pointing at it. There is no delete. A mistaken card is corrected in place.

A visit saved with no name can gain a name later from the appointment sheet. That save then creates or attaches a card. Clearing the name on the sheet detaches the card. The card itself remains.

The booking sheet never rewrites an attached card.

## Two phones, one book

While Giorno is visible, each phone reloads the day every 10 seconds, and again when the browser tab becomes visible. A successful save reloads the day too.

Saving a visit sends the `updated_at` the phone last loaded. The database applies the update only when that value still matches. If it does not, the phone shows "Questo appuntamento è cambiato" and reloads the visit. The stale edit is discarded.

If the request fails for lack of network, nothing is stored. The phone shows "Nessuna connessione. Modifica non salvata." The app does not queue the edit.

## Data

One salon row. The PIN is stored only as a hash, with a version integer that starts at 1. The first seed reads `SALON_PIN`, which must be 4 digits, and only when no salon exists. If `SALON_PIN` is missing, the seed stops. After the seed, Impostazioni is the only way to change the PIN, and each change adds 1 to the version.

Two stylist rows, positions 0 and 1, names Poltrona 1 and Poltrona 2 until renamed.

A client row stores the salon, the name, the phone as typed, the phone reduced to digits, the nota, and timestamps. Among clients with a non-empty digit string, those digits are unique inside the salon.

A visit row stores the salon, the stylist, the optional client, `starts_at` as a timestamp with time zone, the duration in minutes, the service, the status code, and `updated_at`. A partial exclusion constraint stops two blocking visits for the same stylist from overlapping. Blocking codes are `prenotato`, `in_salone`, and `fatto`. The range is half-open.

## Pieces

**Calendar rules.** Given a calendar date in Europe/Rome, answers whether the day is closed and lists the legal start times, 09:00 through 18:45. No database.

**Booking rules.** Given the candidate visit, the other blocking visits for that stylist, and the open-day rules, accepts or refuses the save. Ignores the candidate's own id. No database.

**Session.** Checks the PIN against the hash and sets the cookie. Every other action requires that cookie.

**Day query.** Given a date, returns the closed flag or the two stylists with their visits.

**Client directory.** Search, create, phone clash, and edit of name, phone, and nota. Visit history is the visits that point at the card.

**Italian copy.** One module holds the strings in this spec. Screens read from it.

## Stack

Next.js with TypeScript, one Postgres database, deployed so both phones use the same data. The intended host is Vercel and the intended database is Neon. Local development uses the same schema through a Postgres connection string.

## Tests

Automated tests cover the booking rules and the client rules:

- A wrong PIN, or a PIN that is not 4 digits, does not open a session.
- After a PIN change, a session cookie from the previous PIN version does not open the day.
- Two blocking visits on the same stylist that overlap are refused.
- The same times on the other stylist are accepted.
- A visit ending at 10:30 and another starting at 10:30 on the same stylist are accepted.
- Annullato and Non venuto leave the time free. Fatto still blocks it.
- Monday, Sunday, a start before 09:00, and a start at 19:00 are refused.
- A start at 18:30 with a duration of 60 minutes is accepted.
- An update that carries an old `updated_at` is refused.
- A name with no match creates one card. A digit-matching phone does not create a second card.
- Two cards with the same name can both exist.
- A visit with no name creates no card.
- A visit with neither name nor service is refused.
- Editing the nota leaves existing visits attached to the same card.
- Saving a card phone whose digits belong to another card is refused.
- Clearing the name on a visit that still has a service detaches the card and leaves the card in the directory.

The day screen is checked in a phone-width browser: enter with the PIN, book on each column, hit an occupied slot, mark Non venuto, book that slot again, open the card, and read the Italian strings above.

## Out of this version

Cash totals, reminders, a public booking page, card payments, product stock, payroll, a third stylist, an offline queue, separate logins, editable hours, a language switch, photos, and deleting a client or a visit.
