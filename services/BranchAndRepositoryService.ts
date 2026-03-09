import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { ParsingStatusEnum } from "@/lib/Constants";

// Define a type for the headers
type Headers = {
    Authorization?: string;
    [key: string]: string | undefined;
};

export default class BranchAndRepositoryService {

    static async parseRepo(repo_name: string, branch_name?: string, filters?: any, commit_id?: string) {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        try {
            const payload: any = { repo_name };
            if (commit_id) {
                payload.commit_id = commit_id;
            } else if (branch_name) {
                payload.branch_name = branch_name;
            }
            if (filters) {
                payload.filters = filters;
            }
            
            const parseResponse = await axios.post(
                `${baseUrl}/api/v1/parse`,
                payload,
                { headers }
            );
            return parseResponse.data;
        } catch (error) {
            throw new Error("Error parsing repository");
        }
    }

    static async getParsingStatus(projectId: string) {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        try {
            const statusResponse = await axios.get(
                `${baseUrl}/api/v1/parsing-status/${projectId}`,
                { headers }
            );
            return statusResponse.data.status;
        } catch (error) {
            throw new Error("Error fetching parsing status");
        }
    }

    static async getUserRepositories(search?: string) {
        const headers: Headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        console.log("BranchAndRepositoryService: Getting user repositories");
        console.log(`BranchAndRepositoryService: Base URL: ${baseUrl}`);
        
        console.log(`BranchAndRepositoryService: Headers: ${JSON.stringify({
            ...headers,
            Authorization: headers.Authorization ? `${headers.Authorization.substring(0, 15)}...` : 'Not set'
        })}`);

        try {
            const params: { search?: string } = {};
            // Only add search parameter if it's a non-empty string after trimming
            let trimmedSearch = search?.trim();
            if (trimmedSearch && trimmedSearch.length > 0) {
                // Max length validation to prevent extremely long queries
                if (trimmedSearch.length > 200) {
                    console.warn("Search query is too long. Truncating to 200 characters.");
                    trimmedSearch = trimmedSearch.slice(0, 200);
                }
                params.search = trimmedSearch;
            }
            
            const response = await axios.get(`${baseUrl}/api/v1/github/user-repos`, {
                headers,
                params,
            });
            console.log("BranchAndRepositoryService: Successfully fetched user repositories");
            return response.data.repositories;
        } catch (error) {
            console.error("BranchAndRepositoryService: Error fetching user repositories:", error);
            if (axios.isAxiosError(error)) {
                console.error(`BranchAndRepositoryService: Status: ${error.response?.status}, Message: ${error.message}`);
                console.error(`BranchAndRepositoryService: Response data:`, error.response?.data);
            }
            throw new Error("Error fetching user repositories");
        }
    }

    /**
     * Paginated user repo search. Same endpoint as getUserRepositories but with limit/offset.
     * Returns repositories and has_next_page for "Load more" support.
     */
    static async searchUserRepositories(
        options: { search?: string; limit?: number; offset?: number } = {}
    ): Promise<{ repositories: any[]; has_next_page: boolean }> {
        const headers: Headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        const params: Record<string, string | number> = {};
        if (options.search) {
            const trimmed = options.search.trim().slice(0, 200);
            if (trimmed) params.search = trimmed;
        }
        if (options.limit != null) params.limit = options.limit;
        if (options.offset != null) params.offset = options.offset;

        try {
            const response = await axios.get(`${baseUrl}/api/v1/github/user-repos`, {
                headers,
                params,
            });
            const data = response.data;
            const repos = Array.isArray(data?.repositories) ? data.repositories : [];
            const hasNextPage = data?.has_next_page ?? false;
            return { repositories: repos, has_next_page: hasNextPage };
        } catch (error) {
            console.error("Error searching user repositories:", error);
            throw new Error("Error fetching user repositories");
        }
    }

    static async getUserProjects() {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

      try {
          const statusResponse = await axios.get(
              `${baseUrl}/api/v1/projects/list`,
              { headers }
          );
          return statusResponse.data;
      } catch (error) {
          throw new Error("Error fetching projects");
      }
  }

    static async getBranchList(repoName: string, search?: string) {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        try {
            console.log(`Fetching branches for repo: ${repoName}`);
            
            if (!repoName) {
                console.error("No repository name provided");
                return [];
            }
            
            const params: { repo_name: string; search?: string } = {
                repo_name: repoName,
            };
            // Only add search parameter if it's a non-empty string after trimming
            const trimmedSearch = search?.trim();
            if (trimmedSearch && trimmedSearch.length > 0) {
                // Max length validation to prevent extremely long queries
                if (trimmedSearch.length > 200) {
                    console.warn("Search query is too long. Truncating to 200 characters.");
                    params.search = trimmedSearch.substring(0, 200);
                } else {
                    params.search = trimmedSearch;
                }
            }
            
            const response = await axios.get(
                `${baseUrl}/api/v1/github/get-branch-list`,
                {
                    params,
                    headers,
                }
            );
            
            console.log("Branch API raw response status:", response.status);
            
            // The response format is { branches: string[] }
            if (response.data && Array.isArray(response.data.branches)) {
                console.log(`Found ${response.data.branches.length} branches in response`);
                return response.data.branches;
            } else if (Array.isArray(response.data)) {
                console.log(`Found ${response.data.length} branches in direct response array`);
                return response.data;
            } else {
                console.log("No branches array found in response, returning empty array");
                console.log("Response data type:", typeof response.data);
                return [];
            }
        } catch (error) {
            console.error("Error fetching branch list:", error);
            // Return empty array instead of throwing to avoid crashing the UI
            return [];
        }
    }

    /**
     * Paginated branch search for a repo. Same endpoint as getBranchList but with limit/offset.
     * Returns branches and has_next_page for "Load more" support.
     */
    static async searchBranches(
        repoName: string,
        options: { search?: string; limit?: number; offset?: number } = {}
    ): Promise<{ branches: string[]; has_next_page: boolean; total_count?: number }> {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        const params: Record<string, string | number> = { repo_name: repoName };
        if (options.search) {
            const trimmed = options.search.trim().slice(0, 200);
            if (trimmed) params.search = trimmed;
        }
        if (options.limit != null) params.limit = options.limit;
        if (options.offset != null) params.offset = options.offset;

        try {
            const response = await axios.get(
                `${baseUrl}/api/v1/github/get-branch-list`,
                { params, headers }
            );
            const data = response.data;
            if (Array.isArray(data?.branches)) {
                return {
                    branches: data.branches,
                    has_next_page: data.has_next_page ?? false,
                    total_count: data.total_count,
                };
            }
            return { branches: Array.isArray(data) ? data : [], has_next_page: false };
        } catch (error) {
            console.error("Error searching branches:", error);
            return { branches: [], has_next_page: false };
        }
    }

    static async getRepoStructure(repoName: string, branchName: string) {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        try {
            const response = await axios.get(
                `${baseUrl}/api/v1/github/repo-structure`,
                {
                    params: {
                        repo_name: repoName,
                        branch_name: branchName,
                    },
                    headers,
                }
            );
            return response.data;
        } catch (error) {
            console.error("Error fetching repo structure:", error);
            return [];
        }
    }

    static async check_public_repo(repoName: string) {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

      try {
        const response = await axios.get(
          `${baseUrl}/api/v1/github/check-public-repo`,
          {
            params: {
              repo_name: repoName,
            },
            headers,
          }
        );
        return response.data;
      } catch (error: any) {
        // Preserve the original error so the caller can access status code and response data
        if (axios.isAxiosError(error)) {

          throw error;
        }
        throw new Error("Error fetching Repository");
      }
    }

    static async checkParsingStatus(repoName: string, branchName?: string, filters?: any, commitId?: string) {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

      try {
        const payload: any = { repo_name: repoName };
        if (commitId) {
          payload.commit_id = commitId;
        } else if (branchName) {
          payload.branch_name = branchName;
        }
        if (filters) {
          payload.filters = filters;
        }
        
        const response = await axios.post(
          `${baseUrl}/api/v1/check-status`,
          payload,
          { headers }
        );
        return response.data;
      } catch (error) {
        console.error("Error checking parsing status:", error);
        return null;
      }
    }

    static async pollParsingStatus(
        projectId: string,
        initialStatus: string,
        setParsingStatus: (status: string) => void,
        setChatStep?: (step: number) => void,
        maxDuration = 45 * 60 * 1000 // 45 minutes in milliseconds - to align with backend
      ) {
        let parsingStatus = initialStatus;
        const pollInterval = 5000; // Fixed 5-second interval as requested
        const startTime = Date.now();
    
        const getStatusMessage = (status: string) => {
          switch (status) {
            case ParsingStatusEnum.SUBMITTED:
              return "Cloning your repository";
            case ParsingStatusEnum.CLONED:
              return "Parsing your code";
            case ParsingStatusEnum.PARSED:
            case ParsingStatusEnum.INFERRING:
              return "Understanding your codebase";
            case ParsingStatusEnum.ERROR:
              return "Error";
            default:
              return status;
          }
        };
    
        while (parsingStatus !== ParsingStatusEnum.READY && Date.now() - startTime < maxDuration) {
          parsingStatus = await BranchAndRepositoryService.getParsingStatus(projectId);
          setParsingStatus(getStatusMessage(parsingStatus));
    
          if (parsingStatus === ParsingStatusEnum.READY) {
            if (setChatStep) {
              setChatStep(2); 
            }
            setParsingStatus(ParsingStatusEnum.READY);
            return;
          }
    
          if (parsingStatus === ParsingStatusEnum.ERROR) {
            setParsingStatus(ParsingStatusEnum.ERROR);
            return;
          }
    
          // Fixed 5-second interval between polls
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
    
        if (Date.now() - startTime >= maxDuration) {
          setParsingStatus(ParsingStatusEnum.ERROR);
        }
      }
}
