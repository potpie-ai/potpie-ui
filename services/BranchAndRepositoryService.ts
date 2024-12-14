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
            const response = await axios.get(
                `${baseUrl}/api/v1/github/get-branch-list`,
                {
                    params: {
                        repo_name: repoName,
                    },
                    headers,
                }
            );
            return response.data.branches;
        } catch (error) {
            throw new Error("Error fetching branch list");
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
        let maxDelay = 60000; // Max delay of 1 minute
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
          const jitter = Math.random() * 1000;
          const delay = Math.min(baseDelay + jitter, maxDelay);
          await new Promise((resolve) => setTimeout(resolve, delay));
          baseDelay = Math.min(baseDelay * 2, maxDelay);
        }
    
        if (Date.now() - startTime >= maxDuration) {
          setParsingStatus(ParsingStatusEnum.ERROR);
        }
      }
}
