
import axios from "axios";

export const axiosSecure = axios.create({
  baseURL: "/api",
});

const useAxiosSecure = () => {
  return axiosSecure;
};

export default useAxiosSecure;
