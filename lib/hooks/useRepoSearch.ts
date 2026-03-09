import { useState, useEffect, useRef, useCallback } from "react";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";

const REPO_FULL_LIST_CACHE_KEY = "user_repositories_full_list";
const REPO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MIN_SEARCH_CHARS = 2;
const DEBOUNCE_MS = 300;
const SEARCH_QUERY_MAX_LENGTH = 200;
const PAGE_SIZE = 100;

interface CachedRepoSearchResult {
  repos: any[];
  hasNextPage: boolean;
  nextOffset: number;
}

function storageGet(key: string): any[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function storageSet(key: string, value: any[], ttl: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify({ value, expiry: Date.now() + ttl }));
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** Truncate to backend limit; use for API param only. */
function truncateSearchQuery(query: string): string {
  return query.trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
}

export interface UseRepoSearchOptions {
  /** Set to true (or a reactive boolean like `popoverOpen`) to trigger the initial fetch. */
  enabled?: boolean;
}

export interface UseRepoSearchResult {
  /** Repos to display — from full-list cache (< 2 chars) or per-query cache / server (≥ 2 chars). */
  displayedRepos: any[];
  /** True while the initial full list (no search) is being loaded. */
  isLoading: boolean;
  /** True while a server-side search request is in-flight. */
  isSearching: boolean;
  /** Current search input value — bind to controlled input. */
  searchInput: string;
  /** Call from input onValueChange/onChange. Debounces and drives hybrid search. */
  handleSearchChange: (value: string) => void;
  /** Whether more paginated results are available for the current search. */
  hasNextPage: boolean;
  /** Fetches the next page of server-side search results and appends them. */
  loadMore: () => void;
  /** Clears full-list and per-query caches, re-fetches full list (no search). */
  refresh: () => void;
}

/**
 * Hybrid repo search: server-side filtering when user types 2+ chars, with caching.
 *
 * - Full-list cache: one fetch with no search param; used when input is empty or &lt; 2 chars.
 *   Stored in memory + localStorage (5 min TTL).
 * - Per-query cache: in-memory Map(normalizedQuery → { repos, hasNextPage, nextOffset }).
 *   When user types 2+ chars we use searchUserRepositories (paginated); loadMore appends.
 * - Search term sent to API is trimmed and truncated to 200 chars (backend contract).
 */
export function useRepoSearch({ enabled = true }: UseRepoSearchOptions = {}): UseRepoSearchResult {
  const [searchInput, setSearchInput] = useState("");
  const [displayedRepos, setDisplayedRepos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);

  /** Full list (no search) — in-memory + optional localStorage. */
  const fullListRef = useRef<any[] | null>(null);
  /** Per-query cache: normalized key → { repos, hasNextPage, nextOffset }. */
  const queryCacheRef = useRef<Map<string, CachedRepoSearchResult>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFetchedFullListRef = useRef(false);
  const currentSearchKeyRef = useRef<string | null>(null);

  const applySearch = useCallback(async (query: string) => {
    const normalized = normalizeQuery(query);

    if (normalized.length < MIN_SEARCH_CHARS) {
      const list = fullListRef.current ?? [];
      setDisplayedRepos(list);
      setHasNextPage(false);
      currentSearchKeyRef.current = null;
      return;
    }

    const cacheKey = normalized;
    const cached = queryCacheRef.current.get(cacheKey);
    if (cached !== undefined) {
      currentSearchKeyRef.current = cacheKey;
      setDisplayedRepos(cached.repos);
      setHasNextPage(cached.hasNextPage);
      return;
    }

    const searchParam = truncateSearchQuery(query);
    setIsSearching(true);
    currentSearchKeyRef.current = cacheKey;
    try {
      const result = await BranchAndRepositoryService.searchUserRepositories({
        search: searchParam,
        limit: PAGE_SIZE,
        offset: 0,
      });
      const repos = result.repositories ?? [];
      const hasNext = result.has_next_page ?? false;
      queryCacheRef.current.set(cacheKey, {
        repos,
        hasNextPage: hasNext,
        nextOffset: PAGE_SIZE,
      });
      setDisplayedRepos(repos);
      setHasNextPage(hasNext);
    } catch {
      currentSearchKeyRef.current = null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      const normalized = normalizeQuery(value);

      if (normalized.length < MIN_SEARCH_CHARS) {
        setDisplayedRepos(fullListRef.current ?? []);
        setHasNextPage(false);
        currentSearchKeyRef.current = null;
        return;
      }

      debounceRef.current = setTimeout(() => applySearch(value), DEBOUNCE_MS);
    },
    [applySearch]
  );

  // Initial load: full list (no search), once when enabled.
  useEffect(() => {
    if (!enabled || hasFetchedFullListRef.current) return;
    hasFetchedFullListRef.current = true;

    const fromStorage = storageGet(REPO_FULL_LIST_CACHE_KEY);
    if (fromStorage) {
      fullListRef.current = fromStorage;
      setDisplayedRepos(fromStorage);
      return;
    }

    setIsLoading(true);
    BranchAndRepositoryService.getUserRepositories()
      .then((repos) => {
        const list = repos ?? [];
        fullListRef.current = list;
        setDisplayedRepos(list);
        storageSet(REPO_FULL_LIST_CACHE_KEY, list, REPO_CACHE_TTL);
      })
      .catch(() => {
        fullListRef.current = [];
        setDisplayedRepos([]);
      })
      .finally(() => setIsLoading(false));
  }, [enabled]);

  const loadMore = useCallback(() => {
    const key = currentSearchKeyRef.current;
    if (!key || !hasNextPage || isSearching || !searchInput.trim()) return;
    const cached = queryCacheRef.current.get(key);
    if (!cached || !cached.hasNextPage) return;

    setIsSearching(true);
    BranchAndRepositoryService.searchUserRepositories({
      search: truncateSearchQuery(searchInput),
      limit: PAGE_SIZE,
      offset: cached.nextOffset,
    })
      .then((result: { repositories: any[]; has_next_page: boolean }) => {
        const newRepos = result.repositories ?? [];
        const combined = [...cached.repos, ...newRepos];
        const hasNext = result.has_next_page ?? false;
        queryCacheRef.current.set(key, {
          repos: combined,
          hasNextPage: hasNext,
          nextOffset: cached.nextOffset + PAGE_SIZE,
        });
        setDisplayedRepos(combined);
        setHasNextPage(hasNext);
      })
      .catch((err) => {
        console.error("Error loading more repositories:", err);
        // Keep displayedRepos and hasNextPage unchanged on error
      })
      .finally(() => setIsSearching(false));
  }, [hasNextPage, isSearching, searchInput]);

  const refresh = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(REPO_FULL_LIST_CACHE_KEY);
    }
    fullListRef.current = null;
    queryCacheRef.current.clear();
    hasFetchedFullListRef.current = false;
    currentSearchKeyRef.current = null;
    setSearchInput("");
    setDisplayedRepos([]);
    setHasNextPage(false);
    setIsLoading(true);

    BranchAndRepositoryService.getUserRepositories()
      .then((repos) => {
        const list = repos ?? [];
        fullListRef.current = list;
        setDisplayedRepos(list);
        storageSet(REPO_FULL_LIST_CACHE_KEY, list, REPO_CACHE_TTL);
      })
      .catch(() => {
        fullListRef.current = [];
        setDisplayedRepos([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    displayedRepos,
    isLoading,
    isSearching,
    searchInput,
    handleSearchChange,
    hasNextPage,
    loadMore,
    refresh,
  };
}
