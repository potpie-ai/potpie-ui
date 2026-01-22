import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { ParsingStatusEnum } from "@/lib/Constants";

// Define a type for the headers
type Headers = {
    Authorization?: string;
    [key: string]: string | undefined;
};

export default class BranchAndRepositoryService {

    static async parseRepo(repo_name: string, branch_name: string, filters?: any) {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        try {
            const parseResponse = await axios.post(
                `${baseUrl}/api/v1/parse`,
                { repo_name, branch_name, filters },
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

    static async getUserRepositories(limit?: number, offset: number = 0) {
      const headers: Headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

      console.log("BranchAndRepositoryService: Getting user repositories");
      console.log(`BranchAndRepositoryService: Base URL: ${baseUrl}`);
      
      console.log(`BranchAndRepositoryService: Headers: ${JSON.stringify({
          ...headers,
          Authorization: headers.Authorization ? `${headers.Authorization.substring(0, 15)}...` : 'Not set'
      })}`);

      try {
          const params: any = {};
          if (limit !== undefined) {
              params.limit = limit;
          }
          if (offset > 0) {
              params.offset = offset;
          }
          
          const response = await axios.get(`${baseUrl}/api/v1/github/user-repos`, {
              headers,
              params,
          });
          console.log("BranchAndRepositoryService: Successfully fetched user repositories");
          
          // Handle different response formats
          const data = response.data;
          
          // If response is an array (old format), wrap it
          if (Array.isArray(data)) {
              return {
                  repositories: data,
                  has_next_page: data.length === 20, // Assume more if we got exactly 20
                  total_count: undefined
              };
          }
          
          // If response has repositories property
          if (data.repositories) {
              return {
                  repositories: data.repositories,
                  has_next_page: data.has_next_page !== undefined ? data.has_next_page : (data.repositories.length === 20),
                  total_count: data.total_count
              };
          }
          
          // Fallback: treat entire response as repositories array
          return {
              repositories: data,
              has_next_page: false,
              total_count: undefined
          };
      } catch (error) {
          console.error("BranchAndRepositoryService: Error fetching user repositories:", error);
          if (axios.isAxiosError(error)) {
              console.error(`BranchAndRepositoryService: Status: ${error.response?.status}, Message: ${error.message}`);
              console.error(`BranchAndRepositoryService: Response data:`, error.response?.data);
          }
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

  static async getBranchList(
    repoName: string,
    limit?: number,
    offset: number = 0,
    search?: string,
    afterCursor?: string
  ): Promise<{
        branches: string[];
        has_next_page?: boolean;
        end_cursor?: string;
        total_count?: number;
    }> {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        try {
          console.log(`Fetching branches for repo: ${repoName}, limit: ${limit}, offset: ${offset}, search: ${search}, afterCursor: ${afterCursor}`);
            
            if (!repoName) {
                console.error("No repository name provided");
                return { branches: [] };
            }

            const params: any = {
                repo_name: repoName,
            };
          
            if (limit !== undefined) {
                params.limit = limit;
            }
            if (offset > 0) {
                params.offset = offset;
            }
            if (search !== undefined && search !== null && search !== "") {
                params.search = search;
            }
            if (afterCursor !== undefined && afterCursor !== null && afterCursor !== "") {
                params.after_cursor = afterCursor;
            }
            
            const response = await axios.get(
                `${baseUrl}/api/v1/github/get-branch-list`,
                {
                    params,
                    headers,
                }
            );
            
            console.log("Branch API raw response status:", response.status);
            
            // Handle GraphQL response format: { branches: string[], has_next_page: boolean, end_cursor: string, total_count: number }
            // Or REST response format: { branches: string[] }
            if (response.data) {
              if (Array.isArray(response.data.branches)) {
                  console.log(`Found ${response.data.branches.length} branches in response`);
                  return {
                      branches: response.data.branches,
                      has_next_page: response.data.has_next_page,
                      end_cursor: response.data.end_cursor,
                      total_count: response.data.total_count,
                  };
              } else if (Array.isArray(response.data)) {
                  console.log(`Found ${response.data.length} branches in direct response array`);
                  return { branches: response.data };
              }
          }
          
          console.log("No branches array found in response, returning empty array");
          return { branches: [] };
        } catch (error) {
            console.error("Error fetching branch list:", error);
            // Return empty array instead of throwing to avoid crashing the UI
            return { branches: [] };
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

    static async checkParsingStatus(repoName: string, branchName: string, filters?: any) {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

      try {
        const response = await axios.post(
          `${baseUrl}/api/v1/check-status`,
          { repo_name: repoName, branch_name: branchName, filters },
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
