import type { Browser, Page } from 'puppeteer' with {
  'resolution-mode': 'import',
};
import type { Types } from 'mongoose';

import { CountryModel } from '../models/country';
import { LeagueModel } from '../models/league';
import { PlayerModel } from '../models/player';
import { TeamModel } from '../models/team';

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
  imageUrl?: string;
  mobileImageUrl?: string;
  sourceUrl?: string;
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
    | 'countries'
    | 'leagues'
    | 'teams'
    | 'players'
    | 'completed';
  countriesSaved: number;
  leaguesDiscovered: number;
  leaguesSaved: number;
  leaguesProcessed: number;
  leaguePagesFailed: number;
  teamsSaved: number;
  teamsProcessed: number;
  teamPagesFailed: number;
  playersSaved: number;
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
    countriesSaved: 0,
    leaguesDiscovered: 0,
    leaguesSaved: 0,
    leaguesProcessed: 0,
    leaguePagesFailed: 0,
    teamsSaved: 0,
    teamsProcessed: 0,
    teamPagesFailed: 0,
    playersSaved: 0,
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

function wikimediaImageUrl(
  sourceUrl: string | undefined,
  width: number,
): string | undefined {
  if (!sourceUrl) {
    return undefined;
  }

  try {
    const url = new URL(sourceUrl);

    if (
      url.hostname !== 'upload.wikimedia.org' ||
      !url.pathname.includes('/thumb/')
    ) {
      return sourceUrl;
    }

    const parts = url.pathname.split('/');
    const filename = parts.at(-1);

    if (!filename) {
      return sourceUrl;
    }

    parts[parts.length - 1] = filename.replace(/^\d+px-/, `${width}px-`);
    url.pathname = parts.join('/');

    return url.toString();
  } catch {
    return sourceUrl;
  }
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
    imageUrl: wikimediaImageUrl(sourceImageUrl, 800),
    mobileImageUrl: wikimediaImageUrl(sourceImageUrl, 320),
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
      imageUrl: wikimediaImageUrl(row.imageUrl, 800),
      mobileImageUrl: wikimediaImageUrl(row.imageUrl, 320),
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
          !/(1st[\s-]*tier|first[\s-]*tier|top[\s-]*tier|national pro league)/i.test(
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
      const hasMasterAttribute = headers.some((header) =>
        /(location|stadium|ground|founded)/.test(header),
      );

      return hasTeam && hasMasterAttribute;
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

        if (cells.length !== headers.length) {
          return null;
        }

        const anchor = cells[teamColumnIndex]?.querySelector<HTMLAnchorElement>(
          'a[href*="wikipedia.org/wiki/"]:not(.image)',
        );
        const name = anchor?.textContent?.trim();

        if (!anchor || !name || anchor.classList.contains('new')) {
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
    imageUrl: wikimediaImageUrl(result.imageUrl, 800),
    mobileImageUrl: wikimediaImageUrl(result.imageUrl, 320),
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
      return id === 'current squad' || id === 'first team squad';
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
    imageUrl: wikimediaImageUrl(result.imageUrl, 800),
    mobileImageUrl: wikimediaImageUrl(result.imageUrl, 320),
  };
}

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

export async function syncPlayers(
  page: Page,
  team: ScrapedTeam,
  teamId: Types.ObjectId,
): Promise<void> {
  syncState.phase = 'players';

  try {
    const teamPage = await scrapeCurrentSquad(page, team);

    for (const player of teamPage.players) {
      if (!player.sourceUrl) {
        continue;
      }

      try {
        const playerImage = await scrapeWikipediaImage(page, player.sourceUrl);
        player.imageUrl = playerImage.imageUrl;
        player.mobileImageUrl = playerImage.mobileImageUrl;
      } catch (error) {
        console.error(
          `[player-image] Failed to synchronize ${player.name}:`,
          error instanceof Error ? error.message : error,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

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
                imageUrl: player.imageUrl ?? null,
                mobileImageUrl: player.mobileImageUrl ?? null,
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

async function runWikipediaMasterSync(): Promise<void> {
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
  });
  activeBrowsers.add(browser);

  try {
    const page = await browser.newPage();
    await configurePage(page);

    await syncCountries(page);
    await syncLeagues(page);

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
      phase: 'countries',
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
