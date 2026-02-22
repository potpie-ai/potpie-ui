import { useState, useEffect, useRef, useCallback } from "react";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";

const BRANCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MIN_SEARCH_CHARS = 2;
const DEBOUNCE_MS = 300;
const PAGE_SIZE = 100;

function branchCacheKey(repoName: string) {
    return `branches_${repoName}`;
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

export interface UseBranchSearchOptions {
    repoName: string;
    /** Set to true (or a reactive boolean like `popoverOpen && !!repoName`) to trigger the fetch. */
    enabled?: boolean;
}

export interface UseBranchSearchResult {
    /** Filtered branches to display — already reflects the current search query. */
    displayedBranches: string[];
    /** True while the initial full branch list is being loaded. */
    isLoading: boolean;
    /** True while a server-side search request is in-flight. */
    isSearching: boolean;
    /** Current value of the search input — bind to <CommandInput value={...}> */
    searchInput: string;
    /** Call this from onValueChange of <CommandInput> */
    handleSearchChange: (value: string) => void;
    /** Whether more paginated results are available from the server. */
    hasNextPage: boolean;
    /** Fetches the next page of server-side search results and appends them. */
    loadMore: () => void;
    /** Clears all caches for this repo and re-fetches the branch list. */
    refresh: () => void;
}

/**
 * Hybrid branch search hook.
 *
 * Search flow (fires after 2 chars, 300 ms debounce):
 *   1. Filter client-side from the in-memory full-list cache for this repo.
 *   2. If full list isn't cached → server-side search with pagination,
 *      cache results keyed by search term.
 *   3. If server returns has_next_page=true, expose loadMore() for pagination.
 *
 * Resets automatically when repoName changes.
 *
 * Caching layers:
 *   • localStorage – full branch list per repo, 5-min TTL
 *   • In-memory ref – full list for instant access (session lifetime)
 *   • In-memory Map – per-search-term results (session lifetime)
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
    const [currentOffset, setCurrentOffset] = useState(0);

    // Full unfiltered branch list for this repo
    const fullCacheRef = useRef<string[] | null>(null);
    // Per-search-term cache: lowercase term → filtered branches[]
    const searchCacheRef = useRef<Map<string, string[]>>(new Map());
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasFetchedRef = useRef(false);
    // Track the repo we've fetched for, to reset on change
    const currentRepoRef = useRef(repoName);

    // ── Reset when repoName changes ──────────────────────────────────────────
    useEffect(() => {
        if (currentRepoRef.current === repoName) return;
        currentRepoRef.current = repoName;
        fullCacheRef.current = null;
        searchCacheRef.current.clear();
        hasFetchedRef.current = false;
        setSearchInput("");
        setDisplayedBranches([]);
        setHasNextPage(false);
        setCurrentOffset(0);
    }, [repoName]);

    // ── Core search logic ────────────────────────────────────────────────────
    const applySearch = useCallback(async (query: string, repo: string) => {
        const normalized = query.toLowerCase().trim();

        // Below min chars: revert to full list
        if (normalized.length < MIN_SEARCH_CHARS) {
            if (fullCacheRef.current) setDisplayedBranches(fullCacheRef.current);
            setHasNextPage(false);
            return;
        }

        // 1. Check per-term cache
        if (searchCacheRef.current.has(normalized)) {
            setDisplayedBranches(searchCacheRef.current.get(normalized)!);
            setHasNextPage(false);
            return;
        }

        // 2. Client-side filter from full list
        if (fullCacheRef.current) {
            const filtered = fullCacheRef.current.filter((b) =>
                b.toLowerCase().includes(normalized)
            );
            searchCacheRef.current.set(normalized, filtered);
            setDisplayedBranches(filtered);
            setHasNextPage(false);
            return;
        }

        // 3. Server-side search with pagination
        setIsSearching(true);
        try {
            const result = await BranchAndRepositoryService.searchBranches(repo, {
                search: query,
                limit: PAGE_SIZE,
                offset: 0,
            });
            const branches = result.branches ?? [];
            searchCacheRef.current.set(normalized, branches);
            setDisplayedBranches(branches);
            setHasNextPage(result.has_next_page ?? false);
            setCurrentOffset(PAGE_SIZE);
        } catch {
            // Keep whatever is currently shown on error
        } finally {
            setIsSearching(false);
        }
    }, []);

    // ── Debounced input handler ───────────────────────────────────────────────
    const handleSearchChange = useCallback(
        (value: string) => {
            setSearchInput(value);
            if (debounceRef.current) clearTimeout(debounceRef.current);

            // Immediately revert to full list when query drops below threshold
            if (!value || value.trim().length < MIN_SEARCH_CHARS) {
                if (fullCacheRef.current) setDisplayedBranches(fullCacheRef.current);
                setHasNextPage(false);
                return;
            }

            debounceRef.current = setTimeout(
                () => applySearch(value, currentRepoRef.current),
                DEBOUNCE_MS
            );
        },
        [applySearch]
    );

    // ── Initial load (once per repo, when enabled flips true) ────────────────
    useEffect(() => {
        if (!enabled || !repoName || hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        const cached = storageGet(branchCacheKey(repoName));
        if (cached) {
            fullCacheRef.current = cached;
            setDisplayedBranches(cached);
            return;
        }

        setIsLoading(true);
        BranchAndRepositoryService.getBranchList(repoName)
            .then((data: any) => {
                // Service returns string[] directly
                const branches: string[] = Array.isArray(data) ? data : (data?.branches ?? []);
                fullCacheRef.current = branches;
                setDisplayedBranches(branches);
                storageSet(branchCacheKey(repoName), branches, BRANCH_CACHE_TTL);
            })
            .catch(() => {
                fullCacheRef.current = [];
                setDisplayedBranches([]);
            })
            .finally(() => setIsLoading(false));
    }, [enabled, repoName]);

    // ── Load more (pagination for server-side search results) ────────────────
    const loadMore = useCallback(() => {
        if (!hasNextPage || !searchInput || isSearching) return;
        const normalized = searchInput.toLowerCase().trim();

        setIsSearching(true);
        BranchAndRepositoryService.searchBranches(currentRepoRef.current, {
            search: searchInput,
            limit: PAGE_SIZE,
            offset: currentOffset,
        })
            .then((result) => {
                const newBranches = result.branches ?? [];
                const combined = [...(searchCacheRef.current.get(normalized) ?? []), ...newBranches];
                searchCacheRef.current.set(normalized, combined);
                setDisplayedBranches(combined);
                setHasNextPage(result.has_next_page ?? false);
                setCurrentOffset((prev) => prev + PAGE_SIZE);
            })
            .finally(() => setIsSearching(false));
    }, [hasNextPage, searchInput, isSearching, currentOffset]);

    // ── Manual refresh ────────────────────────────────────────────────────────
    const refresh = useCallback(() => {
        if (!repoName) return;
        const key = branchCacheKey(repoName);
        if (typeof window !== "undefined") localStorage.removeItem(key);
        fullCacheRef.current = null;
        searchCacheRef.current.clear();
        hasFetchedRef.current = false;
        setSearchInput("");
        setDisplayedBranches([]);
        setHasNextPage(false);
        setCurrentOffset(0);
        setIsLoading(true);

        BranchAndRepositoryService.getBranchList(repoName)
            .then((data: any) => {
                const branches: string[] = Array.isArray(data) ? data : (data?.branches ?? []);
                fullCacheRef.current = branches;
                setDisplayedBranches(branches);
                storageSet(key, branches, BRANCH_CACHE_TTL);
            })
            .catch(() => {
                fullCacheRef.current = [];
                setDisplayedBranches([]);
            })
            .finally(() => setIsLoading(false));
    }, [repoName]);

    // ── Cleanup ───────────────────────────────────────────────────────────────
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
