# RTK Stundu Saraksts

Rīks RTK stundu saraksta ērtai apskatei. Apkopo un attēlo informāciju no [edupage](https://rtk.edupage.org/timetable/view.php) pārskatāmā formātā ar grupu filtrēšanu, nedēļu navigāciju un saīsinātās dienas opciju.

- [Rīku saraksts](https://rtk2023.github.io/riki/)
- [GitHub projekts](https://github.com/rtk2023/riki)

## Pārskats

### Arhitektūra

Projekts sastāv no divām daļām:

**Serveris** - Node.js backend, kas iegūst datus no edupage, apstrādā tos un pasniedz caur REST API. Satur arī Telegram botu. Servera repozitorijs: [Telegram-Bots-Grupu-Projekts](https://github.com/S0KL0-0/Telegram-Bots-Grupu-Projekts).

**Mājaslapa** - statiska frontend lietotne (HTML, CSS, JS), kas izsauc servera API un attēlo stundu sarakstu. Var tikt izvietota uz GitHub Pages vai jebkura statiskā hostinga.

### Failu struktūra

```
index.html
index.js
styles.css
```

### Secība

1. Lapa ielādējas un pārbauda servera pieejamību (`/health`)
2. Ja serveris atbild - ielādē grupu sarakstu no `/api/groups`
3. Ja serveris nav pieejams - parāda paziņojumu ar norādēm
4. Lietotājs izvēlas programmu un grupu sānjoslā
5. Grupa tiek ielādēta pa lapām no `/api/group/:name?page=N`
6. Katrai nedēļai tiek attēlota tabula ar 5 dienām katra pa 10 stundām

### Funkcionalitāte

- Grupu filtrēšana pēc grupas prefixa (AT, DT, E, EL, LD, MH, P, ST, T, VT)
- Nedēļu navigācija ar "Load more" pogu
- Šīs nedēļas un nākošās nedēļas atzīmēšana
- Saīsinātās dienas režīms (citi stundu laiki)
- Pēdējās atvērtās grupas saglabāšana (localStorage)
- Servera palaišanas paziņojums ar Render.com saiti

## Iespējamie uzlabojumi

- Mobilā versija (responsīvs dizains mazākiem ekrāniem)
- Meklēšana pēc skolotāja vai priekšmeta
- Konkrētas dienas skats (ne tikai pilna nedēļa)
- Tiešā datu iegūšana no edupage bez servera (pašlaik CORS bloķē)
- Krāsu kodēšana dažādiem priekšmetiem
- Tumšais/gaišais režīms


## Zināmie defekti

- Horizontālā ritjosla parādās, ja logs ir šaurāks par tabulas minimālo platumu (~1320px)
- Ja serveris ir izvietots uz bezmaksas Render.com instances, pirmā ielāde var aizņemt līdz 1-2 minūtēm
- Frontend nevar tieši iegūt datus no edupage CORS ierobežojumu dēļ


## Resursi

- [edupage](https://rtk.edupage.org/timetable/view.php) — datu avots
- [Servera repozitorijs](https://github.com/S0KL0-0/Telegram-Bots-Grupu-Projekts) — backend kods ar API un Telegram botu
- [Render.com](https://render.com) — bezmaksas servera hostings
- [W3C Validator](https://validator.w3.org/) — HTML validācija
- [Google Lighthouse](https://pagespeed.web.dev/)


## Autori

- 2026: 3 RTK audzēkņi