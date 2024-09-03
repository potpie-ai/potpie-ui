"use client";
import axios from "@/configs/httpInterceptor";

export const CreateConversation = (
  userId: string,
  projectId: string,
  agentId: string,
  title: string
) => {
  const response = axios
    .post("/conversations/", {
      user_id: userId,
      title: title,
      status: "active",
      project_ids: [projectId],
      agent_ids: [agentId],
    })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.log(err);
      return "Unable to create conversation" + err;
    });

  return response;
};
