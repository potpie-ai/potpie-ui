import { useState, useEffect, useRef, useCallback } from "react";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";

const REPO_CACHE_KEY = "user_repositories";
const REPO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MIN_SEARCH_CHARS = 2;
const DEBOUNCE_MS = 300;

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

export interface UseRepoSearchOptions {
    /** Set to true (or a reactive boolean like `popoverOpen`) to trigger the initial fetch. */
    enabled?: boolean;
}

export interface UseRepoSearchResult {
    /** Filtered repos to display — already reflects the current search query. */
    displayedRepos: any[];
    /** True while the initial full repo list is being loaded. */
    isLoading: boolean;
    /** True while a server-side search request is in-flight. */
    isSearching: boolean;
    /** Current value of the search input — bind to <CommandInput value={...}> */
    searchInput: string;
    /** Call this from onValueChange of <CommandInput> */
    handleSearchChange: (value: string) => void;
    /** Clears all caches and re-fetches the full list. */
    refresh: () => void;
}

/**
 * Hybrid repo search hook.
 *
 * Search flow (fires after 2 chars, 300 ms debounce):
 *   1. Filter client-side from the in-memory full-list cache.
 *   2. If full list isn't cached yet → server-side search, cache result keyed by term.
 *
 * Caching layers:
 *   • localStorage – full list, 5-min TTL (survives page navigations in same tab)
 *   • In-memory ref – full list for instant access (session lifetime)
 *   • In-memory Map – per-search-term results (session lifetime)
 */
export function useRepoSearch({ enabled = true }: UseRepoSearchOptions = {}): UseRepoSearchResult {
    const [searchInput, setSearchInput] = useState("");
    const [displayedRepos, setDisplayedRepos] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Full unfiltered repo list cached in-memory for the session
    const fullCacheRef = useRef<any[] | null>(null);
    // Per-search-term cache: lowercase term → filtered repos[]
    const searchCacheRef = useRef<Map<string, any[]>>(new Map());
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasFetchedRef = useRef(false);

    // ── Core search logic ────────────────────────────────────────────────────
    const applySearch = useCallback(async (query: string) => {
        const normalized = query.toLowerCase().trim();

        // Below min chars: revert to full list
        if (normalized.length < MIN_SEARCH_CHARS) {
            if (fullCacheRef.current) setDisplayedRepos(fullCacheRef.current);
            return;
        }

        // 1. Check per-term cache (previously searched this session or served from client filter)
        if (searchCacheRef.current.has(normalized)) {
            setDisplayedRepos(searchCacheRef.current.get(normalized)!);
            return;
        }

        // 2. Client-side filter — available when full list is already in memory
        if (fullCacheRef.current) {
            const filtered = fullCacheRef.current.filter((repo: any) => {
                const full = (repo.full_name ?? "").toLowerCase();
                const name = (repo.name ?? "").toLowerCase();
                return full.includes(normalized) || name.includes(normalized);
            });
            // Cache this filtered result so typing the same term again is instant
            searchCacheRef.current.set(normalized, filtered);
            setDisplayedRepos(filtered);
            return;
        }

        // 3. Cache miss — server-side search (full list hasn't loaded yet)
        setIsSearching(true);
        try {
            const results = await BranchAndRepositoryService.getUserRepositories(query);
            searchCacheRef.current.set(normalized, results ?? []);
            setDisplayedRepos(results ?? []);
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
                if (fullCacheRef.current) setDisplayedRepos(fullCacheRef.current);
                return;
            }

            debounceRef.current = setTimeout(() => applySearch(value), DEBOUNCE_MS);
        },
        [applySearch]
    );

    // ── Initial load (once per enabled=true) ─────────────────────────────────
    useEffect(() => {
        if (!enabled || hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        const cached = storageGet(REPO_CACHE_KEY);
        if (cached) {
            fullCacheRef.current = cached;
            setDisplayedRepos(cached);
            return;
        }

        setIsLoading(true);
        BranchAndRepositoryService.getUserRepositories()
            .then((repos) => {
                const list = repos ?? [];
                fullCacheRef.current = list;
                setDisplayedRepos(list);
                storageSet(REPO_CACHE_KEY, list, REPO_CACHE_TTL);
            })
            .catch(() => {
                fullCacheRef.current = [];
                setDisplayedRepos([]);
            })
            .finally(() => setIsLoading(false));
    }, [enabled]);

    // ── Manual refresh ────────────────────────────────────────────────────────
    const refresh = useCallback(() => {
        if (typeof window !== "undefined") localStorage.removeItem(REPO_CACHE_KEY);
        fullCacheRef.current = null;
        searchCacheRef.current.clear();
        hasFetchedRef.current = false;
        setSearchInput("");
        setDisplayedRepos([]);
        setIsLoading(true);

        BranchAndRepositoryService.getUserRepositories()
            .then((repos) => {
                const list = repos ?? [];
                fullCacheRef.current = list;
                setDisplayedRepos(list);
                storageSet(REPO_CACHE_KEY, list, REPO_CACHE_TTL);
            })
            .catch(() => {
                fullCacheRef.current = [];
                setDisplayedRepos([]);
            })
            .finally(() => setIsLoading(false));
    }, []);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    return { displayedRepos, isLoading, isSearching, searchInput, handleSearchChange, refresh };
}
