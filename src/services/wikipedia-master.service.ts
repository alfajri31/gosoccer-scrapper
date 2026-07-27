import type { Browser, Page } from 'puppeteer' with {
  'resolution-mode': 'import',
};
import type { Types } from 'mongoose';

import { ClassementModel } from '../models/classement';
import { CoachModel } from '../models/coach';
import { CountryModel } from '../models/country';
import { CupModel } from '../models/cup';
import { LeagueModel } from '../models/league';
import { PlayerModel } from '../models/player';
import { RefereeModel } from '../models/referee';
import { SeasonModel } from '../models/season';
import { StadiumModel } from '../models/stadium';
import { TeamModel } from '../models/team';
import { TopScorerModel } from '../models/top-scorer';
import { YearModel } from '../models/year';

const COUNTRY_LIST_URL =
  'https://en.wikipedia.org/wiki/List_of_sovereign_states';
const COMPETITION_LIST_URL =
  'https://en.wikipedia.org/wiki/List_of_association_football_competitions';

interface ScrapedCountry {
  externalId: string;
  name: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  sourceUrl: string;
}

interface ScrapedLeague {
  externalId: string;
  name: string;
  countryName: string;
  sourceUrl: string;
}

interface ScrapedCup {
  externalId: string;
  name: string;
  countryName: string;
  sourceUrl: string;
}

interface ScrapedTeam {
  externalId: string;
  name: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  sourceUrl: string;
}

interface ScrapedPlayer {
  externalId: string;
  name: string;
  position?: string;
  nationality?: string;
  sourceUrl?: string;
}

interface ScrapedCoach {
  externalId: string;
  name: string;
  sourceUrl?: string;
}

interface ScrapedStadium {
  externalId: string;
  name: string;
  capacity?: number;
  sourceUrl?: string;
}

interface ScrapedClassementRow {
  position: number;
  teamName: string;
  teamUrl: string | undefined;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

interface ScrapedClassementPage {
  seasonUrl: string;
  seasonYear: number;
  rows: ScrapedClassementRow[];
}

interface ScrapedSeason {
  externalId: string;
  name: string;
  startYear: number;
  endYear: number;
  sourceUrl: string;
}

interface ScrapedReferee {
  externalId: string;
  name: string;
  sourceUrl?: string;
}

interface ScrapedTopScorer {
  rank: number;
  goals: number;
  playerName: string;
  playerUrl?: string;
  teamName?: string;
  teamUrl?: string;
}

interface ScrapedTeamPage {
  players: ScrapedPlayer[];
  imageUrl?: string;
  mobileImageUrl?: string;
}

interface ScrapedLeaguePage {
  teams: ScrapedTeam[];
  imageUrl?: string;
  mobileImageUrl?: string;
}

export interface WikipediaSyncState {
  status: 'idle' | 'running' | 'completed' | 'failed';
  phase:
    | 'idle'
    | 'years'
    | 'countries'
    | 'leagues'
    | 'cups'
    | 'teams'
    | 'stadiums'
    | 'coaches'
    | 'players'
    | 'seasons'
    | 'referees'
    | 'topScorers'
    | 'classements'
    | 'completed';
  yearsSaved: number;
  countriesSaved: number;
  leaguesDiscovered: number;
  leaguesSaved: number;
  leaguesProcessed: number;
  leaguePagesFailed: number;
  cupsDiscovered: number;
  cupsSaved: number;
  cupPagesFailed: number;
  teamsSaved: number;
  teamsProcessed: number;
  teamPagesFailed: number;
  stadiumsSaved: number;
  stadiumPagesFailed: number;
  coachesSaved: number;
  coachPagesFailed: number;
  playersSaved: number;
  seasonsSaved: number;
  seasonPagesFailed: number;
  refereesSaved: number;
  refereePagesFailed: number;
  topScorersSaved: number;
  topScorerPagesFailed: number;
  topScorerPlayersMissing: number;
  classementsSaved: number;
  classementPagesFailed: number;
  classementTeamsMissing: number;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

const activeBrowsers = new Set<Browser>();
let isShuttingDown = false;
let activeSync: Promise<void> | undefined;
let syncState: WikipediaSyncState = createIdleState();

function createIdleState(): WikipediaSyncState {
  return {
    status: 'idle',
    phase: 'idle',
    yearsSaved: 0,
    countriesSaved: 0,
    leaguesDiscovered: 0,
    leaguesSaved: 0,
    leaguesProcessed: 0,
    leaguePagesFailed: 0,
    cupsDiscovered: 0,
    cupsSaved: 0,
    cupPagesFailed: 0,
    teamsSaved: 0,
    teamsProcessed: 0,
    teamPagesFailed: 0,
    stadiumsSaved: 0,
    stadiumPagesFailed: 0,
    coachesSaved: 0,
    coachPagesFailed: 0,
    playersSaved: 0,
    seasonsSaved: 0,
    seasonPagesFailed: 0,
    refereesSaved: 0,
    refereePagesFailed: 0,
    topScorersSaved: 0,
    topScorerPagesFailed: 0,
    topScorerPlayersMissing: 0,
    classementsSaved: 0,
    classementPagesFailed: 0,
    classementTeamsMissing: 0,
  };
}

function wikipediaExternalId(href: string, baseUrl: string): string {
  const url = new URL(href, baseUrl);
  const slug = decodeURIComponent(url.pathname.replace(/^\/wiki\//, ''));

  return `wikipedia:${slug}`;
}

function wikipediaUrlForName(name: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(
    name.replace(/\s+/g, '_'),
  )}`;
}

function originalImageUrl(sourceUrl: string | undefined): string | undefined {
  return sourceUrl;
}

async function scrapeWikipediaImage(
  page: Page,
  sourceUrl: string,
): Promise<{ imageUrl?: string; mobileImageUrl?: string }> {
  await page.goto(sourceUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const sourceImageUrl = await page.evaluate(() => {
    const infobox = document.querySelector<HTMLElement>('table.infobox');
    const firstRowImage =
      infobox?.querySelector<HTMLImageElement>('tr:first-child img')?.src;
    const firstInfoboxImage =
      infobox?.querySelector<HTMLImageElement>('img')?.src;
    const metadataImage = document
      .querySelector<HTMLMetaElement>('meta[property="og:image"]')
      ?.content.trim();

    return firstRowImage || firstInfoboxImage || metadataImage || undefined;
  });

  return {
    imageUrl: originalImageUrl(sourceImageUrl),
    mobileImageUrl: originalImageUrl(sourceImageUrl),
  };
}

async function closeActiveBrowsers(): Promise<void> {
  const browsers = Array.from(activeBrowsers);
  activeBrowsers.clear();

  await Promise.allSettled(
    browsers.map(async (browser) => {
      if (browser.connected) {
        await browser.close();
      }
    }),
  );
}

async function shutdown(signal: 'SIGINT' | 'SIGTERM'): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  await closeActiveBrowsers();
  process.exit(signal === 'SIGINT' ? 130 : 143);
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

async function configurePage(page: Page): Promise<void> {
  await page.evaluateOnNewDocument(
    'globalThis.__name = (target) => target;',
  );
  await page.setUserAgent('SoccerScrapper/1.0 (educational master-data sync)');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
  });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (['image', 'font', 'media'].includes(request.resourceType())) {
      void request.abort();
      return;
    }

    void request.continue();
  });
}

async function scrapeCountries(page: Page): Promise<ScrapedCountry[]> {
  await page.goto(COUNTRY_LIST_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const rows = await page.evaluate(() => {
    const table = Array.from(document.querySelectorAll('table.wikitable')).find(
      (candidate) => {
        const headers = Array.from(
          candidate.querySelectorAll('tr:first-child th'),
        ).map((header) => header.textContent?.trim().toLowerCase() ?? '');

        return headers.some((header) => header.includes('membership within'));
      },
    );

    if (!table) {
      throw new Error('Sovereign states table was not found');
    }

    return Array.from(table.querySelectorAll('tbody > tr'))
      .map((row) => {
        const cells = Array.from(
          row.querySelectorAll<HTMLElement>(':scope > th, :scope > td'),
        );
        const countryCell = cells.find(
          (cell) =>
            cell.querySelector('img') &&
            cell.querySelector('a[href*="wikipedia.org/wiki/"]:not(.image)'),
        );
        const anchor = countryCell?.querySelector<HTMLAnchorElement>(
          'a[href*="wikipedia.org/wiki/"]:not(.image)',
        );
        const image = countryCell?.querySelector<HTMLImageElement>('img');
        const name = anchor?.textContent?.trim().replace(/^The\s+/, '');

        if (!anchor || !name) {
          return null;
        }

        return {
          name,
          href: anchor.href,
          imageUrl: image?.src,
        };
      })
      .filter(
        (
          country,
        ): country is { name: string; href: string; imageUrl: string | undefined } =>
          country !== null,
      );
  });

  const countries = new Map<string, ScrapedCountry>();

  for (const row of rows) {
    const externalId = wikipediaExternalId(row.href, COUNTRY_LIST_URL);
    countries.set(externalId, {
      externalId,
      name: row.name,
      imageUrl: originalImageUrl(row.imageUrl),
      mobileImageUrl: originalImageUrl(row.imageUrl),
      sourceUrl: row.href,
    });
  }

  return Array.from(countries.values());
}

async function scrapeTopLeagues(page: Page): Promise<ScrapedLeague[]> {
  await page.goto(COMPETITION_LIST_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const rows = await page.evaluate(() => {
    let currentHeading = '';
    const leagues: Array<{
      countryName: string;
      name: string;
      href: string;
    }> = [];
    const countriesWithLeague = new Set<string>();

    for (const element of document.querySelectorAll('h2, h3, h4, table')) {
      if (/^H[2-4]$/.test(element.tagName)) {
        currentHeading = (element.textContent ?? '')
          .replace(/\[edit\]/gi, '')
          .trim();
        continue;
      }

      const table = element as HTMLTableElement;
      const headers = Array.from(table.querySelectorAll('tr:first-child th')).map(
        (header) => header.textContent?.trim().toLowerCase() ?? '',
      );

      if (
        !headers.some((header) => header.includes('competitions')) ||
        !headers.some(
          (header) =>
            header.includes('league/cup') ||
            header.includes('teams/clubs'),
        ) ||
        !currentHeading ||
        countriesWithLeague.has(currentHeading)
      ) {
        continue;
      }

      for (const row of table.querySelectorAll('tbody > tr')) {
        const text = row.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        const normalizedText = text.toLowerCase();

        if (
          !/(1st[\s-]*(tier|level)|first[\s-]*(tier|level)|top[\s-]*tier|national pro league)/i.test(
            text,
          ) ||
          normalizedText.includes('women') ||
          normalizedText.includes('defunct') ||
          normalizedText.includes('[cup]')
        ) {
          continue;
        }

        const cells = Array.from(
          row.querySelectorAll<HTMLElement>(':scope > th, :scope > td'),
        );
        const competitionCell = cells.find((cell) => {
          const cellText = cell.textContent?.trim() ?? '';
          return (
            !cellText.startsWith('[') &&
            Boolean(
              cell.querySelector(
                'a[href*="wikipedia.org/wiki/"]:not([href*="#endnote"])',
              ),
            )
          );
        });
        const anchor = competitionCell?.querySelector<HTMLAnchorElement>(
          'a[href*="wikipedia.org/wiki/"]:not([href*="#endnote"])',
        );
        const name = anchor?.textContent?.trim();

        if (!anchor || !name) {
          continue;
        }

        leagues.push({
          countryName: currentHeading,
          name,
          href: anchor.href,
        });
        countriesWithLeague.add(currentHeading);
        break;
      }
    }

    return leagues;
  });

  return rows.map((row) => ({
    externalId: wikipediaExternalId(row.href, COMPETITION_LIST_URL),
    name: row.name,
    countryName: row.countryName,
    sourceUrl: row.href,
  }));
}

async function scrapeCups(page: Page): Promise<ScrapedCup[]> {
  await page.goto(COMPETITION_LIST_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const rows = await page.evaluate(() => {
    let currentHeading = '';
    const cups: Array<{
      countryName: string;
      name: string;
      href: string;
    }> = [];

    for (const element of document.querySelectorAll('h2, h3, h4, table')) {
      if (/^H[2-4]$/.test(element.tagName)) {
        currentHeading = (element.textContent ?? '')
          .replace(/\[edit\]/gi, '')
          .trim();
        continue;
      }

      const table = element as HTMLTableElement;
      const headers = Array.from(table.querySelectorAll('tr:first-child th')).map(
        (header) => header.textContent?.trim().toLowerCase() ?? '',
      );

      if (
        !headers.some((header) => header.includes('competitions')) ||
        !headers.some(
          (header) =>
            header.includes('league/cup') ||
            header.includes('teams/clubs'),
        ) ||
        !currentHeading
      ) {
        continue;
      }

      for (const row of table.querySelectorAll('tbody > tr')) {
        const text = row.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        const normalizedText = text.toLowerCase();

        if (
          !/\bcup\b/i.test(text) ||
          normalizedText.includes('women') ||
          normalizedText.includes('youth') ||
          normalizedText.includes('defunct')
        ) {
          continue;
        }

        const anchor = Array.from(
          row.querySelectorAll<HTMLAnchorElement>(
            'a[href]:not(.new):not([href*="#endnote"])',
          ),
        ).find(
          (candidate) =>
            new URL(candidate.href).pathname.startsWith('/wiki/') &&
            (candidate.textContent?.trim().length ?? 0) > 0,
        );
        const name = anchor?.textContent?.trim();

        if (!anchor || !name) {
          continue;
        }

        cups.push({
          countryName: currentHeading,
          name,
          href: anchor.href,
        });
      }
    }

    return cups;
  });
  const cups = new Map<string, ScrapedCup>();

  for (const row of rows) {
    const externalId = wikipediaExternalId(row.href, COMPETITION_LIST_URL);
    cups.set(`${row.countryName}:${externalId}`, {
      externalId,
      name: row.name,
      countryName: row.countryName,
      sourceUrl: row.href,
    });
  }

  return Array.from(cups.values());
}

async function scrapeTeams(
  page: Page,
  league: ScrapedLeague,
): Promise<ScrapedLeaguePage> {
  await page.goto(league.sourceUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const result = await page.evaluate(() => {
    const tables = Array.from(
      document.querySelectorAll<HTMLTableElement>('table.wikitable'),
    );
    const table = tables.find((candidate) => {
      const headers = Array.from(
        candidate.querySelectorAll('tr:first-child th'),
      ).map((header) =>
        (header.textContent ?? '').replace(/\[[^\]]+\]/g, '').trim().toLowerCase(),
      );
      const hasTeam = headers.some(
        (header) => header === 'team' || header === 'club',
      );
      const hasLocationAttribute = headers.some((header) =>
        /(location|stadium|ground|founded)/.test(header),
      );
      const hasCurrentSeasonAttribute =
        headers.some((header) => header.includes('position')) &&
        headers.some((header) => header.includes('first season'));

      return hasTeam && (hasLocationAttribute || hasCurrentSeasonAttribute);
    });

    const imageUrl =
      document.querySelector<HTMLImageElement>(
        'table.infobox tr:first-child img',
      )?.src ??
      document.querySelector<HTMLImageElement>('table.infobox img')?.src ??
      document
        .querySelector<HTMLMetaElement>('meta[property="og:image"]')
        ?.content.trim();

    if (!table) {
      return {
        imageUrl,
        teams: [],
      };
    }

    const headers = Array.from(table.querySelectorAll('tr:first-child th')).map(
      (header) =>
        (header.textContent ?? '').replace(/\[[^\]]+\]/g, '').trim().toLowerCase(),
    );
    const teamColumnIndex = headers.findIndex(
      (header) => header === 'team' || header === 'club',
    );

    const teams = Array.from(table.querySelectorAll('tbody > tr'))
      .map((row) => {
        const cells = Array.from(
          row.querySelectorAll<HTMLElement>(':scope > th, :scope > td'),
        );
        const indexedTeamCell = cells[teamColumnIndex];
        const scopedTeamCell = row.querySelector<HTMLElement>(
          ':scope > th[scope="row"]',
        );
        const linkedTeamCell = cells.find((cell) =>
          Boolean(
            cell.querySelector<HTMLAnchorElement>(
              'a[href]:not(.image):not(.new)',
            ),
          ),
        );
        const teamCell =
          scopedTeamCell ??
          (cells.length === headers.length &&
          indexedTeamCell?.querySelector('a[href]:not(.image):not(.new)')
            ? indexedTeamCell
            : undefined) ??
          linkedTeamCell;
        const anchor = teamCell?.querySelector<HTMLAnchorElement>(
          'a[href]:not(.image):not(.new)',
        );
        const name = anchor?.textContent?.trim();

        if (
          !anchor ||
          !name ||
          !new URL(anchor.href).pathname.startsWith('/wiki/')
        ) {
          return null;
        }

        return {
          name,
          href: anchor.href,
        };
      })
      .filter(
        (team): team is { name: string; href: string } => team !== null,
      );

    return {
      imageUrl,
      teams,
    };
  });

  const teams = new Map<string, ScrapedTeam>();

  for (const row of result.teams) {
    const externalId = wikipediaExternalId(row.href, league.sourceUrl);
    teams.set(externalId, {
      externalId,
      name: row.name,
      sourceUrl: row.href,
    });
  }

  return {
    teams: Array.from(teams.values()),
    imageUrl: originalImageUrl(result.imageUrl),
    mobileImageUrl: originalImageUrl(result.imageUrl),
  };
}

async function scrapeCurrentSquad(
  page: Page,
  team: ScrapedTeam,
): Promise<ScrapedTeamPage> {
  await page.goto(team.sourceUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const result = await page.evaluate(() => {
    const normalize = (value: string | null): string =>
      (value ?? '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
    const imageUrl =
      document.querySelector<HTMLImageElement>(
        'table.infobox tr:first-child img',
      )?.src ??
      document.querySelector<HTMLImageElement>('table.infobox img')?.src ??
      document
        .querySelector<HTMLMetaElement>('meta[property="og:image"]')
        ?.content.trim();
    const currentSquadMarker = Array.from(
      document.querySelectorAll<HTMLElement>('[id]'),
    ).find((element) => {
      const id = element.id.toLowerCase().replace(/[_-]+/g, ' ');
      return (
        id === 'current squad' ||
        id === 'first team squad' ||
        id === 'current roster' ||
        id === 'first team roster'
      );
    });
    const heading = currentSquadMarker?.closest<HTMLElement>(
      'h2, h3, h4, h5, h6',
    );
    const sectionStart =
      heading?.closest<HTMLElement>('.mw-heading') ?? heading;
    const headingLevel = heading
      ? Number.parseInt(heading.tagName.slice(1), 10)
      : undefined;
    const tables: HTMLTableElement[] = [];

    if (sectionStart && headingLevel) {
      let sibling = sectionStart.nextElementSibling;

      while (sibling) {
        const nextHeading =
          sibling.matches('h2, h3, h4, h5, h6')
            ? (sibling as HTMLElement)
            : sibling.querySelector<HTMLElement>(
                ':scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6',
              );
        const nextLevel = nextHeading
          ? Number.parseInt(nextHeading.tagName.slice(1), 10)
          : undefined;

        if (nextLevel && nextLevel <= headingLevel) {
          break;
        }

        if (sibling.matches('table.wikitable')) {
          tables.push(sibling as HTMLTableElement);
        }
        tables.push(
          ...Array.from(
            sibling.querySelectorAll<HTMLTableElement>('table.wikitable'),
          ),
        );
        sibling = sibling.nextElementSibling;
      }
    }

    if (tables.length === 0) {
      return {
        imageUrl,
        players: [],
      };
    }

    const players = tables.flatMap((table) => {
      const headerRow = table.querySelector('tr');
      const headers = Array.from(
        headerRow?.querySelectorAll<HTMLElement>(':scope > th, :scope > td') ??
          [],
      ).map((header) => normalize(header.textContent).toLowerCase());
      const playerColumnIndexes = headers
        .map((header, index) => (header === 'player' ? index : -1))
        .filter((index) => index >= 0);

      return Array.from(table.querySelectorAll('tbody > tr')).flatMap((row) => {
        if (row === headerRow) {
          return [];
        }

        const cells = Array.from(
          row.querySelectorAll<HTMLElement>(':scope > th, :scope > td'),
        );

        return playerColumnIndexes.map((playerIndex) => {
          const playerCell = cells[playerIndex];
          const playerAnchor = playerCell?.querySelector<HTMLAnchorElement>(
            'a[href]:not(.image):not(.new)',
          );
          const name =
            normalize(playerAnchor?.textContent ?? playerCell?.textContent ?? '') ||
            undefined;

          if (!name) {
            return null;
          }

          let position: string | undefined;
          let nationality: string | undefined;

          for (let index = playerIndex - 1; index >= 0; index -= 1) {
            const header = headers[index];

            if (
              !position &&
              (header === 'pos.' || header === 'pos' || header === 'position')
            ) {
              position = normalize(cells[index]?.textContent ?? '');
            }

            if (
              !nationality &&
              (header === 'nation' || header === 'nationality')
            ) {
              const nationLink = cells[index]?.querySelector<HTMLAnchorElement>(
                'a[title], a[href]',
              );
              nationality = normalize(
                nationLink?.title ??
                  nationLink?.textContent ??
                  cells[index]?.textContent ??
                  '',
              );
            }

            if (position && nationality) {
              break;
            }
          }

          return {
            name,
            href: playerAnchor?.href,
            position: position || undefined,
            nationality: nationality || undefined,
          };
        })
        .filter(
          (
            player,
          ): player is {
            name: string;
            href: string | undefined;
            position: string | undefined;
            nationality: string | undefined;
          } => player !== null,
        );
      });
    });

    return {
      imageUrl,
      players,
    };
  });

  const players = new Map<string, ScrapedPlayer>();

  for (const row of result.players) {
    const externalId = row.href
      ? wikipediaExternalId(row.href, team.sourceUrl)
      : `wikipedia:${team.externalId}:${row.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}`;

    players.set(externalId, {
      externalId,
      name: row.name,
      position: row.position,
      nationality: row.nationality,
      sourceUrl: row.href,
    });
  }

  return {
    players: Array.from(players.values()),
    imageUrl: originalImageUrl(result.imageUrl),
    mobileImageUrl: originalImageUrl(result.imageUrl),
  };
}

async function scrapeCoach(
  page: Page,
  team: ScrapedTeam,
): Promise<ScrapedCoach | undefined> {
  await page.goto(team.sourceUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const result = await page.evaluate(() => {
    const normalize = (value: string | null): string =>
      (value ?? '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
    const rows = Array.from(
      document.querySelectorAll<HTMLTableRowElement>('table.infobox tr'),
    );
    const coachRow = rows.find((row) => {
      const label = normalize(
        row.querySelector<HTMLElement>(':scope > th')?.textContent ?? '',
      ).toLowerCase();

      return (
        label === 'head coach' ||
        label === 'manager' ||
        label === 'coach'
      );
    });
    const valueCell = coachRow?.querySelector<HTMLElement>(':scope > td');
    const anchors = Array.from(
      valueCell?.querySelectorAll<HTMLAnchorElement>(
        'a[href]:not(.image):not(.new)',
      ) ?? [],
    );
    const coachAnchor = anchors.find(
      (anchor) =>
        new URL(anchor.href).pathname.startsWith('/wiki/') &&
        normalize(anchor.textContent).length > 0,
    );
    const name = normalize(
      coachAnchor?.textContent ?? valueCell?.textContent ?? '',
    );

    if (!name) {
      return undefined;
    }

    return {
      name,
      href: coachAnchor?.href,
    };
  });

  if (!result) {
    return undefined;
  }

  return {
    externalId: result.href
      ? wikipediaExternalId(result.href, team.sourceUrl)
      : `wikipedia:${team.externalId}:coach:${result.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}`,
    name: result.name,
    sourceUrl: result.href,
  };
}

async function scrapeStadium(
  page: Page,
  team: ScrapedTeam,
): Promise<ScrapedStadium | undefined> {
  await page.goto(team.sourceUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const result = await page.evaluate(() => {
    const normalize = (value: string | null): string =>
      (value ?? '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
    const rows = Array.from(
      document.querySelectorAll<HTMLTableRowElement>('table.infobox tr'),
    );
    const stadiumRow = rows.find((row) => {
      const label = normalize(
        row.querySelector<HTMLElement>(':scope > th')?.textContent ?? '',
      ).toLowerCase();

      return (
        label === 'ground' ||
        label === 'stadium' ||
        label === 'home ground' ||
        label === 'home venue'
      );
    });
    const capacityRow = rows.find((row) => {
      const label = normalize(
        row.querySelector<HTMLElement>(':scope > th')?.textContent ?? '',
      ).toLowerCase();

      return label === 'capacity';
    });
    const valueCell = stadiumRow?.querySelector<HTMLElement>(':scope > td');
    const stadiumAnchor = Array.from(
      valueCell?.querySelectorAll<HTMLAnchorElement>(
        'a[href]:not(.image):not(.new)',
      ) ?? [],
    ).find(
      (anchor) =>
        new URL(anchor.href).pathname.startsWith('/wiki/') &&
        normalize(anchor.textContent).length > 0,
    );
    const name = normalize(
      stadiumAnchor?.textContent ?? valueCell?.textContent ?? '',
    );
    const capacityText = normalize(
      capacityRow?.querySelector<HTMLElement>(':scope > td')?.textContent ?? '',
    );
    const capacityMatch = capacityText.replace(/,/g, '').match(/\d+/);

    if (!name) {
      return undefined;
    }

    return {
      name,
      href: stadiumAnchor?.href,
      capacity: capacityMatch
        ? Number.parseInt(capacityMatch[0], 10)
        : undefined,
    };
  });

  if (!result) {
    return undefined;
  }

  return {
    externalId: result.href
      ? wikipediaExternalId(result.href, team.sourceUrl)
      : `wikipedia:${team.externalId}:stadium:${result.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}`,
    name: result.name,
    capacity: result.capacity,
    sourceUrl: result.href,
  };
}

function parseSeasonYears(value: string): {
  startYear: number;
  endYear: number;
} {
  const decoded = decodeURIComponent(value).replace(/_/g, ' ');
  const range = decoded.match(/(20\d{2})\s*[–-]\s*(\d{2}|20\d{2})/);

  if (range) {
    const startYear = Number.parseInt(range[1], 10);
    const rawEndYear = Number.parseInt(range[2], 10);

    return {
      startYear,
      endYear:
        range[2].length === 2
          ? Math.floor(startYear / 100) * 100 + rawEndYear
          : rawEndYear,
    };
  }

  const calendarYear = decoded.match(/\b(20\d{2})\b/);

  if (calendarYear) {
    const year = Number.parseInt(calendarYear[1], 10);
    return { startYear: year, endYear: year };
  }

  const currentYear = new Date().getFullYear();
  return { startYear: currentYear, endYear: currentYear };
}

async function scrapeCurrentSeason(
  page: Page,
  competition: { name: string; sourceUrl: string },
): Promise<ScrapedSeason> {
  await page.goto(competition.sourceUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const result = await page.evaluate(() => {
    const normalize = (value: string | null): string =>
      (value ?? '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
    const rows = Array.from(
      document.querySelectorAll<HTMLTableRowElement>('table.infobox tr'),
    );
    const currentRow = rows.find((row) => {
      const label = normalize(
        row.querySelector<HTMLElement>(':scope > th')?.textContent ?? '',
      ).toLowerCase();

      return label === 'current season' || label === 'current';
    });
    const currentAnchor =
      currentRow?.querySelector<HTMLAnchorElement>('a[href]:not(.new)');
    const seasonAnchor =
      currentAnchor ??
      Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          'table.infobox a[href]:not(.new)',
        ),
      ).find((anchor) =>
        /20\d{2}\s*[–-]\s*(?:\d{2}|20\d{2})|\b20\d{2}\b/.test(
          normalize(anchor.textContent),
        ),
      );

    return {
      name: normalize(seasonAnchor?.textContent ?? document.title),
      href: seasonAnchor?.href ?? window.location.href,
    };
  });
  const years = parseSeasonYears(`${result.name} ${result.href}`);

  return {
    externalId: wikipediaExternalId(result.href, competition.sourceUrl),
    name:
      result.name ||
      (years.startYear === years.endYear
        ? String(years.startYear)
        : `${years.startYear}-${years.endYear}`),
    ...years,
    sourceUrl: result.href,
  };
}

async function scrapeReferees(
  page: Page,
  season: ScrapedSeason,
): Promise<ScrapedReferee[]> {
  await page.goto(season.sourceUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const referees = await page.evaluate(() => {
    const normalize = (value: string | null): string =>
      (value ?? '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
    const results: Array<{ name: string; href?: string }> = [];

    for (const row of document.querySelectorAll<HTMLTableRowElement>('tr')) {
      const cells = Array.from(
        row.querySelectorAll<HTMLElement>(':scope > th, :scope > td'),
      );
      const refereeIndex = cells.findIndex((cell) =>
        /^referee(?:s)?\b/i.test(normalize(cell.textContent)),
      );

      if (refereeIndex < 0) {
        continue;
      }

      const valueCell = cells[refereeIndex + 1] ?? cells[refereeIndex];
      const anchors = Array.from(
        valueCell.querySelectorAll<HTMLAnchorElement>(
          'a[href*="/wiki/"]:not(.new):not(.image)',
        ),
      );

      if (anchors.length > 0) {
        for (const anchor of anchors) {
          const name = normalize(anchor.textContent);
          if (name) results.push({ name, href: anchor.href });
        }
      } else {
        const name = normalize(valueCell.textContent).replace(
          /^referee(?:s)?\s*:?\s*/i,
          '',
        );
        if (name) results.push({ name });
      }
    }

    return results;
  });
  const unique = new Map<string, ScrapedReferee>();

  for (const referee of referees) {
    const externalId = referee.href
      ? wikipediaExternalId(referee.href, season.sourceUrl)
      : `wikipedia:referee:${referee.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}`;
    unique.set(externalId, {
      externalId,
      name: referee.name,
      sourceUrl: referee.href,
    });
  }

  return [...unique.values()];
}

async function scrapeTopScorers(
  page: Page,
  season: ScrapedSeason,
): Promise<ScrapedTopScorer[]> {
  await page.goto(season.sourceUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  return page.evaluate(() => {
    const normalize = (value: string | null): string =>
      (value ?? '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
    const numberValue = (value: string | null): number => {
      const match = normalize(value).match(/\d+/);
      return match ? Number.parseInt(match[0], 10) : 0;
    };
    const output: ScrapedTopScorer[] = [];

    for (const table of document.querySelectorAll<HTMLTableElement>('table')) {
      const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tr'));
      const headerRow = rows.find((row) => {
        const headers = Array.from(
          row.querySelectorAll<HTMLElement>(':scope > th, :scope > td'),
        ).map((cell) => normalize(cell.textContent).toLowerCase());

        return (
          headers.includes('player') &&
          headers.some((header) => ['goals', 'goal'].includes(header))
        );
      });

      if (!headerRow) continue;

      const headers = Array.from(
        headerRow.querySelectorAll<HTMLElement>(':scope > th, :scope > td'),
      ).map((cell) => normalize(cell.textContent).toLowerCase());
      const playerIndex = headers.indexOf('player');
      const goalsIndex = headers.findIndex((header) =>
        ['goals', 'goal'].includes(header),
      );
      const teamIndex = headers.findIndex((header) =>
        ['team', 'club'].includes(header),
      );
      const rankIndex = headers.findIndex((header) =>
        ['rank', 'pos', 'position', 'no.', 'no'].includes(header),
      );

      for (const [rowOffset, row] of rows
        .slice(rows.indexOf(headerRow) + 1)
        .entries()) {
        const cells = Array.from(
          row.querySelectorAll<HTMLElement>(':scope > th, :scope > td'),
        );
        const playerCell = cells[playerIndex];
        const playerAnchor = playerCell?.querySelector<HTMLAnchorElement>(
          'a[href*="/wiki/"]:not(.new):not(.image)',
        );
        const teamCell = teamIndex >= 0 ? cells[teamIndex] : undefined;
        const teamAnchor = teamCell?.querySelector<HTMLAnchorElement>(
          'a[href*="/wiki/"]:not(.new):not(.image)',
        );
        const playerName = normalize(
          playerAnchor?.textContent ?? playerCell?.textContent ?? '',
        );
        const goals = numberValue(cells[goalsIndex]?.textContent ?? '');

        if (!playerName || goals <= 0) continue;

        output.push({
          rank:
            rankIndex >= 0
              ? numberValue(cells[rankIndex]?.textContent ?? '') || rowOffset + 1
              : rowOffset + 1,
          goals,
          playerName,
          playerUrl: playerAnchor?.href,
          teamName: normalize(
            teamAnchor?.textContent ?? teamCell?.textContent ?? '',
          ) || undefined,
          teamUrl: teamAnchor?.href,
        });
      }
    }

    return output.filter(
      (scorer, index, scorers) =>
        scorers.findIndex(
          (candidate) =>
            (candidate.playerUrl || candidate.playerName) ===
            (scorer.playerUrl || scorer.playerName),
        ) === index,
    );
  });
}

async function scrapeClassement(
  page: Page,
  league: { name: string; sourceUrl: string },
): Promise<ScrapedClassementPage> {
  await page.goto(league.sourceUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const seasonUrl = await page.evaluate(() => {
    const normalize = (value: string | null): string =>
      (value ?? '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
    const infoboxRows = Array.from(
      document.querySelectorAll<HTMLTableRowElement>('table.infobox tr'),
    );
    const currentSeasonRow = infoboxRows.find((row) => {
      const label = normalize(
        row.querySelector<HTMLElement>(':scope > th')?.textContent ?? '',
      ).toLowerCase();

      return label === 'current season' || label === 'current';
    });
    const currentSeasonAnchor =
      currentSeasonRow?.querySelector<HTMLAnchorElement>(
        'a[href]:not(.new)',
      );

    if (currentSeasonAnchor) {
      return currentSeasonAnchor.href;
    }

    const seasonAnchor = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        'table.infobox a[href]:not(.new)',
      ),
    ).find((anchor) =>
      /20\d{2}\s*[–-]\s*(?:\d{2}|20\d{2})/.test(
        normalize(anchor.textContent),
      ),
    );

    return seasonAnchor?.href ?? window.location.href;
  });

  if (seasonUrl !== page.url()) {
    await page.goto(seasonUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  }

  const result = await page.evaluate(() => {
    const normalize = (value: string | null): string =>
      (value ?? '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
    const numberValue = (value: string | null): number => {
      const normalized = normalize(value).replace(/[−–]/g, '-');
      const matched = normalized.match(/[+-]?\d+/);

      return matched ? Number.parseInt(matched[0], 10) : 0;
    };
    const aliases = {
      position: ['pos', 'position'],
      team: ['team', 'club'],
      played: ['pld', 'played', 'mp'],
      won: ['w', 'won'],
      drawn: ['d', 'drawn'],
      lost: ['l', 'lost'],
      goalsFor: ['gf', 'goals for'],
      goalsAgainst: ['ga', 'goals against'],
      goalDifference: ['gd', 'goal difference'],
      points: ['pts', 'points'],
    };
    const tables = Array.from(document.querySelectorAll<HTMLTableElement>('table'));

    for (const table of tables) {
      const tableRows = Array.from(table.querySelectorAll('tr'));
      const headerRow = tableRows.find((row) => {
        const headers = Array.from(
          row.querySelectorAll<HTMLElement>(':scope > th, :scope > td'),
        ).map((cell) => normalize(cell.textContent).toLowerCase());

        return (
          headers.some((header) => aliases.position.includes(header)) &&
          headers.some((header) => aliases.team.includes(header)) &&
          headers.some((header) => aliases.played.includes(header)) &&
          headers.some((header) => aliases.points.includes(header))
        );
      });

      if (!headerRow) {
        continue;
      }

      const headers = Array.from(
        headerRow.querySelectorAll<HTMLElement>(':scope > th, :scope > td'),
      ).map((cell) => normalize(cell.textContent).toLowerCase());
      const indexOf = (values: string[]): number =>
        headers.findIndex((header) => values.includes(header));
      const indexes = {
        position: indexOf(aliases.position),
        team: indexOf(aliases.team),
        played: indexOf(aliases.played),
        won: indexOf(aliases.won),
        drawn: indexOf(aliases.drawn),
        lost: indexOf(aliases.lost),
        goalsFor: indexOf(aliases.goalsFor),
        goalsAgainst: indexOf(aliases.goalsAgainst),
        goalDifference: indexOf(aliases.goalDifference),
        points: indexOf(aliases.points),
      };
      const rows = tableRows
        .slice(tableRows.indexOf(headerRow) + 1)
        .map((row) => {
          const cells = Array.from(
            row.querySelectorAll<HTMLElement>(':scope > th, :scope > td'),
          );
          const teamCell = cells[indexes.team];
          const teamAnchor = teamCell?.querySelector<HTMLAnchorElement>(
            'a[href]:not(.new):not(.image)',
          );
          const position = numberValue(cells[indexes.position]?.textContent ?? '');
          const teamName = normalize(teamAnchor?.textContent ?? teamCell?.textContent ?? '');

          if (!position || !teamName) {
            return null;
          }

          return {
            position,
            teamName,
            teamUrl: teamAnchor?.href,
            played: numberValue(cells[indexes.played]?.textContent ?? ''),
            won: numberValue(cells[indexes.won]?.textContent ?? ''),
            drawn: numberValue(cells[indexes.drawn]?.textContent ?? ''),
            lost: numberValue(cells[indexes.lost]?.textContent ?? ''),
            goalsFor: numberValue(cells[indexes.goalsFor]?.textContent ?? ''),
            goalsAgainst: numberValue(
              cells[indexes.goalsAgainst]?.textContent ?? '',
            ),
            goalDifference: numberValue(
              cells[indexes.goalDifference]?.textContent ?? '',
            ),
            points: numberValue(cells[indexes.points]?.textContent ?? ''),
          };
        })
        .filter(
          (row): row is ScrapedClassementRow => row !== null,
        );

      if (rows.length > 0) {
        return {
          title: document.querySelector('h1')?.textContent ?? '',
          rows,
        };
      }
    }

    return {
      title: document.querySelector('h1')?.textContent ?? '',
      rows: [],
    };
  });
  const seasonText = `${decodeURIComponent(seasonUrl)} ${result.title}`;
  const seasonMatch = seasonText.match(/(20\d{2})\s*[–-]\s*(?:\d{2}|20\d{2})/);
  const seasonYear = seasonMatch
    ? Number.parseInt(seasonMatch[1], 10)
    : 2026;

  return {
    seasonUrl,
    seasonYear,
    rows: result.rows,
  };
}

/**
 * Menyimpan master tahun 2000-2026. Tahun menggunakan nilai numerik sebagai
 * identitas bisnis dan mempunyai _id MongoDB untuk relasi koleksi lain.
 */
export async function syncYears(): Promise<void> {
  syncState.phase = 'years';
  const years = Array.from({ length: 27 }, (_, index) => 2000 + index);

  await YearModel.bulkWrite(
    years.map((year) => ({
      updateOne: {
        filter: {
          year,
        },
        update: {
          $set: {
            externalId: `year:${year}`,
            name: String(year),
            year,
          },
        },
        upsert: true,
      },
    })),
  );
  syncState.yearsSaved = years.length;
}

/**
 * Menyimpan klasemen per league dan year. Team dicari lewat externalId
 * Wikipedia, lalu relasinya disimpan memakai _id MongoDB.
 */
export async function syncClassement(page: Page): Promise<void> {
  syncState.phase = 'classements';
  const leagues = await LeagueModel.find({
    sourceUrl: {
      $exists: true,
      $ne: null,
    },
  });
  const teams = await TeamModel.find({}, { externalId: 1, name: 1 });
  const teamsByExternalId = new Map(
    teams.map((team) => [team.externalId, team]),
  );
  const teamsByName = new Map(
    teams.map((team) => [team.name.toLowerCase(), team]),
  );

  for (const league of leagues) {
    if (!league.sourceUrl) {
      continue;
    }

    try {
      const classement = await scrapeClassement(page, {
        name: league.name,
        sourceUrl: league.sourceUrl,
      });
      const year = await YearModel.findOneAndUpdate(
        {
          year: classement.seasonYear,
        },
        {
          $set: {
            externalId: `year:${classement.seasonYear}`,
            name: String(classement.seasonYear),
            year: classement.seasonYear,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
      const operations = [];

      for (const row of classement.rows) {
        const teamExternalId = row.teamUrl
          ? wikipediaExternalId(row.teamUrl, classement.seasonUrl)
          : undefined;
        const team =
          (teamExternalId
            ? teamsByExternalId.get(teamExternalId)
            : undefined) ?? teamsByName.get(row.teamName.toLowerCase());

        if (!team) {
          syncState.classementTeamsMissing += 1;
          continue;
        }

        operations.push({
          updateOne: {
            filter: {
              league: league._id,
              year: year._id,
              team: team._id,
            },
            update: {
              $set: {
                externalId: `${league.externalId}:${classement.seasonYear}:${team.externalId}`,
                position: row.position,
                played: row.played,
                won: row.won,
                drawn: row.drawn,
                lost: row.lost,
                goalsFor: row.goalsFor,
                goalsAgainst: row.goalsAgainst,
                goalDifference: row.goalDifference,
                points: row.points,
                team: team._id,
                league: league._id,
                year: year._id,
                sourceUrl: classement.seasonUrl,
                scrapedAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      }

      if (operations.length > 0) {
        await ClassementModel.bulkWrite(operations);
        syncState.classementsSaved += operations.length;
      }

      console.log(
        `[classement] ${league.name}: ${operations.length} rows saved`,
      );
    } catch (error) {
      syncState.classementPagesFailed += 1;
      console.error(
        `[classement] Failed to synchronize ${league.name}:`,
        error instanceof Error ? error.message : error,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/**
 * Menyimpan master negara. externalId Wikipedia dipakai untuk upsert agar
 * proses scraping berikutnya memperbarui dokumen yang sama.
 */
export async function syncCountries(page: Page): Promise<void> {
  syncState.phase = 'countries';
  const countries = await scrapeCountries(page);

  for (const country of countries) {
    await CountryModel.updateOne(
      {
        externalId: country.externalId,
      },
      {
        $set: {
          name: country.name,
          flagUrl: country.imageUrl,
          imageUrl: country.imageUrl ?? null,
          mobileImageUrl: country.mobileImageUrl ?? null,
          sourceUrl: country.sourceUrl,
        },
      },
      {
        upsert: true,
      },
    );
    syncState.countriesSaved += 1;
  }
}

/**
 * Menyimpan stadion berdasarkan externalId dan menghubungkannya ke country
 * serta team menggunakan _id MongoDB.
 */
export async function syncStadium(
  page: Page,
  team: ScrapedTeam,
  teamId: Types.ObjectId,
  countryId: Types.ObjectId,
): Promise<void> {
  syncState.phase = 'stadiums';

  try {
    const stadium = await scrapeStadium(page, team);

    if (!stadium) {
      console.log(`[stadium] ${team.name}: stadium not available`);
      return;
    }

    await StadiumModel.updateOne(
      {
        externalId: stadium.externalId,
      },
      {
        $set: {
          name: stadium.name,
          capacity: stadium.capacity,
          imageUrl: null,
          mobileImageUrl: null,
          country: countryId,
          sourceUrl: stadium.sourceUrl,
          scrapedAt: new Date(),
        },
        $addToSet: {
          teams: teamId,
        },
      },
      {
        upsert: true,
      },
    );
    syncState.stadiumsSaved += 1;
    console.log(`[stadium] ${team.name}: ${stadium.name} saved`);
  } catch (error) {
    syncState.stadiumPagesFailed += 1;
    console.error(
      `[stadium] Failed to synchronize ${team.name}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Menyimpan pelatih berdasarkan externalId Wikipedia dan mengisi relasi team
 * dengan _id dokumen Team yang sudah disinkronkan.
 */
export async function syncCoach(
  page: Page,
  team: ScrapedTeam,
  teamId: Types.ObjectId,
): Promise<void> {
  syncState.phase = 'coaches';

  try {
    const coach = await scrapeCoach(page, team);

    if (!coach) {
      console.log(`[coach] ${team.name}: coach not available`);
      return;
    }

    await CoachModel.updateOne(
      {
        externalId: coach.externalId,
      },
      {
        $set: {
          name: coach.name,
          imageUrl: null,
          mobileImageUrl: null,
          team: teamId,
          sourceUrl: coach.sourceUrl,
          scrapedAt: new Date(),
        },
      },
      {
        upsert: true,
      },
    );
    syncState.coachesSaved += 1;
    console.log(`[coach] ${team.name}: ${coach.name} saved`);
  } catch (error) {
    syncState.coachPagesFailed += 1;
    console.error(
      `[coach] Failed to synchronize ${team.name}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Menyimpan current squad. externalId mengidentifikasi pemain dari Wikipedia,
 * sedangkan field team menyimpan _id MongoDB dari dokumen Team.
 */
export async function syncPlayers(
  page: Page,
  team: ScrapedTeam,
  teamId: Types.ObjectId,
): Promise<void> {
  syncState.phase = 'players';

  try {
    const teamPage = await scrapeCurrentSquad(page, team);

    if (teamPage.players.length > 0) {
      await PlayerModel.bulkWrite(
        teamPage.players.map((player) => ({
          updateOne: {
            filter: {
              externalId: player.externalId,
            },
            update: {
              $set: {
                name: player.name,
                position: player.position,
                nationality: player.nationality,
                imageUrl: null,
                mobileImageUrl: null,
                team: teamId,
                sourceUrl: player.sourceUrl,
                scrapedAt: new Date(),
              },
            },
            upsert: true,
          },
        })),
      );
      syncState.playersSaved += teamPage.players.length;
    }
  } catch (error) {
    syncState.teamPagesFailed += 1;
    console.error(
      `[players] Failed to synchronize ${team.name}:`,
      error instanceof Error ? error.message : error,
    );
  } finally {
    syncState.teamsProcessed += 1;
  }
}

/**
 * Mengambil gambar dari halaman Wikipedia team dan memperbarui dokumen lewat
 * _id internal tanpa membuat dokumen team baru.
 */
export async function syncTeamImage(
  page: Page,
  team: ScrapedTeam,
  teamId: Types.ObjectId,
): Promise<void> {
  try {
    const teamImage = await scrapeWikipediaImage(page, team.sourceUrl);

    await TeamModel.updateOne(
      {
        _id: teamId,
      },
      {
        $set: {
          imageUrl: teamImage.imageUrl ?? null,
          mobileImageUrl: teamImage.mobileImageUrl ?? null,
        },
      },
    );

    console.log(
      `[team-image] ${team.name}: ${
        teamImage.imageUrl ? 'image saved' : 'image not available'
      }`,
    );
  } catch (error) {
    await TeamModel.updateOne(
      {
        _id: teamId,
      },
      {
        $set: {
          imageUrl: null,
          mobileImageUrl: null,
        },
      },
    );

    console.error(
      `[team-image] Failed to synchronize ${team.name}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Menyimpan team berdasarkan externalId Wikipedia dan menghubungkannya ke
 * country serta leagues menggunakan _id MongoDB.
 */
export async function syncTeams(
  page: Page,
  league: ScrapedLeague,
  countryId: Types.ObjectId,
  leagueId: Types.ObjectId,
): Promise<void> {
  syncState.phase = 'teams';

  try {
    const leaguePage = await scrapeTeams(page, league);

    await LeagueModel.updateOne(
      {
        _id: leagueId,
      },
      {
        $set: {
          imageUrl: leaguePage.imageUrl ?? null,
          mobileImageUrl: leaguePage.mobileImageUrl ?? null,
        },
      },
    );

    if (leaguePage.teams.length === 0) {
      return;
    }

    await TeamModel.bulkWrite(
      leaguePage.teams.map((team) => ({
        updateOne: {
          filter: {
            externalId: team.externalId,
          },
          update: {
            $set: {
              name: team.name,
              country: countryId,
              imageUrl: team.imageUrl ?? null,
              mobileImageUrl: team.mobileImageUrl ?? null,
              sourceUrl: team.sourceUrl,
              scrapedAt: new Date(),
            },
            $addToSet: {
              leagues: leagueId,
            },
          },
          upsert: true,
        },
      })),
    );
    syncState.teamsSaved += leaguePage.teams.length;

    for (const team of leaguePage.teams) {
      const teamDocument = await TeamModel.findOne({
        externalId: team.externalId,
      });

      if (teamDocument) {
        await syncTeamImage(page, team, teamDocument._id);
        await syncStadium(page, team, teamDocument._id, countryId);
        await syncCoach(page, team, teamDocument._id);
        await syncPlayers(page, team, teamDocument._id);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  } catch {
    syncState.leaguePagesFailed += 1;
  } finally {
    syncState.leaguesProcessed += 1;
  }
}

/**
 * Menyimpan league berdasarkan externalId Wikipedia. Country dicari lebih
 * dahulu, kemudian country._id disimpan sebagai relasi pada League.
 */
export async function syncLeagues(page: Page): Promise<void> {
  syncState.phase = 'leagues';
  const leagues = await scrapeTopLeagues(page);
  syncState.leaguesDiscovered = leagues.length;

  for (const league of leagues) {
    const countryExternalId = `wikipedia:${league.countryName.replace(
      /\s+/g,
      '_',
    )}`;
    const country = await CountryModel.findOneAndUpdate(
      {
        $or: [
          { name: league.countryName },
          { externalId: countryExternalId },
        ],
      },
      {
        $setOnInsert: {
          externalId: countryExternalId,
          name: league.countryName,
          sourceUrl: wikipediaUrlForName(league.countryName),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
    const leagueDocument = await LeagueModel.findOneAndUpdate(
      {
        externalId: league.externalId,
        country: country._id,
      },
      {
        $set: {
          name: league.name,
          shortName: league.name,
          country: country._id,
          sourceUrl: league.sourceUrl,
          scrapedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
    syncState.leaguesSaved += 1;

    await syncTeams(page, league, country._id, leagueDocument._id);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/**
 * Menyimpan kompetisi piala berdasarkan externalId Wikipedia dan mengisi
 * relasi country menggunakan _id MongoDB.
 */
export async function syncCup(page: Page): Promise<void> {
  syncState.phase = 'cups';

  try {
    const cups = await scrapeCups(page);
    syncState.cupsDiscovered = cups.length;

    for (const cup of cups) {
      try {
        const countryExternalId = `wikipedia:${cup.countryName.replace(
          /\s+/g,
          '_',
        )}`;
        const country = await CountryModel.findOneAndUpdate(
          {
            $or: [
              { name: cup.countryName },
              { externalId: countryExternalId },
            ],
          },
          {
            $setOnInsert: {
              externalId: countryExternalId,
              name: cup.countryName,
              sourceUrl: wikipediaUrlForName(cup.countryName),
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          },
        );

        await CupModel.updateOne(
          {
            externalId: cup.externalId,
            country: country._id,
          },
          {
            $set: {
              name: cup.name,
              imageUrl: null,
              mobileImageUrl: null,
              country: country._id,
              sourceUrl: cup.sourceUrl,
              scrapedAt: new Date(),
            },
          },
          {
            upsert: true,
          },
        );
        syncState.cupsSaved += 1;
      } catch (error) {
        syncState.cupPagesFailed += 1;
        console.error(
          `[cup] Failed to synchronize ${cup.name}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    console.log(`[cup] ${syncState.cupsSaved} cups saved`);
  } catch (error) {
    syncState.cupPagesFailed += 1;
    console.error(
      '[cup] Failed to discover cups:',
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Menyimpan current season untuk setiap kompetisi. Season terhubung ke salah
 * satu league atau cup menggunakan _id MongoDB.
 */
export async function syncSeason(page: Page): Promise<void> {
  syncState.phase = 'seasons';
  const leagues = await LeagueModel.find({
    sourceUrl: { $exists: true, $ne: '' },
  });
  const cups = await CupModel.find({
    sourceUrl: { $exists: true, $ne: '' },
  });

  for (const competition of [
    ...leagues.map((league) => ({
      kind: 'league' as const,
      document: league,
    })),
    ...cups.map((cup) => ({ kind: 'cup' as const, document: cup })),
  ]) {
    try {
      const sourceUrl = competition.document.sourceUrl;

      if (!sourceUrl) {
        throw new Error('Competition source URL is not available');
      }

      const season = await scrapeCurrentSeason(page, {
        name: competition.document.name,
        sourceUrl,
      });
      const relation =
        competition.kind === 'league'
          ? { league: competition.document._id }
          : { cup: competition.document._id };

      await SeasonModel.updateMany(relation, {
        $set: { isCurrent: false },
      });
      await SeasonModel.updateOne(
        {
          ...relation,
          startYear: season.startYear,
        },
        {
          $set: {
            externalId: season.externalId,
            name: season.name,
            startYear: season.startYear,
            endYear: season.endYear,
            ...relation,
            isCurrent: true,
            sourceUrl: season.sourceUrl,
            scrapedAt: new Date(),
          },
        },
        { upsert: true },
      );
      syncState.seasonsSaved += 1;
      console.log(
        `[season] ${competition.document.name}: ${season.name} saved`,
      );
    } catch (error) {
      syncState.seasonPagesFailed += 1;
      console.error(
        `[season] Failed to synchronize ${competition.document.name}:`,
        error instanceof Error ? error.message : error,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/**
 * Menyimpan master wasit yang ditemukan pada halaman season. externalId
 * Wikipedia mencegah wasit yang sama dibuat berulang kali.
 */
export async function syncReferee(page: Page): Promise<void> {
  syncState.phase = 'referees';
  const seasons = await SeasonModel.find();

  for (const seasonDocument of seasons) {
    const season: ScrapedSeason = {
      externalId: seasonDocument.externalId,
      name: seasonDocument.name,
      startYear: seasonDocument.startYear,
      endYear: seasonDocument.endYear,
      sourceUrl: seasonDocument.sourceUrl,
    };

    try {
      const referees = await scrapeReferees(page, season);

      if (referees.length > 0) {
        await RefereeModel.bulkWrite(
          referees.map((referee) => ({
            updateOne: {
              filter: { externalId: referee.externalId },
              update: {
                $set: {
                  name: referee.name,
                  imageUrl: null,
                  mobileImageUrl: null,
                  sourceUrl: referee.sourceUrl,
                  scrapedAt: new Date(),
                },
              },
              upsert: true,
            },
          })),
        );
        syncState.refereesSaved += referees.length;
      }
      console.log(
        `[referee] ${season.name}: ${referees.length} referees saved`,
      );
    } catch (error) {
      syncState.refereePagesFailed += 1;
      console.error(
        `[referee] Failed to synchronize ${season.name}:`,
        error instanceof Error ? error.message : error,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/**
 * Menyimpan top scorer per season. Player dan team dicocokkan lewat externalId,
 * lalu _id player, team, season, dan league/cup disimpan sebagai relasi.
 */
export async function syncTopScorer(page: Page): Promise<void> {
  syncState.phase = 'topScorers';
  const seasons = await SeasonModel.find();
  const players = await PlayerModel.find();
  const teams = await TeamModel.find();
  const playersByExternalId = new Map(
    players.map((player) => [player.externalId, player]),
  );
  const playersByName = new Map(
    players.map((player) => [player.name.toLowerCase(), player]),
  );
  const teamsByExternalId = new Map(
    teams.map((team) => [team.externalId, team]),
  );
  const teamsByName = new Map(
    teams.map((team) => [team.name.toLowerCase(), team]),
  );

  for (const seasonDocument of seasons) {
    const season: ScrapedSeason = {
      externalId: seasonDocument.externalId,
      name: seasonDocument.name,
      startYear: seasonDocument.startYear,
      endYear: seasonDocument.endYear,
      sourceUrl: seasonDocument.sourceUrl,
    };

    try {
      const scorers = await scrapeTopScorers(page, season);

      for (const scorer of scorers) {
        // externalId menghubungkan hasil Wikipedia dengan dokumen master yang
        // sudah ada tanpa bergantung pada nama yang dapat berubah.
        const playerExternalId = scorer.playerUrl
          ? wikipediaExternalId(scorer.playerUrl, season.sourceUrl)
          : undefined;
        const player =
          (playerExternalId
            ? playersByExternalId.get(playerExternalId)
            : undefined) ?? playersByName.get(scorer.playerName.toLowerCase());

        if (!player) {
          syncState.topScorerPlayersMissing += 1;
          console.log(
            `[top-scorer] ${season.name}: player ${scorer.playerName} is not in players`,
          );
          continue;
        }

        const teamExternalId = scorer.teamUrl
          ? wikipediaExternalId(scorer.teamUrl, season.sourceUrl)
          : undefined;
        const team =
          (teamExternalId
            ? teamsByExternalId.get(teamExternalId)
            : undefined) ??
          (scorer.teamName
            ? teamsByName.get(scorer.teamName.toLowerCase())
            : undefined);
        const relation = seasonDocument.league
          ? { league: seasonDocument.league }
          : { cup: seasonDocument.cup };

        await TopScorerModel.updateOne(
          {
            season: seasonDocument._id,
            player: player._id,
          },
          {
            $set: {
              externalId: `${season.externalId}:${player.externalId}`,
              rank: scorer.rank,
              goals: scorer.goals,
              // Relasi disimpan sebagai _id MongoDB agar dapat di-populate.
              player: player._id,
              team: team?._id,
              season: seasonDocument._id,
              ...relation,
              sourceUrl: season.sourceUrl,
              scrapedAt: new Date(),
            },
          },
          { upsert: true },
        );
        syncState.topScorersSaved += 1;
      }
      console.log(
        `[top-scorer] ${season.name}: ${scorers.length} rows found`,
      );
    } catch (error) {
      syncState.topScorerPagesFailed += 1;
      console.error(
        `[top-scorer] Failed to synchronize ${season.name}:`,
        error instanceof Error ? error.message : error,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

async function runWikipediaMasterSync(): Promise<void> {
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
  });
  activeBrowsers.add(browser);

  try {
    const page = await browser.newPage();
    await configurePage(page);

    await syncYears();
    await syncCountries(page);
    await syncLeagues(page);
    await syncCup(page);
    await syncSeason(page);
    await syncClassement(page);
    await syncTopScorer(page);
    await syncReferee(page);

    syncState.status = 'completed';
    syncState.phase = 'completed';
    syncState.finishedAt = new Date().toISOString();
  } catch (error) {
    syncState.status = 'failed';
    syncState.error = error instanceof Error ? error.message : 'Unknown error';
    syncState.finishedAt = new Date().toISOString();
  } finally {
    activeBrowsers.delete(browser);

    if (browser.connected) {
      await browser.close();
    }
  }
}

export function getOrStartWikipediaMasterSync(): WikipediaSyncState {
  if (!activeSync && syncState.status === 'idle') {
    syncState = {
      ...createIdleState(),
      status: 'running',
      phase: 'years',
      startedAt: new Date().toISOString(),
    };
    activeSync = runWikipediaMasterSync().finally(() => {
      activeSync = undefined;
    });
  }

  return {
    ...syncState,
  };
}
