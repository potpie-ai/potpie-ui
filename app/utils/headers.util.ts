import { auth } from "@/configs/Firebase-config";
import { isFirebaseEnabled } from "@/lib/utils";

const getHeaders = async (existingHeaders = {}) => {
    try {
        const user = auth.currentUser;
        
        // If Firebase is disabled, use a mock token in local development
        if (!isFirebaseEnabled() && user) {
            return {
                ...existingHeaders,
                Authorization: `Bearer mock-token-for-local-development`
            };
        }
        
        // Normal flow with Firebase
        const idToken = await user?.getIdToken();
        if (user) {
            return {
                ...existingHeaders,
                Authorization: `Bearer ${idToken}`
            };
        }
    } catch (error) {
        console.error('Error fetching token:', error);
    }
    
    // Return existing headers if we couldn't add authorization
    return existingHeaders;
};

export default getHeaders;
