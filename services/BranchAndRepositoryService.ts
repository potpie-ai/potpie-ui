import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { ParsingStatusEnum } from "@/lib/Constants";

export default class BranchAndRepositoryService {

    static async parseRepo(repo_name: string, branch_name: string) {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        try {
            const parseResponse = await axios.post(
                `${baseUrl}/api/v1/parse`,
                { repo_name, branch_name },
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

    static async getUserRepositories() {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        try {
            const response = await axios.get(`${baseUrl}/api/v1/github/user-repos`, {
                headers,
            });
            return response.data.repositories;
        } catch (error) {
            throw new Error("Error fetching user repositories");
        }
    }

    static async getBranchList(repoName: string) {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        try {
            console.log(`Fetching branches for repo: ${repoName}`);
            
            if (!repoName) {
                console.error("No repository name provided");
                return [];
            }
            
            const response = await axios.get(
                `${baseUrl}/api/v1/github/get-branch-list`,
                {
                    params: {
                        repo_name: repoName,
                    },
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
      } catch (error) {
        throw new Error("Error fetching Repository");
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
        let baseDelay = 5000; // Start with 5 seconds
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
    
          // Exponential backoff with jitter
          await new Promise((resolve) => setTimeout(resolve, baseDelay));
        }
    
        if (Date.now() - startTime >= maxDuration) {
          setParsingStatus(ParsingStatusEnum.ERROR);
        }
      }
}
