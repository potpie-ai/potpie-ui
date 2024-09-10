"use client";

import getHeaders from "@/app/utils/headers.util";
import axios from "axios";

export const CreateConversation = async (
  userId: string,
  projectId: string,
  agentId: string,
  title: string
) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const headers = await getHeaders()
  const response = axios
    .post("/conversations/", {
      user_id: userId,
      title: title,
      status: "active",
      project_ids: [projectId],
      agent_ids: [agentId],
    }, {headers:headers})
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.log(err);
      return "Unable to create conversation" + err;
    });

  return response;
};
