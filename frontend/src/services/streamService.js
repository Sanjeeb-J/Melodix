import { getApiUrl } from "./api";

export const getStreamUrl = (videoId) => {
  const token = localStorage.getItem("token");
  return `${getApiUrl(`/api/stream/${videoId}`)}?token=${encodeURIComponent(token || "")}`;
};
