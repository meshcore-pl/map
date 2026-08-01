# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

Interaktywna mapa węzłów sieci MeshCore w Polsce i na świecie (`mapa.meshcorepolska.org`). Backend Node.js/Express + frontend w czystym JS (bez frameworka, bez buildera) oparty na Leaflet. Bazuje na danych z upstreamu `map.meshcore.dev`. Teksty w UI oraz komentarze w kodzie są po polsku.

## Komendy

- Uruchomienie serwera: `node .` (punkt wejścia to `index.js`, pakiet jest CommonJS)
- Lint: `npx eslint .` (flat config w `eslint.config.mjs`; ignoruje `public/vendor/**`)
- W repo nie ma testów.
- `npm run m` - aktualizacja zależności przez `ncu -u && npm install && npm update` (tylko do prac utrzymaniowych, nie do zwykłego developmentu)
- Produkcja działa pod PM2 jako proces `mcmap` (patrz `ecosystem.config.js`); `npm run update` robi pull, instalację produkcyjną i restart przez `pm2 restart mcmap`.
- Wymagana jest działająca instancja Redis oraz plik `.env` (kopia `.env.example`): `NODE_ENV`, `DOMAIN`, `PORT`, `SEFINEK_API` (bazowy URL API wysokościowego, udostępniany frontendowi), `REDIS_HOST`, `REDIS_PASSWD`.

## Architektura

### Backend (Express, CommonJS)

- `index.js` - punkt wejścia aplikacji. Podpina helmet, serwowanie plików statycznych z `public/`, logowanie morgan, globalny rate limiter (tylko produkcja) oraz middleware timeoutu. Uruchamia `startNodesRefreshJob()` z `services/nodes.js` już przy starcie, zanim serwer HTTP zacznie nasłuchiwać. `app.locals` udostępnia widokom EJS pola `domain`, `v` (wersja z package.json) i `sefinekApi`.
- `routes/Index.js` - renderuje `views/index.ejs` (mapa) oraz `views/test.ejs` (panel podglądu ikon/toastów z `noindex`, nigdzie w UI nie zalinkowany).
- `routes/Api.js` - `GET /api/v1/nodes` (binarny payload węzłów w msgpack, `?region=pl|all`, domyślnie `pl`) oraz `GET /api/v1/repeater-stats` (JSON z liczbą repeaterów, CORS `*`, wykorzystywane przez zewnętrzne strony jak meshcorepolska.org).
- `services/nodes.js` - właściwa warstwa danych:
  - Pobiera cały zbiór węzłów z upstreamu (`map.meshcore.dev`) jako binarny msgpack, cyklicznie (`REFRESH_INTERVAL_MS` = 10 min, przy błędzie ponowna próba po 30s).
  - Wylicza podzbiór tylko dla Polski metodą point-in-polygon względem uproszczonej granicy Polski (uproszczonej algorytmem Douglas-Peucker z `services/data/poland-border.geojson` przy starcie modułu, przez `utils/geo.js`), z wstępnym filtrem bounding-box dla szybkości.
  - Trzyma oba regiony (`all`, `pl`) jako spakowane bufory w cache'u w pamięci procesu (źródło prawdy przy obsłudze żądań) i zapisuje je też do Redis jako trwały cache przetrwający restarty; awaria Redis nie wpływa na serwowanie z pamięci.
  - `getStats()` liczy i memoizuje statystyki repeaterów/typów/statusów na podstawie zbioru `pl`; memoizowany cache jest unieważniany przy każdym odświeżeniu.
  - Status węzła (`recent`/`stale`/`old`/`extinct`) jest wyliczany z wieku `updated_date` względem progów (5/10/20 dni) i dotyczy tylko węzłów, których `source` zaczyna się od `'u'`.
- `services/redis.js` - pojedynczy współdzielony klient Redis (baza nr 8), łączony jednorazowo przy imporcie.
- `services/axios.js` - współdzielona instancja axios z niestandardowym `User-Agent` wyliczanym z `package.json`; używana zarówno przez `services/nodes.js`, jak i `services/IndexNow.js`.
- `services/IndexNow.js` - samodzielny skrypt, **nie** podpięty do działającego serwera. Uruchamiany ręcznie, wysyła adresy z `public/sitemap.xml` do IndexNow API w paczkach; wymaga pliku weryfikacyjnego pod `public/<losowa-nazwa>.txt` zgodnego ze stałą `FILENAME` w tym skrypcie.
- `utils/geo.js` - ogólne funkcje geometryczne: upraszczanie pierścienia algorytmem Douglas-Peucker (`simplifyRing`, dzieli pierścień w najdalszym punkcie, bo Douglas-Peucker działa tylko na otwartych ścieżkach) oraz test point-in-polygon metodą ray-casting (`isPointInPolygon`).
- `utils/httpError.js` - jednolity helper `HttpError(res, status, err)`, używany zarówno w routach, jak i w globalnym handlerze błędów/404 w `index.js`.
- `middlewares/` - `ratelimit.js` (express-rate-limit, podpięty tylko na produkcji), `timeout.js` (express-timeout-handler, 15s), `morgan.js` (logowanie żądań, pomija bota monitorującego uptime po User-Agent).

### Frontend (czysty JS, moduły ES, bez buildera/bundlera)

- Punktem wejścia jest `public/js/map.js`, ładowany jako `<script type="module">` bezpośrednio z `views/index.ejs`, po wcześniej wczytanych, zvendorowanych `leaflet.js` i `leaflet.markercluster.js` (ładowane globalnie, nie jako moduły - `map.js` deklaruje `/* global L */`). MapLibre GL (dla warstwy bazowej OpenFreeMap) i jego plugin są doładowywane leniwie na żądanie z `public/vendor/maplibre/`.
- `views/index.ejs` wstrzykuje konfigurację z serwera do strony przez `window.MAP_CONFIG = { sefinekApi: ... }`, zanim wykona się jakikolwiek skrypt modułowy.
- Dane węzłów przychodzą z `/api/v1/nodes` jako strumieniowana binarna odpowiedź msgpack (dekodowana po stronie klienta zvendorowanym `msgpackr`); frontend pokazuje postęp pobierania w bajtach, bo odpowiedzi bywają duże, zwłaszcza dla `region=all`.
- `public/js/map.js` składa moduły funkcjonalne, z których każdy udostępnia fabrykę `init*` podpinającą własne elementy DOM (po ID, dopasowane do `views/index.ejs`) i zwracającą niewielki obiekt kontrolera:
  - `modal.js` - generyczna obsługa otwierania/zamykania/odrzucania modala/panelu (klawisz Escape, klik poza obszarem), używana przez wszystkie panele poniżej.
  - `legend.js`, `stats.js`, `changelog.js` - panel legendy, modal statystyk węzłów (z filtrowaniem po zakresie czasu) oraz zahardkodowana lista zmian.
  - `pathtools.js` - współdzielone prymitywy do rysowania na mapie sekwencji punktów/odcinków/dystansów (wykorzystywane zarówno przez narzędzie pomiaru, jak i trasy).
  - `measure.js` - narzędzie swobodnego pomiaru odległości wielopunktowego, zbudowane na `pathtools.js`.
  - `route.js` - rysuje trasę między węzłami rozpoznanymi po nazwie/kluczu na podstawie tekstu wpisanego przez użytkownika, zbudowane na `pathtools.js`.
  - `terrain.js` - analiza widoczności optycznej/profilu wysokościowego między dwoma punktami; pobiera próbki wysokości z wymiennego dostawcy (`sefinek` przez `SEFINEK_API`, `open-elevation` lub `open-meteo`) i liczy przesłonięcia wzdłuż trasy z uwzględnieniem krzywizny Ziemi.
  - `toast.js` - powiadomienia toast (w tym zamykalne toasty "akcji", np. po podświetleniu wyników wyszukiwania).
  - `node-utils.js` - funkcje formatujące związane z węzłami (konwersja bajt/hex, formatowanie daty/czasu, deterministyczne hashowanie koloru/etykiety na podstawie nazwy dla ikon węzłów typu klient).
- Narzędzia wymagające wskazania punktu na mapie współdzielą jeden slot "pickera" rejestrowany przez `setPicker` w `map.js`, więc tylko jedno narzędzie naraz może "nasłuchiwać" kliknięć na mapie/węźle.
- Stan po stronie klienta (`state` w `map.js`) steruje filtrowaniem (typ węzła, częstotliwość, progi dat) i jest zapisywany do `localStorage`; aktualny widok mapy, a opcjonalnie też aktywny stan narzędzia pomiaru/terenu, jest też odzwierciedlany w query string URL, żeby dało się nim podzielić.
- Klastrowanie markerów odtwarza `L.markerClusterGroup` od nowa przy zmianie progu zoomu klastrowania (`refreshMap`), bo ta opcja nie jest mutowalna na istniejącej grupie klastrów.

## Konwencje stylu (z `eslint.config.mjs`)

Wcięcia tabulatorem, pojedyncze cudzysłowy, wymagane średniki, `eqeqeq` (poza porównaniem z `null`), brak `var`, preferowane `const`, wymuszone arrow-parens/arrow-body-style. Dotyczy zarówno backendu, jak i `public/**/*.js` (dla tego drugiego dodatkowo `no-redeclare` oraz lintowanie z globalnymi zmiennymi przeglądarki i source type modułu ES). `public/vendor/**` jest całkowicie wyłączone z lintowania - nigdy nie edytuj plików zvendorowanych bezpośrednio.
