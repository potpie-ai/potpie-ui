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
        maxRetries = 12
      ) {
        let retries = 0;
        let parsingStatus = initialStatus;
    
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
    
        while (parsingStatus !== "ready" && retries < maxRetries) {
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
    
          retries += 1;
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    
        if (retries >= maxRetries) {
          setParsingStatus("Timeout exceeded, please try again.");
        }
      }
}
