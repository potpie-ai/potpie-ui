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