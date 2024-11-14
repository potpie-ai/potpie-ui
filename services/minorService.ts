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
}
