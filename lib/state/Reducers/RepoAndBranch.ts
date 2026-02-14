import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type TaskRepoBranch = {
  repoName: string;
  branchName: string;
  projectId?: string;
};

type RepoAndBranchState = {
  repoName: string;
  branchName: string;
  commitId: string;
  byTaskId: Record<string, TaskRepoBranch>;
};

const initialState: RepoAndBranchState = {
  repoName: "",
  branchName: "",
  commitId: "",
  byTaskId: {},
};

const RepoAndBranchSlice = createSlice({
  name: "repoAndBranch",
  initialState,
  reducers: {
    setRepoName: (state, action: PayloadAction<string>) => {
      state.repoName = action.payload;
      state.branchName = "";
      state.commitId = "";
    },
    setBranchName: (state, action: PayloadAction<string>) => {
      state.branchName = action.payload;
      state.commitId = ""; // Clear commitId when branch is set
    },
    setCommitId: (state, action: PayloadAction<string>) => {
      state.commitId = action.payload;
      state.branchName = ""; // Clear branchName when commitId is set
    },
    setRepoAndBranchForTask: (
      state,
      action: PayloadAction<{
        taskId: string;
        repoName: string;
        branchName: string;
        projectId?: string;
      }>,
    ) => {
      const { taskId, repoName, branchName, projectId } = action.payload;
      // Ensure byTaskId is initialized (handles cases where persisted state might be missing it)
      if (!state.byTaskId) {
        state.byTaskId = {};
      }
      state.byTaskId[taskId] = {
        repoName,
        branchName,
        projectId,
      };
      state.repoName = repoName;
      state.branchName = branchName;
      state.commitId = ""; // Clear commitId to maintain branch/commit mutual exclusivity
    },
    clearRepoAndBranchForTask: (state, action: PayloadAction<string>) => {
      if (state.byTaskId) {
        delete state.byTaskId[action.payload];
      }
    },
  },
});

export default RepoAndBranchSlice.reducer;
export const {
  setRepoName,
  setBranchName,
  setCommitId,
  setRepoAndBranchForTask,
  clearRepoAndBranchForTask,
} = RepoAndBranchSlice.actions;
