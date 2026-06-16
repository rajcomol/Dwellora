# Kennisbank-herschrijving — bronbestand

Dit bestand is de bron voor het bijwerken van de RenoTasker-kennisbank naar de
huidige app. Het bevat (1) de nieuwe categorie-structuur, (2) wat verwijderd
en hernoemd wordt, en (3) alle herschreven artikelteksten.

Schrijfstijl: gewone taal, korte zinnen, concreet ("klik op X → zie Y"),
begrijpelijk voor iemand die de app net voor het eerst opent.

---

## 1. Nieuwe categorie-structuur

Volgorde is belangrijk (bepaalt de volgorde in de Kluscoach-kennisbank).

| # | categorie-id      | titel (NL)                | artikelen (in deze volgorde)            |
|---|-------------------|---------------------------|-----------------------------------------|
| 1 | getting-started   | Aan de slag               | welcome-overview, navigation-sidebar, dashboard-metrics |
| 2 | projects-rooms    | Ruimtes & taken           | rooms-tasks, tasks-manage               |
| 3 | tasks-planning    | Planning                  | planning-timeline                       |
| 4 | sfeerbeeld        | Sfeerbeeld                | sfeerbeeld                              |
| 5 | finances-budget   | Financiën & bouwdepot     | finances-expenses, bouwdepot            |
| 6 | quotes-documents  | Offertes                  | quotes-offertes                         |
| 7 | ai-coach          | Kluscoach (AI)            | kluscoach-ai                            |
| 8 | settings-account  | Instellingen & account    | settings-security, collaboration-invites |
| 9 | troubleshooting   | Privacy & problemen       | privacy-data, errors-session            |

Bestaande categorie-ids blijven hetzelfde; alleen titels en artikellijsten
wijzigen. Eén nieuwe categorie: `sfeerbeeld`.

### i18n categorie-titels (nl.json → help.category.*)
- gettingStarted: "Aan de slag"
- projectsRooms: "Ruimtes & taken"
- tasksPlanning: "Planning"
- sfeerbeeld: "Sfeerbeeld"   ← NIEUW
- financesBudget: "Financiën & bouwdepot"
- quotesDocuments: "Offertes"
- aiCoach: "Kluscoach (AI)"
- settingsAccount: "Instellingen & account"
- troubleshooting: "Privacy & problemen"

---

## 2. Verwijderen, hernoemen, toevoegen

VERWIJDEREN:
- Categorie `reports` (volledig).
- Artikel `reports-insights` (Rapporten bestaat niet meer).
- Artikel `project-samenwerking` (inhoud zit nu in `collaboration-invites` → "Samenwerken").

HERNOEMEN:
- Artikel-id `tasks-dependencies` → `tasks-manage` (inhoud is nu "Taken", niet
  meer afhankelijkheden). Pas de id aan in types.ts, registry (ARTICLE_META +
  HELP_CATEGORIES) en de nl.json-sleutel.

TOEVOEGEN (nieuwe artikel-ids):
- `sfeerbeeld`
- `bouwdepot`

OPEN PUNT (eerst verifiëren, niet gokken):
- Artikel `projects-create` ("Projecten aanmaken en beheren"): in de huidige nav
  bestaat geen Projecten-tab. Controleer waar een gebruiker NU een project
  aanmaakt en tussen projecten wisselt (project-switcher bovenaan? een
  /dashboard/projects-route? Instellingen?). Rapporteer dit terug. Op basis
  daarvan beslissen we: óf dit artikel verwijderen, óf het kort herschrijven
  naar de echte flow. Verwijder het nu nog NIET.

---

## 3. Artikelteksten

Houd voor de bodies dezelfde opmaakconventies aan als de bestaande
nl.json-artikelen (regelafbrekingen met \n, opsommingen in dezelfde stijl als
de huidige artikelen).

### welcome-overview  (categorie: getting-started)
**Titel:** Welkom: het dashboard als startpunt
**Samenvatting:** Wat je op het startscherm ziet en waar je begint.
**Tekst:**
Het Dashboard is je startscherm. Bovenaan staat kort wat RenoTasker is, daaronder je "Volgende stap" (de eerstvolgende taak), en daarna je belangrijkste cijfers over budget en taken (zie het artikel "De cijfers op je dashboard").

Helemaal aan het begin is dit scherm nog leeg of staat alles op nul. Dat klopt: zodra je je verbouwing invult, vullen de overzichten zich vanzelf. Je begint meestal zo:
- Voeg je kamers toe onder Ruimtes.
- Maak per kamer taken aan.
- Zet je uitgaven als kostenposten onder Financiën.

Wil je rustig door de schermen lopen? Start dan de rondleiding via "Help openen" rechtsboven.

### navigation-sidebar  (categorie: getting-started)
**Titel:** Navigatie: zo vind je alles
**Samenvatting:** De tabbladen, het project bovenaan, je account, Help en de Kluscoach.
**Tekst:**
Bovenin het scherm staat een balk met tabbladen. Je tikt op een tabblad om naar dat onderdeel te gaan. Op een telefoon staat deze balk onderaan het scherm.

De tabbladen en wat je er doet:
- Dashboard — je startscherm met een overzicht van de verbouwing.
- Ruimtes — al je kamers, met de taken per kamer.
- Planning — wanneer welk werk aan de beurt is, als een tijdlijn.
- Sfeerbeeld — maak met AI een beeld van hoe een ruimte, je voordeur of gevel eruit kan gaan zien.
- Financiën — je budget, je uitgaven en je bouwdepot.
- Offertes — offertes (pdf-bestanden) uploaden, laten samenvatten en vergelijken.
- Instellingen — je account, weergave, projectgegevens en samenwerken.

Helemaal bovenaan, naast het logo, kies je welk project je bekijkt als je er meer dan één hebt. Tik op het logo "RenoTasker" om terug te gaan naar het Dashboard.

Rechtsboven vind je je account (met onder andere uitloggen) en de knop "Help openen" voor uitleg en de rondleiding. Rechtsonder staat de ronde knop "Kluscoach": dat is de AI-assistent die je vragen beantwoordt over je verbouwing én over de app zelf.

### dashboard-metrics  (categorie: getting-started)
**Titel:** De cijfers op je dashboard
**Samenvatting:** Wat de kaarten betekenen: taken, budget, besteed, bouwdepot en de opleverdatum.
**Tekst:**
Het Dashboard laat je verbouwing in één oogopslag zien. Bovenaan staat je "Volgende stap": de eerstvolgende taak die aandacht vraagt. Daaronder staan kaarten met je belangrijkste cijfers:
- Taken — hoeveel van je taken al klaar zijn, bijvoorbeeld "3 / 10 voltooid".
- Totaal besteed — alles wat je tot nu toe hebt uitgegeven, opgeteld uit je kostenposten.
- Budget resterend — wat er nog over is: je totale budget min wat je hebt besteed.
- Eigen geld — het deel dat je zelf inlegt.
- Bouwdepot — het bedrag in je bouwdepot, en hoeveel daarvan nog over is.
- Opleverdatum — wanneer je je woning verwacht op te leveren, met een aftelling.

Heb je nog geen kamers, taken of kostenposten toegevoegd, dan blijven deze cijfers grotendeels leeg of op nul. Dat is normaal: zodra je je project invult, vullen de cijfers zich vanzelf. Begin daarvoor bij Ruimtes (je kamers en taken) en Financiën (je kostenposten).

### rooms-tasks  (categorie: projects-rooms)
**Titel:** Ruimtes: je kamers op een rij
**Samenvatting:** Kamers toevoegen, de voortgang per kamer zien en een kamer openen.
**Tekst:**
Op het tabblad Ruimtes staan al je kamers als kaarten naast elkaar — bijvoorbeeld Keuken, Badkamer en Woonkamer. Heb je nog geen kamers, dan zie je een lege pagina met een knop om je eerste kamer toe te voegen.

Elke kaart laat kort zien hoe het met die kamer staat: een balkje met de voortgang (hoeveel taken al af zijn), een paar van de taken, en hoeveel er klaar zijn.

Tik op een kamer om hem te openen. Daar zie je alle taken van die kamer en kun je nieuwe taken toevoegen. Hoe taken werken, lees je in het artikel "Taken".

### tasks-manage  (categorie: projects-rooms)  [voorheen tasks-dependencies]
**Titel:** Taken: het werk plannen per kamer
**Samenvatting:** Taken aanmaken, hun gegevens invullen, en één taak in meerdere kamers gebruiken.
**Tekst:**
Open een kamer via het tabblad Ruimtes en voeg daar taken toe — bijvoorbeeld "Slopen", "Elektra" of "Schilderen". Per taak vul je in:
- een titel;
- in welke ruimtes de taak hoort (zie hieronder);
- de status: te doen, bezig of afgerond;
- de prioriteit;
- de duur in dagen (hoe lang het werk duurt);
- eventueel een fase, wie het doet en een korte omschrijving.

Je vinkt een taak af zodra hij klaar is; dat telt mee in de voortgang van de kamer en op je dashboard.

Eén taak in meerdere kamers. Sommige klussen spelen in meer dan één kamer tegelijk, zoals schilderen. Kies in het taakformulier bij "In welke ruimtes?" alle kamers waar de taak bij hoort. Het blijft dan één gedeelde taak: hij verschijnt in elke gekozen kamer, en als je hem afvinkt, is hij overal in één keer klaar. Bij zo'n taak zie je het label "Gedeeld".

Let op: kosten vul je niet bij een taak in. Geld regel je apart op het tabblad Financiën, als kostenposten. Zo gaat je planning over het werk en je budget over het geld.

### planning-timeline  (categorie: tasks-planning)
**Titel:** Planning: wanneer gebeurt wat
**Samenvatting:** Eén startdatum voor je project plus de duur per taak maken je tijdlijn.
**Tekst:**
Op het tabblad Planning zie je wanneer welk werk aan de beurt is. Dat werkt met twee dingen samen: één startdatum voor je hele project, en de duur in dagen die je per taak invult.

Bovenaan stel je de startdatum in. De planning rekent dan vanaf die datum verder: de taken komen achter elkaar in hun volgorde, en elke taak duurt zoveel dagen als je hebt opgegeven. Zo zie je vanzelf wanneer elke taak ongeveer begint en klaar is.

Heb je nog geen startdatum ingevuld, dan toont de planning alleen de volgorde en het aantal dagen, nog zonder echte kalenderdatums. Geef je taken een duur in dagen, anders kan de tijdlijn niet goed rekenen.

Op een groot scherm zie je een balkenschema; op een telefoon zie je dezelfde planning als een overzichtelijke lijst.

### sfeerbeeld  (categorie: sfeerbeeld)  [NIEUW]
**Titel:** Sfeerbeeld: zie je nieuwe situatie vooraf
**Samenvatting:** Upload een foto, beschrijf wat je wil veranderen, en krijg een realistisch beeld dat je kunt bijsturen.
**Tekst:**
Met Sfeerbeeld maak je een realistisch beeld van hoe een ruimte, je voordeur of je gevel eruit kan gaan zien ná de verbouwing — handig om een idee te krijgen voordat je begint.

Zo werkt het:
- Upload een foto van je huidige situatie. Dat is het enige dat verplicht is. Het kan een kamer zijn, maar ook je voordeur, gevel of tuin.
- Wil je een bepaald materiaal of een bepaalde stijl overnemen? Voeg dan referentiefoto's toe (bijvoorbeeld de houtkleur die je mooi vindt) en zet bij elke foto een kort briefje wat het is.
- Beschrijf bij "Wat wil je veranderen?" in gewone woorden wat je wil, bijvoorbeeld "maak een houten voordeur in eiken".
- Klik op genereren. Je krijgt één beeld te zien dat zo veel mogelijk je echte ruimte aanhoudt.

Wil je daarna iets aanpassen, gebruik dan het veld "Iets aanpassen aan dit beeld?" — bijvoorbeeld "maak de muur warmer". Het beeld wordt bijgewerkt, en zo kun je blijven bijsturen tot het klopt. Elke versie blijft bewaard, dus je kunt terug naar een eerdere als een wijziging tegenvalt.

Het maken van een beeld kan ongeveer een minuut duren, omdat de AI het zorgvuldig opbouwt.

### finances-expenses  (categorie: finances-budget)
**Titel:** Financiën: je budget en uitgaven
**Samenvatting:** Kostenposten toevoegen, je budget bewaken en je bouwdepot bijhouden.
**Tekst:**
Op het tabblad Financiën beheer je al het geld van je verbouwing op één plek. Bovenaan zie je drie kaarten: je totale budget, wat je hebt besteed, en wat er nog over is.

Daaronder staat de lijst met kostenposten. Een kostenpost is één uitgave, bijvoorbeeld "Nieuwe vloer" of "Elektra woonkamer". Je voegt er een toe met de knop "+ Toevoegen". Per kostenpost vul je in:
- een bedrag;
- een categorie (zoals vloeren, elektra, sanitair of keuken);
- of het een werkelijke of geschatte kostenpost is — met een schakelaar zet je dat om;
- of het bedrag uit je bouwdepot betaald wordt.

Je kunt de lijst doorzoeken en filteren op categorie of op werkelijk/geschat, en je kunt wisselen tussen een platte lijst en een weergave per categorie met subtotalen.

Onderaan staat het Bouwdepot-gedeelte met vier cijfers: het totale depot, wat je hebt ingediend, wat is uitbetaald, en wat er nog over is. Per kostenpost die uit het bouwdepot komt, zet je de status op open, ingediend of uitbetaald, zodat je precies ziet waar je staat met de bank.

### bouwdepot  (categorie: finances-budget)  [NIEUW]
**Titel:** Het bouwdepot
**Samenvatting:** Wat een bouwdepot is en hoe je het in RenoTasker bijhoudt.
**Tekst:**
Een bouwdepot is een pot geld (vaak bij je hypotheek) die speciaal bedoeld is voor de verbouwing. Je betaalt facturen uit dat depot, of je schiet ze voor en laat ze achteraf vergoeden.

In RenoTasker geef je per kostenpost aan of die uit het bouwdepot komt. Op het tabblad Financiën, onderaan, zie je dan vier cijfers: het totale depot, wat je hebt ingediend bij de bank, wat al is uitbetaald, en wat er nog over is.

Per kostenpost die uit het depot komt, zet je de status op open (nog niets mee gedaan), ingediend (aanvraag loopt) of uitbetaald (geld is binnen). Zo zie je in één oogopslag waar je staat met je bouwdepot.

### quotes-offertes  (categorie: quotes-documents)
**Titel:** Offertes: uploaden, samenvatten en vergelijken
**Samenvatting:** Pdf-offertes per project beheren en de AI laten meelezen.
**Tekst:**
Op het tabblad Offertes verzamel je de offertes (pdf-bestanden) van je aannemers. Kies eerst het juiste project, upload daarna een pdf, en je offerte staat in de lijst.

Vanuit de lijst kun je een offerte laten samenvatten: je krijgt in begrijpelijke taal de kern, plus waar je op moet letten. Heb je twee offertes voor hetzelfde werk, kies dan twee documenten en laat ze vergelijken — dan zie je de verschillen en welke beter lijkt te passen.

De samenvatting en vergelijking zijn een hulpmiddel, geen eindoordeel: controleer belangrijke dingen altijd zelf, vooral bedragen en kleine lettertjes. Je offertes zijn alleen zichtbaar voor jou en een eventuele medebewoner op hetzelfde project.

### kluscoach-ai  (categorie: ai-coach)
**Titel:** De Kluscoach (AI-hulp)
**Samenvatting:** Vraag van alles over je verbouwing én over de app.
**Tekst:**
De Kluscoach is je AI-assistent. Open hem met de ronde knop rechtsonder. Je kunt twee soorten vragen stellen: over je verbouwing (planning, budget, keuzes, waar je op moet letten bij een offerte) en over de app zelf (waar vind ik iets, wat doet een scherm).

Kies in het paneel een project, of gebruik het project van de pagina waar je op zit, zodat de Kluscoach je echte cijfers en taken meeneemt in zijn antwoord. Je kunt nieuwe gesprekken starten en eerdere terugzoeken.

Goed om te weten: zijn antwoorden zijn een hulpmiddel, geen bouwvoorschrift of juridisch advies. Controleer belangrijke dingen bij een vakman, en zet geen wachtwoorden of geheime gegevens in de chat.

### settings-security  (categorie: settings-account)
**Titel:** Instellingen en je account
**Samenvatting:** Weergave, taal, wachtwoord, projectgegevens en de opleveringschecklist.
**Tekst:**
Onder Instellingen regel je je account en voorkeuren. Je kiest het thema (licht, donker of automatisch), je ziet het e-mailadres van je account, en je kunt je wachtwoord wijzigen of resetten als je het bent vergeten.

Hier vind je ook je projectgegevens (zoals naam, budget en opleverdatum) en de opleveringschecklist — een lijstje van dingen die geregeld moeten zijn rond de sleuteloverdracht.

Daarnaast zit hier het onderdeel Samenwerken, waarmee je een medebewoner aan je project koppelt (zie het artikel "Samenwerken").

### collaboration-invites  (categorie: settings-account)
**Titel:** Samenwerken: iemand uitnodigen
**Samenvatting:** Een medebewoner toegang geven tot je project.
**Tekst:**
Wil je samen met iemand aan hetzelfde project werken (bijvoorbeeld je partner), dan nodig je die persoon uit. Dat doe je als eigenaar onder Instellingen, bij Samenwerken.

Je nodigt iemand uit op het e-mailadres waarmee diegene een RenoTasker-account heeft of aanmaakt — het moet exact hetzelfde adres zijn, anders kan de uitnodiging niet geaccepteerd worden. Per project kan er één medebewoner bij.

Na het accepteren ziet de ander hetzelfde project als jij: ruimtes, taken, planning, financiën en offertes. Een uitnodiging verloopt na een tijdje; als eigenaar kun je een openstaande uitnodiging intrekken. Lukt accepteren niet, open de link dan in een gewone browser (Chrome of Safari) in plaats van in de browser van een mail-app.

### privacy-data  (categorie: troubleshooting)
**Titel:** Privacy en je gegevens
**Samenvatting:** Wat er met je gegevens en bestanden gebeurt.
**Tekst:**
RenoTasker gebruikt de gegevens die je zelf invult of uploadt, plus wat nodig is om in te loggen. Je geüploade pdf's en bijlagen staan in afgeschermde opslag: alleen jij en een eventuele medebewoner op hetzelfde project kunnen er via de app bij.

Gebruik je de Kluscoach, dan gaan je berichten naar de AI-dienst die de antwoorden maakt — zet er dus niets in wat je niet wil delen. De app draait op externe diensten voor hosting en database; de volledige uitleg lees je in de privacyverklaring, te vinden via Instellingen.

Heb je een gevoelig document niet meer nodig? Verwijder het dan gerust uit je offertes.

### errors-session  (categorie: troubleshooting)
**Titel:** Problemen met inloggen of uitnodigingen
**Samenvatting:** Eerste hulp als iets niet werkt.
**Tekst:**
Werkt iets niet terwijl je denkt dat je bent ingelogd? Probeer eerst: ververs de pagina, of log uit en weer in. Open de app bij voorkeur in een gewone browser (Chrome, Safari) en niet in de ingebouwde browser van een mail-app — daar werkt inloggen soms niet goed.

Lukt het accepteren van een uitnodiging niet, controleer dan dat je bent ingelogd met hetzelfde e-mailadres als waarop je bent uitgenodigd. Is de uitnodiging verlopen? Vraag de eigenaar om een nieuwe.

Zie je een algemene foutmelding ("er ging iets mis"), probeer het dan opnieuw en ga terug naar het dashboard. Blijft het misgaan, noteer dan wat je deed en neem contact op met de beheerder van jouw RenoTasker-omgeving.
