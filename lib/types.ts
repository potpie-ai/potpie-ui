type ChildrenNode = {
  function: string;
  params: string[];
  response_object: string;
  dependent_libs: string[];
  children?: ChildrenNode[];
};

type GraphNode = {
  function: string;
  params: string[];
  response_object: string;
  dependent_libs: string[];
  children?: ChildrenNode[];
};

type MockGraphData = {
  nodes: GraphNode[];
};

type Dependency = {
  name: string;
  version: string;
  description: string;
};
type FlowWithDependencies = {
  name: string;
  dependencies: Dependency[];
};

type ConfigurationType = {
  flow: string;
  mock: boolean;
  username: string;
  password: string;
  dependency: string;
};

type UserRepo = {
  project_id: number;
  branch_name: string;
  repo_name: string;
  last_updated_at: Date;
  is_default: boolean;
  project_status: string;
};

type AllBranches = {
  branches: string[];
};

type AgentType = {
  id: string;
  name: string;
  description: string;
};


interface TaskType {
  description: string;
  tools: string[];
  expected_output: string;
  id: number;
}

interface CustomAgentType {
  role: string;
  goal: string;
  backstory: string;
  system_prompt: string;
  id: string;
  user_id: string;
  tasks: TaskType[];
  deployment_url: string | null;
  created_at: string; // ISO date string format
  updated_at: string; // ISO date string format
}
