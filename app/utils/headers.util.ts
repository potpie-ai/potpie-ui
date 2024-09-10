import { auth } from "@/configs/Firebase-config";

const getHeaders = async (existingHeaders = {}) => {
    try {
        const user = auth.currentUser;
        const idToken = await user?.getIdToken();
        if (user) {
            return {
                ...existingHeaders,
                Authorization: `Bearer ${idToken}`,
            };
        }
    } catch (error) {
        console.error('Error fetching token:', error);
    }
};

export default getHeaders;
