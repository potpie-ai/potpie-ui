import { useState, useEffect, useRef, useCallback } from "react";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";

const BRANCH_FULL_LIST_CACHE_KEY_PREFIX = "branches_full_list_";
const BRANCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MIN_SEARCH_CHARS = 2;
const DEBOUNCE_MS = 300;
const SEARCH_QUERY_MAX_LENGTH = 200;
const PAGE_SIZE = 100;

interface CachedSearchResult {
  branches: string[];
  hasNextPage: boolean;
  nextOffset: number;
}

function branchFullListCacheKey(repoName: string): string {
  return `${BRANCH_FULL_LIST_CACHE_KEY_PREFIX}${repoName}`;
}

function storageGet(key: string): string[] | null {
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

function storageSet(key: string, value: string[], ttl: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify({ value, expiry: Date.now() + ttl }));
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function truncateSearchQuery(query: string): string {
  return query.trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
}

export interface UseBranchSearchOptions {
  repoName: string;
  /** Set to true (or a reactive boolean like `popoverOpen && !!repoName`) to trigger the fetch. */
  enabled?: boolean;
}

export interface UseBranchSearchResult {
  /** Branches to display — from full-list cache (< 2 chars) or per-query cache / server (≥ 2 chars). */
  displayedBranches: string[];
  /** True while the initial full list (no search) is being loaded. */
  isLoading: boolean;
  /** True while a server-side search request is in-flight. */
  isSearching: boolean;
  /** Current search input value — bind to controlled input. */
  searchInput: string;
  /** Call from input onValueChange/onChange. Debounces and drives hybrid search. */
  handleSearchChange: (value: string) => void;
  /** Whether more paginated results are available from the server for the current search. */
  hasNextPage: boolean;
  /** Fetches the next page of server-side search results and appends them. */
  loadMore: () => void;
  /** Clears full-list and per-query caches for this repo, re-fetches full list (no search). */
  refresh: () => void;
}

/**
 * Hybrid branch search: server-side filtering when user types 2+ chars, with caching.
 *
 * - Full-list cache: one fetch with no search param per repo; used when input is empty or < 2 chars.
 *   Stored in memory + localStorage (5 min TTL), keyed by repo.
 * - Per-query cache: in-memory Map(normalizedQuery → { branches, hasNextPage, nextOffset }).
 *   When user types 2+ chars we use searchBranches (paginated); cache stores first page and loadMore appends.
 * - Search term sent to API is trimmed and truncated to 200 chars (backend contract).
 * - Resets when repoName changes (clears caches and refetches for the new repo).
 */
export function useBranchSearch({
  repoName,
  enabled = true,
}: UseBranchSearchOptions): UseBranchSearchResult {
  const [searchInput, setSearchInput] = useState("");
  const [displayedBranches, setDisplayedBranches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);

  /** Full list (no search) for current repo — in-memory + optional localStorage. */
  const fullListRef = useRef<string[] | null>(null);
  /** Per-query cache: normalized key → { branches, hasNextPage, nextOffset }. */
  const queryCacheRef = useRef<Map<string, CachedSearchResult>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFetchedFullListRef = useRef(false);
  const currentRepoRef = useRef(repoName);
  /** Current search cache key when in search mode (for loadMore). */
  const currentSearchKeyRef = useRef<string | null>(null);

  // Reset when repoName changes
  useEffect(() => {
    if (currentRepoRef.current === repoName) return;
    currentRepoRef.current = repoName;
    fullListRef.current = null;
    queryCacheRef.current.clear();
    hasFetchedFullListRef.current = false;
    currentSearchKeyRef.current = null;
    setSearchInput("");
    setDisplayedBranches([]);
    setHasNextPage(false);
  }, [repoName]);

  const applySearch = useCallback(async (query: string, repo: string) => {
    const normalized = normalizeQuery(query);

    // Below min chars: show full list from cache only; never call API with search.
    if (normalized.length < MIN_SEARCH_CHARS) {
      const list = fullListRef.current ?? [];
      setDisplayedBranches(list);
      setHasNextPage(false);
      currentSearchKeyRef.current = null;
      return;
    }

    const cacheKey = normalized;
    const cached = queryCacheRef.current.get(cacheKey);
    if (cached !== undefined) {
      currentSearchKeyRef.current = cacheKey;
      setDisplayedBranches(cached.branches);
      setHasNextPage(cached.hasNextPage);
      return;
    }

    const searchParam = truncateSearchQuery(query);
    setIsSearching(true);
    currentSearchKeyRef.current = cacheKey;
    try {
      const result = await BranchAndRepositoryService.searchBranches(repo, {
        search: searchParam,
        limit: PAGE_SIZE,
        offset: 0,
      });
      const branches = result.branches ?? [];
      const hasNext = result.has_next_page ?? false;
      const nextOffset = PAGE_SIZE;
      queryCacheRef.current.set(cacheKey, {
        branches,
        hasNextPage: hasNext,
        nextOffset,
      });
      setDisplayedBranches(branches);
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
        setDisplayedBranches(fullListRef.current ?? []);
        setHasNextPage(false);
        currentSearchKeyRef.current = null;
        return;
      }

      debounceRef.current = setTimeout(
        () => applySearch(value, currentRepoRef.current),
        DEBOUNCE_MS
      );
    },
    [applySearch]
  );

  // Initial load: full list (no search) for this repo, once when enabled and repoName set.
  useEffect(() => {
    if (!enabled || !repoName || hasFetchedFullListRef.current || currentRepoRef.current !== repoName) return;
    hasFetchedFullListRef.current = true;

    const key = branchFullListCacheKey(repoName);
    const fromStorage = storageGet(key);
    if (fromStorage) {
      fullListRef.current = fromStorage;
      setDisplayedBranches(fromStorage);
      return;
    }

    setIsLoading(true);
    BranchAndRepositoryService.getBranchList(repoName)
      .then((data: any) => {
        const branches: string[] = Array.isArray(data) ? data : (data?.branches ?? []);
        fullListRef.current = branches;
        setDisplayedBranches(branches);
        storageSet(key, branches, BRANCH_CACHE_TTL);
      })
      .catch(() => {
        fullListRef.current = [];
        setDisplayedBranches([]);
      })
      .finally(() => setIsLoading(false));
  }, [enabled, repoName]);

  const loadMore = useCallback(() => {
    const key = currentSearchKeyRef.current;
    if (!key || !hasNextPage || isSearching || !searchInput.trim()) return;
    const cached = queryCacheRef.current.get(key);
    if (!cached || !cached.hasNextPage) return;

    const repo = currentRepoRef.current;
    const searchParam = truncateSearchQuery(searchInput);
    setIsSearching(true);
    BranchAndRepositoryService.searchBranches(repo, {
      search: searchParam,
      limit: PAGE_SIZE,
      offset: cached.nextOffset,
    })
      .then((result: { branches: string[]; has_next_page: boolean }) => {
        const newBranches = result.branches ?? [];
        const combined = [...cached.branches, ...newBranches];
        const hasNext = result.has_next_page ?? false;
        const nextOffset = cached.nextOffset + PAGE_SIZE;
        queryCacheRef.current.set(key, {
          branches: combined,
          hasNextPage: hasNext,
          nextOffset,
        });
        setDisplayedBranches(combined);
        setHasNextPage(hasNext);
      })
      .finally(() => setIsSearching(false));
  }, [hasNextPage, isSearching, searchInput]);

  const refresh = useCallback(() => {
    if (!repoName) return;
    const key = branchFullListCacheKey(repoName);
    if (typeof window !== "undefined") localStorage.removeItem(key);
    fullListRef.current = null;
    queryCacheRef.current.clear();
    hasFetchedFullListRef.current = false;
    currentSearchKeyRef.current = null;
    setSearchInput("");
    setDisplayedBranches([]);
    setHasNextPage(false);
    setIsLoading(true);

    BranchAndRepositoryService.getBranchList(repoName)
      .then((data: any) => {
        const branches: string[] = Array.isArray(data) ? data : (data?.branches ?? []);
        fullListRef.current = branches;
        setDisplayedBranches(branches);
        storageSet(key, branches, BRANCH_CACHE_TTL);
      })
      .catch(() => {
        fullListRef.current = [];
        setDisplayedBranches([]);
      })
      .finally(() => setIsLoading(false));
  }, [repoName]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    displayedBranches,
    isLoading,
    isSearching,
    searchInput,
    handleSearchChange,
    hasNextPage,
    loadMore,
    refresh,
  };
}
