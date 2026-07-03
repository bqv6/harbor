import { parse, type DefaultParserResult } from "parse-torrent-title";
import type { DebridSlug, ParsedStream, Stream } from "../types";
import { mapResolution } from "./parser-resolution";
import { detectHdr } from "./parser-hdr";
import { mapCodec } from "./parser-codec";
import { detectSource } from "./parser-source";
import { parseAudio } from "./parser-audio";
import { parseLanguages } from "./parser-language";
import { parseCacheFlags } from "./parser-cache-flags";
import { extractFilenameLine } from "./parser-filename";
import {
  computeScamScore,
  parseAnimeHash,
  parseContainer,
  parseDisc,
  parseEdition,
  parseEpisodeTitle,
  parseRepackIteration,
  parseSeasonPack,
  parseSeeders,
  parseSize,
  parseYearRange,
} from "./parser-metadata";

const REMUX_RX = /\bRemux\b/i;
const HARDCODED_RX = /\b(HC|HARDCODED|HARDSUB)\b/i;

// Season-pack detection that inspects each source line separately
// release named "...S04..." whose inner file is "...S04E03..." is still
// recognised as a whole-season (or whole-series) pack.
const SP_EPISODE_RX = /\bS\d{1,2}\s*[._-]?\s*E\d{1,3}\b|\bE\d{1,3}\b|\bEpisode\s*\d{1,3}\b|\b\d{1,2}x\d{1,3}\b/i;
const SP_SEASON_RX = /\bS\d{1,2}\b|\bSeason\s*\d{1,2}\b/i;
const SP_SEASON_RANGE_RX = /\bS\d{1,2}\s*[-\u2013]\s*S?\d{1,2}\b|\bSeasons?\s*\d{1,2}\s*(?:[-\u2013]|to)\s*\d{1,2}\b/i;
const SP_COMPLETE_RX = /\bComplete\b/i;
const SP_SERIESISH_RX = /\bS\d{1,2}\b|\bSeasons?\b|\bSeries\b/i;

function detectSeasonPackFromNames(stream: Stream): boolean {
  const lines: string[] = [];
  for (const raw of [stream.name, stream.title, stream.description]) {
    if (!raw) continue;
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (t) lines.push(t);
    }
  }
  // Explicit multi-season ranges or "complete" collections are always packs.
  for (const line of lines) {
    if (SP_SEASON_RANGE_RX.test(line)) return true;
    if (SP_COMPLETE_RX.test(line) && SP_SERIESISH_RX.test(line)) return true;
  }
  // A line that carries a season marker but no episode marker means the
  // release name is shared across every episode -> season pack.
  for (const line of lines) {
    if (SP_SEASON_RX.test(line) && !SP_EPISODE_RX.test(line)) return true;
  }
  return false;
}

export function parseStream(stream: Stream): ParsedStream {
  const filenameLine = extractFilenameLine(stream);
  const text = [filenameLine, stream.title, stream.description, stream.name]
    .filter(Boolean)
    .join(" ");
  const ptt = parse(filenameLine || text) as DefaultParserResult;

  const resolution = mapResolution(ptt.resolution);
  const hdrFormat = detectHdr(text);
  const codec = mapCodec(ptt.codec ?? "");
  const source = detectSource(text);
  const audio = parseAudio(text, ptt);
  const audioLanguages = parseLanguages(text);
  const size = parseSize(text, stream.behaviorHints?.videoSize);
  const seeders = parseSeeders(text);
  const cached = parseCacheFlags(text, stream.behaviorHints?.bingeGroup, stream.addonName, stream.url);
  const inLibrary: Partial<Record<DebridSlug, boolean>> = {};
  const container = parseContainer(stream.behaviorHints?.filename, filenameLine, text);
  const releaseGroup = ptt.group ?? null;
  const releaseGroupNormalized = releaseGroup
    ? releaseGroup.toUpperCase().replace(/[^A-Z0-9]/g, "")
    : null;
  const remux = REMUX_RX.test(text);
  const edition = parseEdition(text, ptt);
  const year = ptt.year ?? null;
  const yearRange = parseYearRange(text);
  const season = ptt.season ?? null;
  const episode = ptt.episode ?? null;
  const seasonPack = parseSeasonPack(text, ptt) || detectSeasonPackFromNames(stream);
  const discIndex = parseDisc(text);
  const repackIteration = parseRepackIteration(text, ptt);
  const proper = ptt.proper === true;
  const hardcoded = HARDCODED_RX.test(text) || ptt.hardcoded === true;
  const animeHash = parseAnimeHash(text);
  const scamScore = computeScamScore(source, resolution, size);

  return {
    ...stream,
    parsedTitle: ptt.title ?? filenameLine.slice(0, 100) ?? text.slice(0, 100),
    episodeTitle: parseEpisodeTitle(filenameLine, ptt.season, ptt.episode),
    resolution,
    hdrFormat,
    codec,
    source,
    audio,
    audioLanguages,
    size,
    seeders,
    cached,
    inLibrary,
    container,
    releaseGroup,
    releaseGroupNormalized,
    remux,
    edition,
    year,
    yearRange,
    season,
    episode,
    seasonPack,
    discIndex,
    repackIteration,
    proper,
    hardcoded,
    animeHash,
    scamScore,
  };
}
