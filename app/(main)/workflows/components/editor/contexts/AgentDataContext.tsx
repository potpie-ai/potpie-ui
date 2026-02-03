import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AgentService from "@/services/AgentService";

interface Agent {
  id: string;
  name: string;
  description: string;
  status?: string;
}

interface AgentDataContextType {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  refreshAgents: () => Promise<void>;
}

const AgentDataContext = createContext<AgentDataContextType | undefined>(
  undefined
);

interface AgentDataProviderProps {
  children: ReactNode;
}

export const AgentDataProvider: React.FC<AgentDataProviderProps> = ({
  children,
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const agentTypes = await AgentService.getAgentTypes();
      const filtered = agentTypes
        .filter((agent: any) => agent.status !== "SYSTEM")
        .map((agent: any) => ({
          id: agent.id,
          name: agent.name,
          description: agent.description,
        }));
      setAgents(filtered);
      console.log(
        `[AgentDataContext] Fetched ${filtered.length} agents successfully`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch agents");
      console.error("[AgentDataContext] Failed to fetch agents:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAgents = async () => {
    await fetchAgents();
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const value: AgentDataContextType = {
    agents,
    loading,
    error,
    refreshAgents,
  };

  return (
    <AgentDataContext.Provider value={value}>
      {children}
    </AgentDataContext.Provider>
  );
};

export const useAgentData = (): AgentDataContextType => {
  const context = useContext(AgentDataContext);
  if (context === undefined) {
    throw new Error("useAgentData must be used within an AgentDataProvider");
  }
  return context;
};
