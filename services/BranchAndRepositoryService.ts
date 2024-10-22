import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

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

    static async pollParsingStatus(
        projectId: string,
        initialStatus: string,
        setParsingStatus: (status: string) => void,
        setChatStep?: (step: number) => void,
        maxDuration = 30 * 60 * 1000 // 30 minutes in milliseconds
      ) {
        let parsingStatus = initialStatus;
        let baseDelay = 5000; // Start with 5 seconds
        let maxDelay = 60000; // Max delay of 1 minute
        const startTime = Date.now();
    
        const getStatusMessage = (status: string) => {
          switch (status) {
            case "submitted":
              return "Cloning your repository";
            case "cloned":
              return "Parsing your code";
            case "parsed":
              return "Understanding your codebase";
            case "error":
              return "Error";
            default:
              return status;
          }
        };
    
        while (parsingStatus !== "ready" && Date.now() - startTime < maxDuration) {
          parsingStatus = await BranchAndRepositoryService.getParsingStatus(projectId);
          setParsingStatus(getStatusMessage(parsingStatus));
    
          if (parsingStatus === "ready") {
            if (setChatStep) {
              setChatStep(2); 
            }
            setParsingStatus("Ready");
            return;
          }
    
          if (parsingStatus === "error") {
            setParsingStatus("Error");
            return;
          }
    
          // Exponential backoff with jitter
          const jitter = Math.random() * 1000;
          const delay = Math.min(baseDelay + jitter, maxDelay);
          await new Promise((resolve) => setTimeout(resolve, delay));
          baseDelay = Math.min(baseDelay * 2, maxDelay);
        }
    
        if (Date.now() - startTime >= maxDuration) {
          setParsingStatus("Error");
        }
      }
}
