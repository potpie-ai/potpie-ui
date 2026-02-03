import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    repoName: "",
    branchName: "",
};

const RepoAndBranchSlice = createSlice({
    name: "repoAndBranch",
    initialState,
    reducers: {
        setRepoName: (state, action) => {
            state.repoName = action.payload;
            state.branchName = ""
        },
        setBranchName: (state, action) => {
            state.branchName = action.payload;
        },
    },
});

export default RepoAndBranchSlice.reducer;
export const { setRepoName, setBranchName } = RepoAndBranchSlice.actions;