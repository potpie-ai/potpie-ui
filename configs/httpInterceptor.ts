import axios, { InternalAxiosRequestConfig } from 'axios';
import { auth } from "@/configs/Firebase-config";
import { useRouter } from 'next/navigation';
import { toast } from "sonner";

/*
 This implementation extends the axios definition to intercept any api call and set certain header,
 extend this later to modify any outgoing or incoming request body, headers, response 
*/

// Please remove all the comments after you are done
const SetAuthorizationHeader = async () => {
  // https://github.com/axios/axios#global-axios-defaults
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

axios.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  SetAuthorizationHeader();
  // https://stackoverflow.com/questions/43051291/attach-authorization-header-for-all-axios-requests
  // const user = auth.currentUser;
  // const idToken = await user?.getIdToken();
  // config.headers.Authorization =  `Bearer ${idToken}`;
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