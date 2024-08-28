import axios, { InternalAxiosRequestConfig } from 'axios';
import { auth } from "@/configs/Firebase-config";
import { useRouter } from 'next/navigation';
import { toast } from "sonner";

/*
 This implementation extends the axios definition to intercept any api call and set certain header,
 extend this later to modify any outgoing or incoming request body, headers, response 
*/
const SetAuthorizationHeader = async () => {
  const user = auth.currentUser;
  const idToken = await user?.getIdToken();
  axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;
};

const logout = () => {
  auth.signOut()
    .then(() => {
      toast.success("Logged out successfully!");
    })
    .catch(error => {
      console.error('Error logging out:', error);
    });
};

const HandleResponseError = (error: { response: { status: number; }; }) => {
  const router = useRouter();
  if (error.response && (error.response.status === 401 || error.response.status === 403)) {
    logout();
    router.push("/sign-in");
  }
  return Promise.reject(error);
};

axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  SetAuthorizationHeader();
  config.baseURL=process.env.NEXT_PUBLIC_BASE_URL
  return config;
}, (error) => {
  return Promise.reject(error);
});

axios.interceptors.response.use(
  (response) => response,
  (error) => HandleResponseError(error)
);

export default axios;