// Dolinówka – menu, kalendarz wolnych terminów z rezerwacją (koncept: nic nie jest wysyłane),
// przelot po domu po kliknięciu zdjęcia, galeria w powiększeniu, pasek „Zadzwoń / Rezerwuj” na telefonie.

/* ---------- Menu i paski ---------- */
const naglowek = document.querySelector(".naglowek");
const hero = document.querySelector(".hero");
const menu = document.getElementById("menu");
const przyciskMenu = document.querySelector(".naglowek__menu");
const pasekDol = document.getElementById("pasek-dol");
const sekcjaTerminy = document.getElementById("terminy");
let terminyWidoczne = false;
new IntersectionObserver(([w]) => { terminyWidoczne = w.isIntersecting; przewijanie(); }, { threshold: 0.1 }).observe(sekcjaTerminy);

function przewijanie() {
  const zaHero = scrollY > hero.offsetHeight - 110;
  naglowek.classList.toggle("naglowek--staly", zaHero || menu.classList.contains("menu--otwarte"));
  pasekDol.classList.toggle("pasek-dol--widoczny", zaHero && !terminyWidoczne);
}
addEventListener("scroll", przewijanie, { passive: true });
przewijanie();
przyciskMenu.addEventListener("click", () => {
  const otwarte = !menu.classList.contains("menu--otwarte");
  menu.classList.toggle("menu--otwarte", otwarte);
  przyciskMenu.setAttribute("aria-expanded", String(otwarte));
  przewijanie();
});
menu.addEventListener("click", e => { if (e.target.closest("a")) { menu.classList.remove("menu--otwarte"); przewijanie(); } });

/* ---------- Daty, ceny, przykładowe rezerwacje ---------- */
const MIESIACE = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
const MIESIACE_D = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
const DNI_KR = ["nd", "pn", "wt", "śr", "cz", "pt", "sb"];
const dwa = n => String(n).padStart(2, "0");
const klucz = d => `${d.getFullYear()}-${dwa(d.getMonth() + 1)}-${dwa(d.getDate())}`;
const zKlucza = s => { const [r, m, d] = s.split("-").map(Number); return new Date(r, m - 1, d); };
const przesun = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dzis = (() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); })();
const zl = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " zł";
const odmiana = (n, [jeden, kilka, wiele]) => n === 1 ? jeden : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? kilka : wiele;
const data = d => `${DNI_KR[d.getDay()]}, ${d.getDate()} ${MIESIACE_D[d.getMonth()]}`;
const ptaszek = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const SWIETA = new Set(["12-23", "12-24", "12-25", "12-26", "12-30", "12-31", "01-01", "05-01", "05-02", "05-03"]);
const rodzajNocy = d => SWIETA.has(klucz(d).slice(5)) ? "swieta" : (d.getMonth() === 6 || d.getMonth() === 7) ? "lato" : (d.getDay() === 5 || d.getDay() === 6) ? "weekend" : "tydzien";
const CENY = { tydzien: 390, weekend: 460, lato: 520, swieta: 590 };
const minNocy = d => (rodzajNocy(d) === "lato" || rodzajNocy(d) === "swieta") ? 3 : 2;

// stałe przykładowe rezerwacje (z ziarna), żeby kalendarz wyglądał tak samo przy każdym wejściu
function losowe(z) { return () => { z = z + 0x6D2B79F5 | 0; let t = Math.imul(z ^ z >>> 15, 1 | z); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const zajete = new Set();
(() => {
  const los = losowe(2611);
  let d = new Date(2026, 0, 1);
  while (d <= new Date(2028, 0, 31)) {
    const tydz = d.getDay(), m = d.getMonth();
    let p = tydz === 5 ? 0.6 : tydz === 4 ? 0.25 : 0.08;
    if (m === 6 || m === 7) p += 0.4;
    if (los() < p) {
      const dl = tydz === 5 ? 2 + (los() < 0.3 ? 1 : 0) : 2 + Math.floor(los() * 4);
      for (let k = 0; k < dl; k++) zajete.add(klucz(przesun(d, k)));
      d = przesun(d, dl + (los() < 0.5 ? 0 : 1));
    } else d = przesun(d, 1);
  }
  for (const r of [2026, 2027]) for (const k of ["12-23", "12-24", "12-25", "12-26", "12-30", "12-31"]) zajete.add(`${r}-${k}`);
  for (const r of [2027, 2028]) zajete.add(`${r}-01-01`);
})();
const wolna = d => !zajete.has(klucz(d));

/* ---------- Stan rezerwacji (wspólny dla paska na zdjęciu i kalendarza niżej) ---------- */
const pierwszyMiesiac = new Date(dzis.getFullYear(), dzis.getMonth(), 1);
const stan = { miesiac: pierwszyMiesiac, miesiacHero: pierwszyMiesiac, start: null, koniec: null, dorosli: 2, dzieci: 0, krok: "daty" };
const goscie = () => stan.dorosli + stan.dzieci;
const noce = () => stan.start && stan.koniec ? Math.round((stan.koniec - stan.start) / 864e5) : 0;
function wolnyTermin() { for (let d = stan.start; d < stan.koniec; d = przesun(d, 1)) if (!wolna(d)) return false; return true; }
function cena() { let s = 0; for (let d = stan.start; d < stan.koniec; d = przesun(d, 1)) s += CENY[rodzajNocy(d)]; return noce() >= 7 ? Math.round(s * 0.9) : s; }
const krotko = d => `${DNI_KR[d.getDay()]}, ${d.getDate()} ${MIESIACE_D[d.getMonth()].slice(0, 3)}`;
const opisGosci = () => `${stan.dorosli} ${stan.dorosli === 1 ? "dorosły" : "dorosłych"}${stan.dzieci ? `, ${stan.dzieci} ${odmiana(stan.dzieci, ["dziecko", "dzieci", "dzieci"])}` : ""}`;

/* ---------- Kalendarz (rysowany w dwóch miejscach: nad paskiem na zdjęciu i w sekcji „Wolne terminy”) ---------- */
const siatki = document.getElementById("siatki");
const siatkiHero = document.getElementById("siatki-hero");
function rysujSiatke(el, miesiac) {
  el.innerHTML = "";
  for (let m = 0; m < 2; m++) {
    const pierwszy = new Date(miesiac.getFullYear(), miesiac.getMonth() + m, 1);
    let html = `<p class="miesiac__nazwa">${MIESIACE[pierwszy.getMonth()]} ${pierwszy.getFullYear()}</p><div class="miesiac__dni">`;
    html += ["pn", "wt", "śr", "cz", "pt", "sb", "nd"].map(t => `<span class="miesiac__tyg">${t}</span>`).join("");
    html += '<span class="komorka"></span>'.repeat((pierwszy.getDay() + 6) % 7);
    const ile = new Date(pierwszy.getFullYear(), pierwszy.getMonth() + 1, 0).getDate();
    for (let n = 1; n <= ile; n++) {
      const d = new Date(pierwszy.getFullYear(), pierwszy.getMonth(), n), k = ["dzien"];
      if (d < dzis) k.push("dzien--przeszly"); else if (!wolna(d)) k.push("dzien--zajete");
      if (+d === +dzis) k.push("dzien--dzis");
      if ((stan.start && +d === +stan.start) || (stan.koniec && +d === +stan.koniec)) k.push("dzien--wybrany");
      else if (stan.start && stan.koniec && d > stan.start && d < stan.koniec) k.push("dzien--zakres");
      html += `<span class="komorka"><button type="button" class="${k.join(" ")}" data-d="${klucz(d)}" aria-label="${data(d)}">${n}</button></span>`;
    }
    const blok = document.createElement("div");
    blok.className = "miesiac";
    blok.innerHTML = html + "</div>";
    el.append(blok);
  }
}
function rysujKalendarze() {
  rysujSiatke(siatki, stan.miesiac);
  rysujSiatke(siatkiHero, stan.miesiacHero);
  document.querySelector('[data-krok="-1"]').disabled = +stan.miesiac <= +pierwszyMiesiac;
  document.querySelector('[data-krok-hero="-1"]').disabled = +stan.miesiacHero <= +pierwszyMiesiac;
  podpowiedz.textContent = !stan.start || stan.koniec ? "Wybierz datę przyjazdu" : "Teraz wybierz datę wyjazdu";
}
function klikDnia(e) {
  const b = e.target.closest(".dzien");
  if (!b) return false;
  const d = zKlucza(b.dataset.d);
  if (d < dzis) return false;
  if (stan.start && !stan.koniec && d > stan.start) stan.koniec = d;   // wyjazd może wypaść w zajęty dzień (rano)
  else { if (!wolna(d)) return false; stan.start = d; stan.koniec = null; }
  stan.krok = "daty";
  rysuj();
  return true;
}
siatki.addEventListener("click", klikDnia);
siatkiHero.addEventListener("click", e => {
  if (klikDnia(e) && stan.koniec) setTimeout(zamknijWybory, 260);   // po wybraniu wyjazdu kalendarz się chowa
});
// podgląd zakresu przy najechaniu (przed wybraniem wyjazdu)
for (const el of [siatki, siatkiHero]) el.addEventListener("pointerover", e => {
  el.querySelectorAll(".dzien--podglad").forEach(x => x.classList.remove("dzien--podglad"));
  const b = e.target.closest(".dzien");
  if (!b || !stan.start || stan.koniec) return;
  const d = zKlucza(b.dataset.d);
  el.querySelectorAll(".dzien").forEach(x => { const xd = zKlucza(x.dataset.d); if (xd > stan.start && xd <= d) x.classList.add("dzien--podglad"); });
});
document.querySelectorAll("[data-krok]").forEach(b => b.addEventListener("click", () => {
  stan.miesiac = new Date(stan.miesiac.getFullYear(), stan.miesiac.getMonth() + Number(b.dataset.krok), 1);
  rysujKalendarze();
}));
document.querySelectorAll("[data-krok-hero]").forEach(b => b.addEventListener("click", e => {
  e.stopPropagation();
  stan.miesiacHero = new Date(stan.miesiacHero.getFullYear(), stan.miesiacHero.getMonth() + Number(b.dataset.krokHero), 1);
  rysujKalendarze();
}));

/* ---------- Panel „Twój pobyt” w sekcji niżej ---------- */
const pobyt = document.getElementById("pobyt");
function rysujPobyt() {
  const n = noce();
  if (stan.krok === "gotowe") {
    pobyt.innerHTML = `<div class="pobyt__gotowe">${ptaszek}</div>
      <p class="pobyt__tytul">Dziękujemy! Rezerwacja wstępna przyjęta</p>
      <div class="pobyt__wiersz"><span>Termin</span><b>${stan.start.getDate()} ${MIESIACE_D[stan.start.getMonth()]} – ${stan.koniec.getDate()} ${MIESIACE_D[stan.koniec.getMonth()]}</b></div>
      <div class="pobyt__wiersz"><span>Do zapłaty</span><b>${zl(cena())}</b></div>
      <p class="pobyt__info">Potwierdzimy ją SMS-em w ciągu godziny i wyślemy dane do wpłaty zadatku.</p>
      <button class="pobyt__wstecz" type="button" data-akcja="od-nowa">Zarezerwuj inny termin</button>`;
    return;
  }
  if (stan.krok === "dane") {
    pobyt.innerHTML = `<p class="pobyt__tytul">Dane do rezerwacji</p>
      <div class="pobyt__wiersz"><span>${stan.start.getDate()} ${MIESIACE_D[stan.start.getMonth()]} – ${stan.koniec.getDate()} ${MIESIACE_D[stan.koniec.getMonth()]}</span><b>${zl(cena())}</b></div>
      ${formularzHtml()}
      <p class="pobyt__info">Zadatek 30% (${zl(Math.round(cena() * 0.3))}) wpłacasz dopiero po naszym potwierdzeniu.</p>
      <button class="pobyt__wstecz" type="button" data-akcja="wstecz">← Zmień daty</button>`;
    return;
  }
  const s = sprawdz();
  pobyt.innerHTML = `<p class="pobyt__tytul">Twój pobyt</p>
    <div class="pobyt__wiersz"><span>Przyjazd</span><b>${stan.start ? data(stan.start) : "—"}</b></div>
    <div class="pobyt__wiersz"><span>Wyjazd</span><b>${stan.koniec ? data(stan.koniec) : "—"}</b></div>
    <div class="pobyt__wiersz"><span>Goście</span><span class="licznik"><button type="button" data-akcja="mniej" aria-label="Mniej gości" ${stan.dorosli <= 1 ? "disabled" : ""}>−</button><b>${goscie()}</b><button type="button" data-akcja="wiecej" aria-label="Więcej gości" ${goscie() >= 4 ? "disabled" : ""}>+</button></span></div>
    ${n ? `<div class="pobyt__wiersz"><span>Liczba dób</span><b>${n}</b></div><div class="pobyt__suma"><span>Razem</span><b>${zl(cena())}</b></div>` : ""}
    <p class="pobyt__info">${s.ok ? s.info : s.ok === false ? `<span class="pobyt__info--uwaga">${s.info}</span>` : s.info}</p>
    <button class="przycisk" type="button" data-akcja="rezerwuj" ${s.ok ? "" : "disabled"}>Rezerwuj</button>`;
}
// wspólne sprawdzenie terminu: ok = true / false (zajęty, za krótki) / null (brak dat)
function sprawdz() {
  const n = noce();
  if (!stan.start) return { ok: null, info: "Wybierz w kalendarzu datę przyjazdu." };
  if (!stan.koniec) return { ok: null, info: "Teraz wybierz datę wyjazdu." };
  if (!wolnyTermin()) return { ok: false, info: "W części tego terminu dom jest zajęty. Wybierz inne daty." };
  if (n < minNocy(stan.start)) return { ok: false, info: `Minimalny pobyt w tym terminie to ${minNocy(stan.start)} doby.` };
  return { ok: true, info: `Drewno do kominka i balii w cenie.${n >= 7 ? " Rabat 10% za 7 dób." : ""} Zadatek 30%: ${zl(Math.round(cena() * 0.3))}.` };
}
const formularzHtml = () => `<form class="pobyt__formularz" novalidate>
    <input name="imie" placeholder="Imię i nazwisko *" autocomplete="off" aria-label="Imię i nazwisko">
    <input name="telefon" type="tel" placeholder="Telefon *" autocomplete="off" aria-label="Telefon">
    <input name="email" type="email" placeholder="E-mail" autocomplete="off" aria-label="E-mail">
    <button class="przycisk" type="submit">Wyślij rezerwację</button>
  </form>`;
const poprawny = f => { let ok = true; for (const pole of [f.imie, f.telefon]) { const brak = !pole.value.trim(); pole.classList.toggle("blad", brak); if (brak) ok = false; } return ok; };
pobyt.addEventListener("click", e => {
  const b = e.target.closest("[data-akcja]");
  if (!b || b.disabled) return;
  const a = b.dataset.akcja;
  if (a === "mniej" && stan.dorosli > 1) stan.dorosli--;
  if (a === "wiecej" && goscie() < 4) stan.dorosli++;
  if (a === "rezerwuj") stan.krok = "dane";
  if (a === "wstecz") stan.krok = "daty";
  if (a === "od-nowa") { stan.krok = "daty"; stan.start = stan.koniec = null; }
  rysuj();
});
pobyt.addEventListener("submit", e => { e.preventDefault(); if (!poprawny(e.target)) return; stan.krok = "gotowe"; rysuj(); });

/* ---------- Pasek rezerwacji na zdjęciu: wszystko dzieje się na miejscu, bez przewijania ---------- */
const pasek = document.getElementById("rezerwacja");
const wyborDat = document.getElementById("wybor-dat");
const wyborGosci = document.getElementById("wybor-gosci");
const wynik = document.getElementById("wynik");
const podpowiedz = wyborDat.querySelector(".wybor__podpowiedz");
const okienko = document.getElementById("okienko");

function zamknijWybory() {
  for (const w of [wyborDat, wyborGosci, wynik]) w.hidden = true;
  pasek.querySelectorAll(".rezerwacja__pole--aktywne").forEach(p => p.classList.remove("rezerwacja__pole--aktywne"));
}
// okienko nad paskiem: wyrównane do lewej krawędzi pola, nie wychodzi poza zdjęcie
function pokazNadPaskiem(w, pole) {
  zamknijWybory();
  w.hidden = false;
  const h = hero.getBoundingClientRect(), p = pasek.getBoundingClientRect(), o = (pole || pasek).getBoundingClientRect();
  const lewo = Math.min(Math.max(14, o.left - h.left), h.width - w.offsetWidth - 14);
  w.style.left = lewo + "px";
  w.style.bottom = (h.bottom - p.top + 10) + "px";
}
pasek.addEventListener("click", e => {
  const pole = e.target.closest("[data-pole]");
  if (!pole) return;
  e.stopPropagation();
  const w = pole.dataset.pole === "daty" ? wyborDat : wyborGosci;
  if (!w.hidden) { zamknijWybory(); return; }
  if (w === wyborDat) { stan.miesiacHero = stan.start ? new Date(stan.start.getFullYear(), stan.start.getMonth(), 1) : stan.miesiacHero; rysujKalendarze(); }
  pokazNadPaskiem(w, pole);
  pole.classList.add("rezerwacja__pole--aktywne");
});
wyborDat.querySelector(".wybor__wyczysc").addEventListener("click", e => { e.stopPropagation(); stan.start = stan.koniec = null; rysuj(); });
wyborGosci.addEventListener("click", e => {
  e.stopPropagation();
  const b = e.target.closest("[data-gosc]");
  if (b) {
    const kto = b.dataset.gosc, zmiana = Number(b.dataset.zmiana);
    const nowe = stan[kto] + zmiana;
    if (nowe >= (kto === "dorosli" ? 1 : 0) && (zmiana < 0 || goscie() < 4)) stan[kto] = nowe;
    rysuj();
  }
  if (e.target.closest(".wybor__gotowe")) zamknijWybory();
});
wyborDat.addEventListener("click", e => e.stopPropagation());

// „Sprawdź dostępność”: bez dat otwiera kalendarz, z datami pokazuje wynik nad paskiem
pasek.addEventListener("submit", e => {
  e.preventDefault();
  if (!stan.start || !stan.koniec) { pasek.querySelector('[data-pole="daty"]').click(); return; }
  const s = sprawdz(), n = noce();
  wynik.innerHTML = `<button class="wybor__x" type="button" aria-label="Zamknij">×</button>` + (s.ok
    ? `<p class="wynik__tytul"><i>✓</i>Dom jest wolny w tym terminie</p>
       <div class="wynik__wiersz"><span>Termin</span><b>${krotko(stan.start)} – ${krotko(stan.koniec)} · ${n} ${odmiana(n, ["doba", "doby", "dób"])}</b></div>
       <div class="wynik__wiersz"><span>Goście</span><b>${opisGosci()}</b></div>
       <div class="wynik__dol"><p class="wynik__cena"><b>${zl(cena())}</b><small>za cały pobyt, bez prowizji portali</small></p><button class="przycisk" type="button" data-hero="rezerwuj">Rezerwuj teraz</button></div>
       <p class="wynik__info">${s.info}</p>`
    : `<p class="wynik__tytul wynik__tytul--zajete"><i>!</i>${s.info}</p>
       <div class="wynik__dol"><span></span><button class="przycisk" type="button" data-hero="zmien">Zmień daty</button></div>`);
  pokazNadPaskiem(wynik);
});
wynik.addEventListener("click", e => {
  e.stopPropagation();
  if (e.target.closest(".wybor__x")) zamknijWybory();
  const a = e.target.closest("[data-hero]")?.dataset.hero;
  if (a === "zmien") pasek.querySelector('[data-pole="daty"]').click();
  if (a === "rezerwuj") { zamknijWybory(); otworzOkienko(); }
});
document.addEventListener("click", e => { if (!e.target.closest(".wybor, .rezerwacja")) zamknijWybory(); });

// Okienko z formularzem rezerwacji (nad całą stroną)
function otworzOkienko() {
  okienko.querySelector(".okienko__tresc").innerHTML = `<p class="okienko__tytul" id="okienko-tytul">Rezerwacja – Dolinówka</p>
    <div class="pobyt__wiersz"><span>Termin</span><b>${krotko(stan.start)} – ${krotko(stan.koniec)}</b></div>
    <div class="pobyt__wiersz"><span>Goście</span><b>${opisGosci()}</b></div>
    <div class="pobyt__suma"><span>Razem</span><b>${zl(cena())}</b></div>
    ${formularzHtml()}
    <p class="pobyt__info">Zadatek 30% (${zl(Math.round(cena() * 0.3))}) wpłacasz dopiero po naszym potwierdzeniu.</p>`;
  okienko.hidden = false;
  document.body.style.overflow = "hidden";
  okienko.querySelector("input").focus({ preventScroll: true });
}
const zamknijOkienko = () => { okienko.hidden = true; document.body.style.overflow = ""; };
okienko.addEventListener("click", e => { if (e.target === okienko || e.target.closest(".okienko__zamknij, [data-okienko='zamknij']")) zamknijOkienko(); });
okienko.addEventListener("submit", e => {
  e.preventDefault();
  if (!poprawny(e.target)) return;
  okienko.querySelector(".okienko__tresc").innerHTML = `<div class="pobyt__gotowe">${ptaszek}</div>
    <p class="okienko__tytul" id="okienko-tytul">Dziękujemy! Rezerwacja wstępna przyjęta</p>
    <div class="pobyt__wiersz"><span>Termin</span><b>${krotko(stan.start)} – ${krotko(stan.koniec)}</b></div>
    <div class="pobyt__wiersz"><span>Do zapłaty</span><b>${zl(cena())}</b></div>
    <p class="pobyt__info">Potwierdzimy ją SMS-em w ciągu godziny i wyślemy dane do wpłaty zadatku.</p>
    <button class="przycisk" type="button" data-okienko="zamknij" style="margin-top:16px">Zamknij</button>`;
  stan.krok = "gotowe";
  rysujPobyt();
});
addEventListener("keydown", e => { if (e.key === "Escape") { zamknijWybory(); if (!okienko.hidden) zamknijOkienko(); } });

function rysuj() {
  rysujKalendarze();
  rysujPobyt();
  const ustaw = (k, t) => { const el = pasek.querySelector(`[data-wartosc="${k}"]`); if (el) el.textContent = t; };
  ustaw("przyjazd", stan.start ? krotko(stan.start) : "wybierz");
  ustaw("wyjazd", stan.koniec ? krotko(stan.koniec) : "wybierz");
  ustaw("dorosli", String(stan.dorosli));
  ustaw("dzieci", String(stan.dzieci));
  wyborGosci.querySelector('[data-ile="dorosli"]').textContent = stan.dorosli;
  wyborGosci.querySelector('[data-ile="dzieci"]').textContent = stan.dzieci;
  wyborGosci.querySelector('[data-gosc="dorosli"][data-zmiana="-1"]').disabled = stan.dorosli <= 1;
  wyborGosci.querySelector('[data-gosc="dzieci"][data-zmiana="-1"]').disabled = stan.dzieci <= 0;
  wyborGosci.querySelectorAll('[data-zmiana="1"]').forEach(b => b.disabled = goscie() >= 4);
}
rysuj();

/* ---------- Przelot po domu: klik w zdjęcie → zdjęcie rośnie na cały ekran → film z wnętrza ---------- */
// Czasy z narzedzia/przeloty.py (granice = zmiana pomieszczenia, skoki = klik w pomieszczenie).
const PRZELOTY = {
  dolinowka: { nazwa: "Dolinówka", pokoje: ["Ścieżka do domu", "Weranda", "Sypialnia z kominkiem i balią", "Taras z widokiem"], granice: [0, 4.75, 9.25, 14.95], skoki: [0, 5, 9.5, 15.2], dlugosc: 20.7 },
};
const okno = document.getElementById("wnetrze");
const film = okno.querySelector(".wnetrze__wideo");
const paskiPrzelotu = okno.querySelector(".wnetrze__paski");
const pokojePrzelotu = okno.querySelector(".wnetrze__pokoje");
const pionowyEkran = matchMedia("(orientation: portrait)");
const bezRuchu = matchMedia("(prefers-reduced-motion: reduce)");
let przelot = null, ostatniPokoj = -1, skadOtwarte = null;

function ustawFilm(id, t = 0, graj = true) {
  const plik = `img/przelot-${id}-${pionowyEkran.matches ? "pionowy" : "poziomy"}`;
  film.poster = plik + ".jpg";
  if (film.getAttribute("src") !== plik + ".mp4") film.src = plik + ".mp4";
  const start = () => { film.currentTime = t; if (graj) film.play().catch(() => {}); };
  if (film.readyState >= 1) start(); else film.addEventListener("loadedmetadata", start, { once: true });
}
function odswiezPrzelot() {
  if (!przelot) return;
  const t = film.currentTime, { granice, dlugosc } = przelot;
  let i = granice.length - 1;
  while (i > 0 && t < granice[i]) i--;
  [...paskiPrzelotu.children].forEach((p, n) => {
    const od = granice[n], dokad = granice[n + 1] ?? (film.duration || dlugosc);
    p.style.setProperty("--postep", n < i ? 1 : n > i ? 0 : Math.min(1, Math.max(0, (t - od) / (dokad - od))));
  });
  if (i !== ostatniPokoj) { ostatniPokoj = i; pokojePrzelotu.querySelectorAll("button").forEach((b, n) => b.classList.toggle("aktywny", n === i)); }
}
const petla = () => { odswiezPrzelot(); if (przelot && !film.paused) requestAnimationFrame(petla); };
film.addEventListener("play", () => requestAnimationFrame(petla));
film.addEventListener("seeked", odswiezPrzelot);

function otworzPrzelot(id, przycisk) {
  if (przelot) return;
  const d = PRZELOTY[id];
  przelot = { id, ...d }; ostatniPokoj = -1; skadOtwarte = przycisk;
  okno.querySelector(".wnetrze__nazwa").textContent = d.nazwa;
  paskiPrzelotu.innerHTML = "<i></i>".repeat(d.pokoje.length);
  pokojePrzelotu.innerHTML = d.pokoje.map(p => `<li><button type="button">${p}</button></li>`).join("");
  ustawFilm(id, 0, false);
  odswiezPrzelot();
  document.body.style.overflow = "hidden";
  const img = przycisk.querySelector("img"), r = img.getBoundingClientRect();
  const klon = img.cloneNode();
  klon.removeAttribute("loading");
  klon.className = "wnetrze-klon";
  Object.assign(klon.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  document.body.append(klon);
  const czas = bezRuchu.matches ? 0 : 1;
  klon.animate([
    { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: "3px" },
    { left: "0px", top: "0px", width: innerWidth + "px", height: innerHeight + "px", borderRadius: "0px" },
  ], { duration: 700 * czas, easing: "cubic-bezier(.65, 0, .25, 1)", fill: "forwards" }).finished.then(() => {
    okno.hidden = false;
    requestAnimationFrame(() => okno.classList.add("wnetrze--widoczne"));
    film.currentTime = 0;
    film.play().catch(() => {});
    okno.querySelector(".wnetrze__zamknij").focus({ preventScroll: true });
    return klon.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.16)", opacity: 0 }], { duration: 750 * czas, easing: "ease-in", fill: "forwards" }).finished;
  }).then(() => klon.remove());
}
function zamknijPrzelot() {
  if (!przelot) return;
  przelot = null;
  film.pause();
  okno.classList.remove("wnetrze--widoczne");
  document.body.style.overflow = "";
  setTimeout(() => { if (!przelot) { okno.hidden = true; film.removeAttribute("src"); film.load(); } }, 450);
  skadOtwarte?.focus({ preventScroll: true });
}
document.querySelectorAll("[data-przelot]").forEach(b => b.addEventListener("click", () => otworzPrzelot(b.dataset.przelot, b)));
okno.querySelector(".wnetrze__zamknij").addEventListener("click", zamknijPrzelot);
okno.querySelector(".wnetrze__terminy").addEventListener("click", zamknijPrzelot);
pokojePrzelotu.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b || !przelot) return;
  film.currentTime = przelot.skoki[[...pokojePrzelotu.querySelectorAll("button")].indexOf(b)];
  film.play().catch(() => {});
});
pionowyEkran.addEventListener("change", () => { if (przelot) ustawFilm(przelot.id, film.currentTime, !film.paused); });

/* ---------- Galeria w powiększeniu ---------- */
const lightbox = document.getElementById("lightbox");
const zdjecia = [...document.querySelectorAll(".galeria__el")];
const lbImg = lightbox.querySelector(".lightbox__zdjecie");
let lbNr = 0;
function pokaz(n) {
  lbNr = (n + zdjecia.length) % zdjecia.length;
  lbImg.src = zdjecia[lbNr].getAttribute("href");
  lbImg.alt = zdjecia[lbNr].querySelector("img").alt;
  lightbox.querySelector(".lightbox__licznik").textContent = `${lbNr + 1} / ${zdjecia.length}`;
}
zdjecia.forEach((a, n) => a.addEventListener("click", e => { e.preventDefault(); pokaz(n); lightbox.hidden = false; document.body.style.overflow = "hidden"; }));
const zamknijLb = () => { lightbox.hidden = true; document.body.style.overflow = ""; };
lightbox.querySelector(".lightbox__zamknij").addEventListener("click", zamknijLb);
lightbox.querySelector(".lightbox__strzalka--lewo").addEventListener("click", () => pokaz(lbNr - 1));
lightbox.querySelector(".lightbox__strzalka--prawo").addEventListener("click", () => pokaz(lbNr + 1));
lightbox.addEventListener("click", e => { if (e.target === lightbox) zamknijLb(); });

addEventListener("keydown", e => {
  if (e.key === "Escape") { zamknijPrzelot(); if (!lightbox.hidden) zamknijLb(); }
  if (!lightbox.hidden && e.key === "ArrowLeft") pokaz(lbNr - 1);
  if (!lightbox.hidden && e.key === "ArrowRight") pokaz(lbNr + 1);
});
