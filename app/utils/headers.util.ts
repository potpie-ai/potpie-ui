import { auth } from "@/configs/Firebase-config";
import { isFirebaseEnabled } from "@/lib/utils";

// Define a type for the headers
type Headers = {
    Authorization?: string;
    [key: string]: string | undefined;
};

const getHeaders = async (existingHeaders: Headers = {}): Promise<Headers> => {
    try {
        // Direct check for Firebase environment variables
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
        
        // Log environment variable presence without exposing values
        console.log(`getHeaders: Firebase config check:`);
        console.log(`- API Key exists: ${!!apiKey}`);
        console.log(`- Auth Domain exists: ${!!authDomain}`);
        console.log(`- Project ID exists: ${!!projectId}`);
        console.log(`- App ID exists: ${!!appId}`);
        
        // Check if all required Firebase variables exist
        const firebaseConfigExists = !!(apiKey && authDomain && projectId && appId);
        
        // Also check via the helper function
        const isFirebaseActive = isFirebaseEnabled();
        
        // Final determination of Firebase status - use the improved isFirebaseEnabled function
        const firebaseEnabled = isFirebaseActive;
        console.log(`getHeaders: Firebase enabled: ${firebaseEnabled}`);
        
        const user = auth.currentUser;
        if (!user) {
            console.log('getHeaders: No current user found');
            return existingHeaders;
        }
        
        try {
            // Check if we're using mock Firebase (set in Firebase-config.ts)
            const usingMockFirebase = typeof window !== 'undefined' && (window as any).__usingMockFirebase === true;
            
            // Only proceed with token if Firebase is enabled AND we're not using mock Firebase
            if (firebaseEnabled && !usingMockFirebase) {
                // Get the token from the user object
                const idToken = await user.getIdToken(true);
                console.log(`getHeaders: Got token from user: ${idToken.substring(0, 5)}...`);
                
                // Check if this is a mock user by examining the token directly
                const isMockToken = idToken === 'mock-token-for-local-development' || 
                                   idToken === 'mock-id-token';
                
                // Also check the user ID as a backup detection mechanism
                const isMockUser = user.uid === 'local-dev-user';
                
                console.log(`getHeaders: Using ${isMockUser ? 'MOCK' : 'REAL'} user`);
                console.log(`getHeaders: Token is ${isMockToken ? 'MOCK' : 'REAL'}`);
                
                // Only add the Authorization header if we have a real token
                if (!isMockToken) {
                    console.log(`getHeaders: Using real Firebase token`);
                    return {
                        ...existingHeaders,
                        Authorization: `Bearer ${idToken}`
                    };
                }
            }
            
            // If we get here, either Firebase is not enabled, we're using mock Firebase,
            // or we have a mock token. In all these cases, skip adding the Authorization header.
            console.log(`getHeaders: Skipping Authorization header in development environment`);
            return existingHeaders;
            
        } catch (tokenError) {
            console.error('getHeaders: Error getting Firebase token:', tokenError);
            // Skip adding Authorization header in case of error
            console.log('getHeaders: Skipping Authorization header due to error');
            return existingHeaders;
        }
    } catch (error) {
        console.error('getHeaders: Error processing headers:', error);
        return existingHeaders;
    }
};

export default getHeaders;
