import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

export interface CreditBalanceResponse {
  user_id: string;
  plan_type: "free" | "pro";
  credits_total: number;
  credits_used: number;
  credits_available: number;
  dodo_customer_id: string | null;
}

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

  static async cancelUserSubscription (userId: string) {
    const baseUrl = process.env.NEXT_PUBLIC_SUBSCRIPTION_BASE_URL;
    const response = await axios.post(
      `${baseUrl}/cancel-subscription?user_id=${userId}`
    );
    return response.data;
  };

  static async getCustomerPortal (userId: string) {
    const baseUrl = process.env.NEXT_PUBLIC_SUBSCRIPTION_BASE_URL;
    const response = await axios.get(
      `${baseUrl}/dodo/customer-portal?user_id=${userId}`
    );
    return response.data;
  };

  static async createCheckoutSession (userId: string, planType: string) {
    const baseUrl = process.env.NEXT_PUBLIC_SUBSCRIPTION_BASE_URL;
    const response = await axios.get(
      `${baseUrl}/dodo/create-checkout-session?user_id=${userId}&plan_type=${planType}`
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

  /**
   * Fetch real-time credit balance from Dodo
   * Returns credits used, available, and total from Dodo (includes messages + recipes)
   */
  static async fetchCreditBalance(userId: string): Promise<CreditBalanceResponse | null> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<CreditBalanceResponse>(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/usage/credit-balance`,
        {
          headers,
          params: { user_id: userId },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching credit balance:", error);
      // Return default free plan values on error
      return {
        user_id: userId,
        plan_type: "free",
        credits_total: 50,
        credits_used: 0,
        credits_available: 50,
        dodo_customer_id: null,
      };
    }
  }
}
