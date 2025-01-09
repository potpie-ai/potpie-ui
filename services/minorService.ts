import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

export default class MinorService {
  static async getProfilePicture(userId: string) {
    try {
      const headers = await getHeaders();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/user/${userId}/public-profile`,
        {
          headers,
        }
      );
      return response.data.profile_pic_url;
    } catch (error) {
        console.log("Error fetching profile picture:", error);
    }
  }
  static async fetchUserSubscription (userId: string) {
    const baseUrl = process.env.NEXT_PUBLIC_SUBSCRIPTION_BASE_URL;
    const response = await axios.get(
      `${baseUrl}/subscriptions/info?user_id=${userId}`
    );
    return response.data;
  };

  static async fetchUserUsage (start_date: string, end_date: string) {
    try {
      const headers = await getHeaders();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/usage/usage`,
        {
          headers,
          params: {
            start_date,
            end_date,  
          }
        }
      );
      return response.data.total_human_messages;
    } catch (error) {
        console.log("Error fetching profile picture:", error);
    }
  };
}
